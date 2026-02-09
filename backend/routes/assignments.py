from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse
import database, schemas, crud, pdf_generator
import models
from services import audit, email
import auth
import os

router = APIRouter()

@router.post("/assignments/batch", response_model=List[schemas.Assignment])
def assign_device_batch(batch: schemas.AssignmentBatchCreate, db: Session = Depends(database.get_db)):
    print(f"DEBUG: Received batch assignment request: {batch}")
    try:
        created_assignments = []
        
        # 1. Validate all devices first to ensure atomicity (or close to it)
        for device_id in batch.device_ids:
            # Check availability
            device = db.query(models.Device).filter(models.Device.id == device_id).first()
            if not device:
                print(f"DEBUG: Device {device_id} not found")
                raise HTTPException(status_code=400, detail=f"Device {device_id} not available or not found")
            # Relaxed check: if status is not available but we want to force? No.
            if device.status != models.DeviceStatus.AVAILABLE:
                print(f"DEBUG: Device {device_id} status is {device.status}")
                raise HTTPException(status_code=400, detail=f"Device {device_id} not available")

        # 2. Create Assignments and sync device locations
        for device_id in batch.device_ids:
            assignment_data = schemas.AssignmentCreate(
                device_id=device_id,
                employee_id=batch.employee_id,
                notes=batch.notes
            )
            print(f"DEBUG: Assigning device {device_id} to {batch.employee_id}")
            db_assignment = crud.assign_device(db, assignment_data)
            if db_assignment:
                # Sync device location with employee location
                device = db.query(models.Device).filter(models.Device.id == device_id).first()
                employee = db.query(models.Employee).filter(models.Employee.id == batch.employee_id).first()
                if device and employee and employee.location:
                    old_location = device.location
                    device.location = employee.location
                    print(f"DEBUG: Updated device {device_id} location from '{old_location}' to '{employee.location}'")
                
                created_assignments.append(db_assignment)
            else:
                print(f"DEBUG: crud.assign_device returned None for {device_id}")
        
        if not created_assignments:
             raise HTTPException(status_code=400, detail="No assignments created")

        # 3. Refresh to get data for PDF
        for a in created_assignments:
            db.refresh(a)

        # 4. Generate Single PDF for the batch
        # Using the first assignment to get employee info (same for all)
        employee_name = created_assignments[0].employee.full_name
        print(f"DEBUG: Generating PDF for employee {employee_name}")
        
        # Extract device info list
        devices_info = []
        for a in created_assignments:
            devices_info.append({
                "model": a.device.model,
                "serial": a.device.serial_number,
                "type": a.device.device_type,
                "brand": a.device.brand,
                "hostname": a.device.hostname
            })
        
        # Add charger info if provided (from frontend selection)
        if batch.charger_info:
            devices_info.append({
                "model": batch.charger_info.model,
                "serial": batch.charger_info.serial,
                "type": "charger",
                "brand": batch.charger_info.brand,
                "hostname": "-"
            })
            print(f"DEBUG: Added charger info: {batch.charger_info.brand} {batch.charger_info.model}")

        pdf_path = pdf_generator.generate_batch_acta(
            created_assignments[0].id, 
            employee_name,
            devices_info,
            created_assignments[0].employee.dni,
            created_assignments[0].employee.company
        )
        print(f"DEBUG: PDF generated at {pdf_path}")

        # 5. Update PDF path for all
        for a in created_assignments:
            a.pdf_acta_path = pdf_path
        
        db.commit()
        print("DEBUG: Batch assignment committed successfully")
        
        return created_assignments
    except Exception as e:
        print(f"DEBUG: Exception in batch assignment: {e}")
        import traceback
        traceback.print_exc()
        raise e

@router.post("/assignments/", response_model=schemas.Assignment)
def assign_device(assignment: schemas.AssignmentCreate, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    db_assignment = crud.assign_device(db, assignment)
    if not db_assignment:
        raise HTTPException(status_code=400, detail="Device not available or not found")
    
    # Reload to ensure relationships
    db.refresh(db_assignment)
    
    # Find charger assignment for this employee.
    # 1. Try immediate relationship (might be cached/stale)
    charger_assign = next((a for a in db_assignment.employee.assignments if a.device.device_type == 'charger'), None)
    
    # 2. If not found, query DB explicitly to be safe
    if not charger_assign:
        charger_assign = db.query(models.Assignment).join(models.Device).filter(
            models.Assignment.employee_id == db_assignment.employee_id,
            models.Device.device_type == 'charger',
            models.Assignment.returned_date == None
        ).first()

    charger_brand = charger_assign.device.brand if charger_assign else ""
    charger_model = charger_assign.device.model if charger_assign else ""
    charger_serial = charger_assign.device.serial_number if charger_assign else ""

    pdf_path = pdf_generator.generate_acta(
        db_assignment.id, 
        db_assignment.employee.full_name, 
        db_assignment.device.serial_number,
        db_assignment.device.model,
        db_assignment.device.brand,
        db_assignment.employee.dni if db_assignment.employee.dni else "",
        db_assignment.employee.company if db_assignment.employee.company else "",
        charger_brand,
        charger_model,
        charger_serial
    )
    
    db_assignment.pdf_acta_path = pdf_path
    db.commit()
    
    # Audit Log
    try:
        audit.log_action(db, current_user.id, "ASSIGNMENT_CREATED", f"Device {db_assignment.device.model} assigned to {db_assignment.employee.full_name}")
    except Exception as e:
        print(f"Audit log error: {e}")

    # Email Notification
    if db_assignment.employee.email:
         email.send_assignment_notification(db_assignment.employee.full_name, db_assignment.employee.email, db_assignment.device.model, db_assignment.device.serial_number)

    return db_assignment

@router.post("/return/{device_id}")
def return_device(device_id: int, db: Session = Depends(database.get_db)):
    device = crud.return_device(db, device_id)
    if not device:
        raise HTTPException(status_code=400, detail="Device not assigned or not found")
    return {"status": "returned", "device_serial": device.serial_number}

@router.get("/assignments/{assignment_id}/pdf")
@router.get("/assignments/{assignment_id}/acta")  # Alternative endpoint
@router.get("/assignments/{assignment_id}/download-acta") # Explicit endpoint requested by frontend
def get_acta_pdf(assignment_id: int, db: Session = Depends(database.get_db)):
    print(f"DEBUG: get_acta_pdf called for assignment {assignment_id}")
    import zipfile
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    from datetime import datetime
    
    # Get assignment
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Reload relationships
    db.refresh(assignment)
    
    if not assignment.employee or not assignment.device:
        raise HTTPException(status_code=400, detail="Assignment missing employee or device data")
    
    # Get ALL active assignments for this employee
    employee_id = assignment.employee_id
    all_assignments = db.query(models.Assignment).filter(
        models.Assignment.employee_id == employee_id,
        models.Assignment.returned_date == None
    ).all()
    
    print(f"DEBUG: Found {len(all_assignments)} active assignments for employee {employee_id}")
    
    # Prepare devices info
    devices_info = []
    for assign in all_assignments:
        db.refresh(assign)
        if assign.device:
            devices_info.append({
                "type": assign.device.device_type,
                "brand": assign.device.brand or "",
                "model": assign.device.model or "",
                "serial": assign.device.serial_number or "-",
                "hostname": assign.device.hostname or "",  # Added hostname
                "imei": assign.device.imei or "",
                "phone_number": assign.device.phone_number or "",
                # Calcular status: USADO si tiene assignments previos con OTROS usuarios
                "status": "USADO" if db.query(models.Assignment).filter(
                    models.Assignment.device_id == assign.device.id,
                    models.Assignment.employee_id != assign.employee_id
                ).count() > 0 else "NUEVO"
            })
    
    # Categorize devices
    computer_devices, mobile_devices = pdf_generator.categorize_devices(devices_info)
    
    print(f"DEBUG: Computer devices: {len(computer_devices)}, Mobile devices: {len(mobile_devices)}")
    
    # 🔍 FIND DEFAULT DYNAMIC TEMPLATES
    comp_template = db.query(models.DocumentTemplate).filter(
        models.DocumentTemplate.template_type == "ASSIGNMENT_COMPUTER",
        models.DocumentTemplate.is_default == True,
        models.DocumentTemplate.is_active == True
    ).first()
    
    mobile_template = db.query(models.DocumentTemplate).filter(
        models.DocumentTemplate.template_type == "ASSIGNMENT_MOBILE",
        models.DocumentTemplate.is_default == True,
        models.DocumentTemplate.is_active == True
    ).first()
    
    comp_template_path = comp_template.file_path if comp_template else None
    mobile_template_path = mobile_template.file_path if mobile_template else None

    # Employee info
    employee_name = assignment.employee.full_name
    employee_dni = assignment.employee.dni or ""
    # Corregido: Usar Company real, no departamento
    employee_company = assignment.employee.company or "TRANSTOTAL AGENCIA MARITIMA S.A."
    
    # Date for filename
    now = datetime.now()
    date_str = now.strftime("%d-%m-%Y")
    
    generated_files = []
    
    # Generate computer acta if has computer devices
    if computer_devices:
        print(f"DEBUG: Generating computer acta with {len(computer_devices)} devices")
        computer_acta_path = pdf_generator.generate_batch_acta(
            assignment.id,
            employee_name,
            computer_devices,
            employee_dni,
            employee_company, # Usar company aquí
            template_path=comp_template_path,
            template=comp_template,
            acta_observations=assignment.notes
        )
        computer_filename = f"ACTA DE ENTREGA EQUIPO COMPUTO - {employee_name.upper()} - {date_str}.docx"
        generated_files.append((computer_acta_path, computer_filename))
    
    # Generate mobile acta if has mobile devices
    if mobile_devices:
        print(f"DEBUG: Generating mobile acta with {len(mobile_devices)} devices")
        mobile_acta_path = pdf_generator.generate_mobile_acta(
            assignment.id,
            employee_name,
            mobile_devices,
            employee_dni,
            employee_company, # Usar company aquí
            template_path=mobile_template_path,
            template=mobile_template,
            acta_observations=assignment.notes
        )
        mobile_filename = f"ACTA DE ENTREGA DE CELULAR - {employee_name.upper()} - {date_str}.docx"
        generated_files.append((mobile_acta_path, mobile_filename))
    
    # If no devices, error
    if not generated_files:
        raise HTTPException(status_code=400, detail="No devices found for this employee")
    
    # If only one type, return single file
    if len(generated_files) == 1:
        file_path, filename = generated_files[0]
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Cache-Control": "no-cache"
            }
        )
    
    # If both types, create ZIP
    print("DEBUG: Creating ZIP with both actas")
    
    # Save ZIP to disk instead of streaming
    zip_filename = f"ACTAS - {employee_name.upper()} - {date_str}.zip"
    # Get the backend directory (parent of routes)
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    output_dir = os.path.join(backend_dir, "generated_pdfs")
    os.makedirs(output_dir, exist_ok=True)  # Ensure directory exists
    zip_path = os.path.join(output_dir, f"actas_{assignment.id}_{now.strftime('%Y%m%d_%H%M%S')}.zip")
    
    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for file_path, filename in generated_files:
                # Verify file exists
                if not os.path.exists(file_path):
                    print(f"ERROR: File not found: {file_path}")
                    raise HTTPException(status_code=500, detail=f"Generated file not found: {filename}")
                
                print(f"DEBUG: Adding to ZIP: {filename} from {file_path}")
                # Add file to ZIP with custom name
                zip_file.write(file_path, arcname=filename)
        
        print(f"DEBUG: ZIP saved to: {zip_path}")
        
        return FileResponse(
            path=zip_path,
            filename=zip_filename,
            media_type='application/zip',
            headers={
                'Content-Disposition': f'attachment; filename="{zip_filename}"',
                'Cache-Control': 'no-cache'
            }
        )
    except Exception as e:
        print(f"ERROR creating ZIP: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating ZIP: {str(e)}")

# GET all assignments
@router.get("/assignments/", response_model=List[schemas.AssignmentWithDevice])
def get_all_assignments(db: Session = Depends(database.get_db)):
    """Get all assignments with employee and device details"""
    assignments = db.query(models.Assignment).all()
    return assignments
