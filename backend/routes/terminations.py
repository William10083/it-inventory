from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import database, schemas, crud, models, auth

router = APIRouter()

@router.post("/terminations/", response_model=schemas.Termination)
def create_termination(
    termination: schemas.TerminationCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Create a termination record for an employee.
    This will:
    1. Mark employee as inactive
    2. Return all assigned equipment to stock
    3. Create termination record
    4. Generate return actas
    """
    # Get employee
    employee = crud.get_employee(db, employee_id=termination.employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if not employee.is_active:
        raise HTTPException(status_code=400, detail="Employee is already terminated")
    
    # Get all active assignments
    active_assignments = db.query(models.Assignment).filter(
        models.Assignment.employee_id == termination.employee_id,
        models.Assignment.returned_date == None
    ).all()
    
    
    # We allow termination even if there are no assignments (e.g., employee never received equipment or lost it all)
    # The loop below will simply handle 0 items.
    
    # Create termination record
    db_termination = models.Termination(
        employee_id=termination.employee_id,
        termination_date=termination.termination_date or datetime.utcnow(),
        reason=termination.reason,
        observations=termination.observations,
        created_by_user_id=current_user.id
    )
    db.add(db_termination)
    db.flush()  # Get the ID
    
    # Return all equipment
    for assignment in active_assignments:
        assignment.returned_date = datetime.utcnow()
        assignment.termination_id = db_termination.id
        assignment.return_observations = termination.observations
        
        # Update device status to available
        device = assignment.device
        device.status = models.DeviceStatus.AVAILABLE
    
    # Mark employee as inactive
    employee.is_active = False
    employee.termination_date = db_termination.termination_date
    employee.termination_reason = termination.reason
    
    db.commit()
    db.refresh(db_termination)
    
    return db_termination

@router.get("/terminations/")
def list_terminations(
    skip: int = 0,
    limit: int = 20,  # Reducido de 100 a 20 porque las terminaciones son más pesadas
    search: str = None,
    db: Session = Depends(database.get_db)
):
    """
    List all terminations with search capability, pagination, and optimized queries.
    Uses eager loading to avoid N+1 query problem.
    """
    from sqlalchemy.orm import joinedload, selectinload
    from math import ceil
    
    # Base query with eager loading - load everything in one go
    query = db.query(models.Termination)\
        .join(models.Employee)\
        .options(
            joinedload(models.Termination.employee),
            selectinload(models.Termination.returned_assignments).joinedload(models.Assignment.device)
        )
    
    # Apply search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (models.Employee.full_name.ilike(search_pattern)) |
            (models.Employee.dni.ilike(search_pattern)) |
            (models.Employee.email.ilike(search_pattern))
        )
    
    # Count total before pagination
    total = query.count()
    
    # Apply pagination and ordering
    terminations = query.order_by(models.Termination.termination_date.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    # Enrich with equipment count and acta availability
    # Now we can do this without additional queries because of eager loading
    result = []
    for term in terminations:
        # returned_assignments are already loaded via eager loading
        assignments = term.returned_assignments
        equipment_count = len(assignments)
        
        # Check if there are computer or mobile devices
        has_computer = any(
            a.device and a.device.device_type in ['laptop', 'monitor', 'keyboard', 'mouse', 'kit teclado/mouse', 'mochila', 'stand'] 
            for a in assignments
        )
        has_mobile = any(
            a.device and a.device.device_type in ['celular', 'chip', 'charger'] 
            for a in assignments
        )
        
        # Build detailed list of returned devices (exclude chargers as they're shown in mobile details)
        # Use list comprehension for better performance
        returned_devices_list = []
        for a in assignments:
            if a.device and a.device.device_type != 'charger':
                device_info = {
                    'type': a.device.device_type,
                    'brand': a.device.brand or '',
                    'model': a.device.model or '',
                    'serial_number': a.device.serial_number or '',
                    'hostname': a.device.hostname or '',
                }
                
                # Add mobile-specific fields
                if a.device.device_type == 'mobile':
                    device_info['imei'] = a.device.imei or ''
                    device_info['phone_number'] = a.device.phone_number or ''
                
                returned_devices_list.append(device_info)

        result.append(schemas.TerminationWithActas(
            id=term.id,
            employee_id=term.employee_id,
            termination_date=term.termination_date,
            reason=term.reason,
            observations=term.observations,
            created_at=term.created_at,
            created_by_user_id=term.created_by_user_id,
            computer_acta_path=term.computer_acta_path,  # Include uploaded acta path
            mobile_acta_path=term.mobile_acta_path,      # Include uploaded acta path
            employee=term.employee,
            equipment_returned_count=equipment_count,
            computer_acta_available=has_computer,
            mobile_acta_available=has_mobile,
            returned_devices=returned_devices_list
        ))
    
    # Calculate total pages
    pages = ceil(total / limit) if limit > 0 else 0
    
    # Return paginated response
    return {
        "items": result,
        "total": total,
        "skip": skip,
        "limit": limit,
        "pages": pages
    }

@router.get("/terminations/{termination_id}", response_model=schemas.TerminationDetail)
def get_termination(termination_id: int, db: Session = Depends(database.get_db)):
    """Get detailed termination information"""
    termination = db.query(models.Termination).filter(models.Termination.id == termination_id).first()
    if not termination:
        raise HTTPException(status_code=404, detail="Termination not found")
    
    equipment_count = db.query(models.Assignment).filter(
        models.Assignment.termination_id == termination_id
    ).count()
    
    return schemas.TerminationDetail(
        **termination.__dict__,
        employee=termination.employee,
        equipment_returned_count=equipment_count
    )

@router.get("/terminations/{termination_id}/acta-computer")
async def download_computer_acta(termination_id: int, db: Session = Depends(database.get_db)):
    """Generate and download computer equipment return acta"""
    from fastapi.responses import FileResponse
    import pdf_generator
    
    termination = db.query(models.Termination).filter(models.Termination.id == termination_id).first()
    if not termination:
        raise HTTPException(status_code=404, detail="Termination not found")
    
    # Get computer equipment assignments (Everything except mobile/chip)
    assignments = db.query(models.Assignment).filter(
        models.Assignment.termination_id == termination_id
    ).all()
    
    # Identify mobile device brands to filter out their chargers
    mobile_brands = set()
    for a in assignments:
        if a.device.device_type in ['mobile', 'chip']:
            if a.device.brand:
                mobile_brands.add(a.device.brand.lower())
    
    # Filter: exclude mobile, chip, and chargers that match mobile brands
    computer_devices = []
    for a in assignments:
        dtype = a.device.device_type
        if dtype in ['mobile', 'chip']:
            continue
        # Exclude chargers whose brand matches a mobile device brand
        if dtype == 'charger' and a.device.brand and a.device.brand.lower() in mobile_brands:
            continue
        computer_devices.append(a)
    
    if not computer_devices:
        raise HTTPException(status_code=404, detail="No computer equipment found for this termination")
    
    # Generate acta
    import json
    # 🔍 FIND DEFAULT DYNAMIC TEMPLATE
    template = db.query(models.DocumentTemplate).filter(
        models.DocumentTemplate.template_type == "RETURN_COMPUTER",
        models.DocumentTemplate.is_default == True,
        models.DocumentTemplate.is_active == True
    ).first()
    template_path = template.file_path if template else None
    
    template_vars = None
    if template and template.variables:
        try:
            parsed_vars = json.loads(template.variables)
            # transform list of objects to dict: key=name, value=map_to
            if isinstance(parsed_vars, list):
                template_vars = {
                    v['name']: v.get('map_to', 'custom') 
                    for v in parsed_vars 
                    if isinstance(v, dict) and 'name' in v
                }
            elif isinstance(parsed_vars, dict):
                template_vars = parsed_vars
        except json.JSONDecodeError:
            print(f"Error parsing variables for template {template.id}")
            template_vars = None

    file_path = pdf_generator.generate_return_acta_computer(
        termination_id=termination_id,
        employee=termination.employee,
        assignments=computer_devices,
        observations=termination.observations,
        template_path=template_path,
        template_variables=template_vars
    )
    
    return FileResponse(
        file_path,
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename=f'Acta_Recepcion_Computadora_{termination.employee.full_name.replace(" ", "_")}_{termination_id}.docx'
    )

@router.get("/terminations/{termination_id}/acta-mobile")
async def download_mobile_acta(termination_id: int, db: Session = Depends(database.get_db)):
    """Generate and download mobile equipment return acta"""
    from fastapi.responses import FileResponse
    import pdf_generator
    
    termination = db.query(models.Termination).filter(models.Termination.id == termination_id).first()
    if not termination:
        raise HTTPException(status_code=404, detail="Termination not found")
    
    # Get mobile equipment assignments (including chargers)
    assignments = db.query(models.Assignment).filter(
        models.Assignment.termination_id == termination_id
    ).all()
    
    mobile_devices = [a for a in assignments if a.device.device_type in ['mobile', 'chip', 'charger']]
    
    if not mobile_devices:
        raise HTTPException(status_code=404, detail="No mobile equipment found for this termination")
    
    # Generate acta
    import json
    # 🔍 FIND DEFAULT DYNAMIC TEMPLATE
    template = db.query(models.DocumentTemplate).filter(
        models.DocumentTemplate.template_type == "RETURN_MOBILE",
        models.DocumentTemplate.is_default == True,
        models.DocumentTemplate.is_active == True
    ).first()
    template_path = template.file_path if template else None

    template_vars = None
    if template and template.variables:
        try:
            parsed_vars = json.loads(template.variables)
            # transform list of objects to dict: key=name, value=map_to
            if isinstance(parsed_vars, list):
                template_vars = {var['name']: var.get('map_to', '') for var in parsed_vars if isinstance(var, dict)}
            else:
                template_vars = parsed_vars
        except Exception as e:
            print(f"Error parsing template variables: {e}")
            template_vars = None

    file_path = pdf_generator.generate_return_acta_mobile(
        termination_id=termination_id,
        employee=termination.employee,
        assignments=mobile_devices,
        observations=termination.observations,
        template_path=template_path,
        template_variables=template_vars
    )
    
    return FileResponse(
        file_path,
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename=f'Acta_Recepcion_Celular_{termination.employee.full_name.replace(" ", "_")}_{termination_id}.docx'
    )

@router.delete("/terminations/{termination_id}")
def delete_termination(
    termination_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Delete a termination record and revert its effects.
    1. Employee becomes active again
    2. All returned devices become assigned again
    """
    # Get termination
    termination = db.query(models.Termination).filter(models.Termination.id == termination_id).first()
    if not termination:
        raise HTTPException(status_code=404, detail="Termination not found")
    
    # Get employee
    employee = termination.employee
    
    # Get all assignments related to this termination
    termination_assignments = db.query(models.Assignment).filter(
        models.Assignment.termination_id == termination_id
    ).all()
    
    # Revert assignments
    for assignment in termination_assignments:
        assignment.returned_date = None
        assignment.termination_id = None
        assignment.return_observations = None
        
        # Update device status back to ASSIGNED
        if assignment.device:
            assignment.device.status = models.DeviceStatus.ASSIGNED
        
    # Revert employee status
    if employee:
        employee.is_active = True
        # These fields are on the Employee model
        employee.termination_date = None
        employee.termination_reason = None
    
    # Delete termination record
    db.delete(termination)
    db.commit()
    
    return {"message": "Termination deleted and effects reverted successfully"}
