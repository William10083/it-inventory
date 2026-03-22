from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse
import database, schemas, crud, pdf_generator, cache
import models
from services import audit, email
import auth
import os

router = APIRouter()

@router.post("/assignments/batch", response_model=List[schemas.Assignment])
def assign_device_batch(batch: schemas.AssignmentBatchCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
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
            db_assignment = crud.assign_device(db, assignment_data, user_id=current_user.id)
            if db_assignment:
                # Save assignment type
                db_assignment.assignment_type = batch.assignment_type or "ASIGNACION"
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
                "hostname": a.device.hostname,
                "inventory_code": a.device.inventory_code or ""  # Added inventory_code
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

        # NOTE: NO guardar pdf_acta_path para actas generadas automáticamente
        # Este campo se reserva SOLO para PDFs firmados subidos por el usuario
        # for a in created_assignments:
        #     a.pdf_acta_path = pdf_path
        
        db.commit()
        cache.invalidate_all()
        print("DEBUG: Batch assignment committed successfully")

        return created_assignments
    except Exception as e:
        print(f"DEBUG: Exception in batch assignment: {e}")
        import traceback
        traceback.print_exc()
        raise e

@router.post("/assignments/", response_model=schemas.Assignment)
def assign_device(assignment: schemas.AssignmentCreate, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    db_assignment = crud.assign_device(db, assignment, user_id=current_user.id)
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
    
    # NOTE: NO guardar pdf_acta_path para actas generadas automáticamente
    # Este campo se reserva SOLO para PDFs firmados subidos por el usuario
    # db_assignment.pdf_acta_path = pdf_path
    db.commit()
    cache.invalidate_all()

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
    cache.invalidate_all()
    return {"status": "returned", "device_serial": device.serial_number}

@router.get("/assignments/{assignment_id}/pdf")
@router.get("/assignments/{assignment_id}/acta")  # Alternative endpoint
def get_acta_pdf(assignment_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_optional_current_user)):
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
    
    # Get ALL active assignments for this employee (with device eager loaded)
    employee_id = assignment.employee_id
    from sqlalchemy.orm import joinedload as _jl
    all_assignments = db.query(models.Assignment).options(
        _jl(models.Assignment.device)
    ).filter(
        models.Assignment.employee_id == employee_id,
        models.Assignment.returned_date == None
    ).all()

    print(f"DEBUG: Found {len(all_assignments)} active assignments for employee {employee_id}")

    # Batch query: which device_ids were previously assigned to OTHER employees?
    # One query instead of 1 per assignment (N+1 fix)
    active_device_ids = [a.device.id for a in all_assignments if a.device]
    previously_assigned_ids: set[int] = set()
    if active_device_ids:
        from sqlalchemy import distinct as _distinct
        rows = db.query(_distinct(models.Assignment.device_id)).filter(
            models.Assignment.device_id.in_(active_device_ids),
            models.Assignment.employee_id != employee_id,
        ).all()
        previously_assigned_ids = {r[0] for r in rows}

    # Prepare devices info
    devices_info = []
    for assign in all_assignments:
        if assign.device:
            # Parse specifications JSON for fallback IMEI/phone values
            import json as _json
            _specs = {}
            try:
                if assign.device.specifications:
                    _specs = _json.loads(assign.device.specifications)
            except Exception:
                pass

            _imei = assign.device.imei or _specs.get('imei') or _specs.get('IMEI') or ""
            _phone = assign.device.phone_number or _specs.get('phone_number') or _specs.get('numero_linea') or ""

            # Use pre-fetched set — no query per iteration
            _status = "USADO" if assign.device.id in previously_assigned_ids else "NUEVO"

            _base = {
                "brand": assign.device.brand or "",
                "serial": assign.device.serial_number or "-",
                "hostname": assign.device.hostname or "",
                "inventory_code": assign.device.inventory_code or "",
                "imei": _imei,
                "phone_number": _phone,
                "mobile_charger_brand": assign.device.mobile_charger_brand or "",
                "mobile_charger_model": assign.device.mobile_charger_model or "",
                "mobile_charger_serial": assign.device.mobile_charger_serial or "",
                "specifications": assign.device.specifications or "",
                "status": _status,
            }

            # KEYBOARD_MOUSE_KIT -> split into separate TECLADO and MOUSE entries
            _dtype_lower = (assign.device.device_type or "").lower()
            if _dtype_lower in ("keyboard_mouse_kit", "kit teclado/mouse", "kit_teclado_mouse"):
                _model = assign.device.model or ""
                kb_model, ms_model = _model, _model
                if "/" in _model:
                    parts = _model.split("/", 1)
                    kb_model = parts[0].strip()
                    ms_model = parts[1].strip()
                devices_info.append({**_base, "type": "teclado", "model": kb_model})
                devices_info.append({**_base, "type": "mouse",   "model": ms_model})
            else:
                devices_info.append({**_base, "type": assign.device.device_type, "model": assign.device.model or ""})
    
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

    # Item number: conteo de empleados activos (correlativo)
    item_number = db.query(models.Employee).filter(models.Employee.is_active == True).count()

    # Datos del TI (usuario logueado)
    ti_name = (current_user.full_name or "") if current_user else ""
    ti_dni = (current_user.dni or "") if current_user else ""

    # Tipo de asignación → otros comentarios
    assignment_type = assignment.assignment_type or "ASIGNACION"
    otros_comentarios = "ASIGNACION DE EQUIPO" if assignment_type == "ASIGNACION" else "REEMPLAZO DE EQUIPO"
    tipo_asignacion = assignment_type  # ASIGNACION o REEMPLAZO

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
            employee_company,
            template_path=comp_template_path,
            template=comp_template,
            acta_observations=assignment.notes,
            item_number=item_number,
            ti_name=ti_name,
            ti_dni=ti_dni,
            otros_comentarios=otros_comentarios,
            tipo_asignacion=tipo_asignacion,
        )
        computer_filename = f"ACTA DE ENTREGA EQUIPO COMPUTO - {employee_name.upper()} - {date_str}.docx"
        generated_files.append((computer_acta_path, computer_filename))
        # Subir a Google Drive en background
        try:
            import google_drive_service
            google_drive_service.upload_file_async(computer_acta_path, "asignaciones", computer_filename)
        except Exception:
            pass

    # Generate mobile acta if has mobile devices
    if mobile_devices:
        # Verificar que haya al menos un dispositivo móvil REAL (no solo accesorios/cargadores)
        has_real_mobile = any(
            dev.get('type', '').lower() in ['mobile', 'chip', 'celular']
            for dev in mobile_devices
        )

        if has_real_mobile:
            print(f"DEBUG: Generating mobile acta with {len(mobile_devices)} devices")
            mobile_acta_path = pdf_generator.generate_mobile_acta(
                assignment.id,
                employee_name,
                mobile_devices,
                employee_dni,
                employee_company,
                template_path=mobile_template_path,
                template=mobile_template,
                acta_observations=assignment.notes,
                item_number=item_number,
                ti_name=ti_name,
                ti_dni=ti_dni,
                otros_comentarios=otros_comentarios,
                tipo_asignacion=tipo_asignacion,
            )
            mobile_filename = f"ACTA DE ENTREGA DE CELULAR - {employee_name.upper()} - {date_str}.docx"
            generated_files.append((mobile_acta_path, mobile_filename))
            # Subir a Google Drive en background
            try:
                import google_drive_service
                google_drive_service.upload_file_async(mobile_acta_path, "asignaciones", mobile_filename)
            except Exception:
                pass
        else:
            print(f"DEBUG: Skipping mobile acta - no real mobile devices found (only accessories/chargers)")
    
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

# GET all assignments (paginated)
@router.get("/assignments/")
def get_all_assignments(
    skip: int = 0,
    limit: int = 100,
    employee_id: int = None,
    active_only: bool = False,
    db: Session = Depends(database.get_db),
):
    """
    Get assignments with pagination and optional filters.
    - active_only=true → solo asignaciones sin fecha de devolución
    - employee_id → filtrar por empleado
    """
    from sqlalchemy.orm import joinedload as _jl
    from math import ceil

    query = db.query(models.Assignment).options(
        _jl(models.Assignment.device),
        _jl(models.Assignment.employee),
    )

    if active_only:
        query = query.filter(models.Assignment.returned_date == None)
    if employee_id:
        query = query.filter(models.Assignment.employee_id == employee_id)

    total = query.count()
    assignments = query.order_by(models.Assignment.id.desc()).offset(skip).limit(limit).all()

    return {
        "items": assignments,
        "total": total,
        "skip": skip,
        "limit": limit,
        "pages": ceil(total / limit) if limit > 0 else 0,
    }
