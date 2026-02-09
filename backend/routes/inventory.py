from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import io
import qrcode
from sqlalchemy.orm import Session
from sqlalchemy import case, asc, desc, or_, and_
from typing import List
import database, schemas, crud
import models
from services import audit
import auth

router = APIRouter()

@router.post("/devices/", response_model=schemas.Device)
def create_device(device: schemas.DeviceCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    db_device = crud.get_device_by_serial(db, serial=device.serial_number)
    if db_device:
        raise HTTPException(status_code=400, detail="Serial number already registered")
    
    new_device = crud.create_device(db=db, device=device)
    
    # Audit Log with snapshot
    try:
        audit.log_action_with_snapshot(
            db, 
            current_user.id, 
            "DEVICE_CREATED",
            "device",
            new_device.id,
            snapshot_after=audit.get_entity_snapshot(new_device),
            is_revertible=False,  # Creation not revertible
            details=f"Created {new_device.brand} {new_device.model}"
        )
    except Exception:
        pass # Don't fail request if log fails

    return new_device

@router.get("/devices/")
def read_devices(
    skip: int = 0, 
    limit: int = 50,  # Reducido de 100 a 50 para mejor rendimiento
    search: str = None,
    device_type: str = None,
    status: str = None,
    location: str = None,
    include_deleted: bool = False,
    sort_by: str = None,
    sort_order: str = 'asc',
    db: Session = Depends(database.get_db)
):
    """
    Get devices with pagination and server-side filtering.
    Returns paginated response with metadata.
    """
    from sqlalchemy.orm import subqueryload
    from math import ceil
    
    # Base query with eager loading to avoid N+1 queries
    query = db.query(models.Device).options(
        subqueryload(models.Device.assignments)
    )
    
    # Filter out deleted devices unless explicitly requested
    if not include_deleted:
        query = query.filter(models.Device.deleted_at == None)
    
    # Exclude chargers from inventory list (they're shown in device details)
    # Frontend filters them anyway, so excluding here prevents empty pages
    query = query.filter(models.Device.device_type != 'charger')
    
    # Apply server-side filters
    if search:
        search_filter = f"%{search}%"
        
        query = query.filter(
            or_(
                models.Device.device_type.ilike(search_filter),
                models.Device.serial_number.ilike(search_filter),
                models.Device.brand.ilike(search_filter),
                models.Device.model.ilike(search_filter),
                models.Device.hostname.ilike(search_filter),
                models.Device.inventory_code.ilike(search_filter),
                # Check active assignments for employee matches
                models.Device.assignments.any(
                    and_(
                        models.Assignment.returned_date == None,
                        models.Assignment.employee.has(
                            or_(
                                models.Employee.full_name.ilike(search_filter),
                                models.Employee.dni.ilike(search_filter)
                            )
                        )
                    )
                )
            )
        )
    
    # Support multiple values separated by commas for Excel-style filters
    if device_type:
        types = [t.strip() for t in device_type.split(',')]
        query = query.filter(models.Device.device_type.in_(types))
    
    if status:
        statuses = [s.strip() for s in status.split(',')]
        query = query.filter(models.Device.status.in_(statuses))
    
    if location:
        locations = [l.strip() for l in location.split(',')]
        query = query.filter(models.Device.location.in_(locations))
    
    # Apply sorting
    # Define custom ordering for device types
    type_ordering = case(
        (models.Device.device_type == 'laptop', 1),
        (models.Device.device_type == 'monitor', 2),
        (models.Device.device_type == 'celular', 3),
        (models.Device.device_type == 'kit teclado/mouse', 4),
        (models.Device.device_type == 'auriculares', 5),
        (models.Device.device_type == 'mochila', 6),
        else_=100
    )

    # Define custom ordering for status (Available > Assigned > Sold > Retired)
    status_ordering = case(
        (models.Device.status == 'available', 1),
        (models.Device.status == 'assigned', 2),
        (models.Device.status == 'sold', 3),
        (models.Device.status == 'retired', 4),
        else_=5
    )

    # Define ordering for Status Groups (Active=1, Inactive=2)
    # This ensures Sold/Retired items appear at the very end
    status_group_ordering = case(
        (models.Device.status.in_(['available', 'assigned', 'maintenance']), 1),
        (models.Device.status.in_(['sold', 'retired']), 2),
        else_=2
    )

    # Apply sorting
    if sort_by:
        # from sqlalchemy import asc, desc # Moved to top level
        direction = desc if sort_order == 'desc' else asc
        
        if sort_by == 'brand':
            query = query.order_by(direction(models.Device.brand))
        elif sort_by == 'model':
            # Sort by brand then model for better experience
            query = query.order_by(direction(models.Device.brand), direction(models.Device.model))
        elif sort_by == 'serial_number':
            query = query.order_by(direction(models.Device.serial_number))
        elif sort_by == 'hostname':
            query = query.order_by(direction(models.Device.hostname))
        elif sort_by == 'status':
            query = query.order_by(direction(models.Device.status))
        elif sort_by == 'device_type':
            # Use custom ordering logic
            direction_func = desc if sort_order == 'desc' else asc
            # When sorting by type, we also want available items first within that type
            query = query.order_by(direction_func(type_ordering), asc(status_ordering))
    else:
        # Default sort: 
        # 1. Active vs Inactive (Active first)
        # 2. Device Type (Laptop > Monitor ...)
        # 3. Status (Available > Assigned ...)
        # 4. Brand
        query = query.order_by(
            asc(status_group_ordering), 
            asc(type_ordering), 
            asc(status_ordering), 
            models.Device.brand, 
            models.Device.id.desc()
        )
    
    # Count total before pagination
    total = query.count()
    
    # Apply pagination
    devices = query.offset(skip).limit(limit).all()
    
    # Calculate total pages
    pages = ceil(total / limit) if limit > 0 else 0
    
    # Return paginated response
    return {
        "items": devices,
        "total": total,
        "skip": skip,
        "limit": limit,
        "pages": pages
    }

@router.get("/devices/{device_id}", response_model=schemas.DeviceDetail)
def read_device(device_id: int, db: Session = Depends(database.get_db)):
    db_device = crud.get_device(db, device_id=device_id)
    if db_device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return db_device

@router.get("/devices/{device_id}/qr")
def generate_device_qr(device_id: int, db: Session = Depends(database.get_db)):
    db_device = crud.get_device(db, device_id=device_id)
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Generate QR Data
    qr_data = f"Asset ID: {db_device.id}\nType: {db_device.device_type}\nModel: {db_device.model}\nSerial: {db_device.serial_number}"
    if db_device.imei:
        qr_data += f"\nIMEI: {db_device.imei}"
    
    img = qrcode.make(qr_data)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    
    return StreamingResponse(buf, media_type="image/png")

@router.put("/devices/{device_id}/status", response_model=schemas.Device)
def update_device_status(device_id: int, status_update: schemas.DeviceUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    db_device = crud.get_device(db, device_id=device_id)
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    if status_update.status:
        db_device.status = status_update.status
    if status_update.specifications is not None:
        db_device.specifications = status_update.specifications
        
    db.commit()
    db.refresh(db_device)
    return db_device

@router.put("/devices/{device_id}", response_model=schemas.Device)
def update_device(device_id: int, device_update: schemas.DeviceUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    """Update device details"""
    db_device = crud.get_device(db, device_id=device_id)
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Capture snapshot before update
    snapshot_before = audit.get_entity_snapshot(db_device)
    
    # Update fields if provided
    if device_update.brand is not None:
        db_device.brand = device_update.brand
    if device_update.model is not None:
        db_device.model = device_update.model
    if device_update.serial_number is not None:
        # Check if serial number is unique
        existing = db.query(models.Device).filter(
            models.Device.serial_number == device_update.serial_number,
            models.Device.id != device_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Serial number already exists")
        db_device.serial_number = device_update.serial_number
    if device_update.barcode is not None:
        db_device.barcode = device_update.barcode if device_update.barcode.strip() else None
    if device_update.hostname is not None:
        db_device.hostname = device_update.hostname if device_update.hostname.strip() else None
    if device_update.specifications is not None:
        db_device.specifications = device_update.specifications if device_update.specifications.strip() else None
    if device_update.status is not None:
        db_device.status = device_update.status
    
    # Mobile fields - convert empty strings to None to avoid UNIQUE constraint issues
    if device_update.imei is not None:
        db_device.imei = device_update.imei if device_update.imei.strip() else None
    if device_update.phone_number is not None:
        db_device.phone_number = device_update.phone_number if device_update.phone_number.strip() else None
    if device_update.carrier is not None:
        db_device.carrier = device_update.carrier if device_update.carrier.strip() else None
    if device_update.location is not None:
        db_device.location = device_update.location
    
    db.commit()
    db.refresh(db_device)
    
    # Capture snapshot after update
    snapshot_after = audit.get_entity_snapshot(db_device)
    
    # Audit log with snapshots
    try:
        audit.log_action_with_snapshot(
            db,
            current_user.id,
            "DEVICE_UPDATED",
            "device",
            db_device.id,
            snapshot_before=snapshot_before,
            snapshot_after=snapshot_after,
            is_revertible=True,
            details=f"Updated {db_device.brand} {db_device.model}"
        )
    except Exception:
        pass
    
    return db_device

@router.post("/employees/", response_model=schemas.Employee)
def create_employee(employee: schemas.EmployeeCreate, db: Session = Depends(database.get_db)):
    db_employee = crud.get_employee_by_email(db, email=employee.email)
    if db_employee:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_employee(db=db, employee=employee)

@router.get("/employees/", response_model=List[schemas.EmployeeDetail])
def read_employees(skip: int = 0, limit: int = 100, search: str = None, active_only: bool = False, db: Session = Depends(database.get_db)):
    return crud.get_employees(db, skip=skip, limit=limit, search=search, active_only=active_only)

@router.get("/employees/{employee_id}", response_model=schemas.EmployeeDetail)
def read_employee(employee_id: int, db: Session = Depends(database.get_db)):
    db_employee = crud.get_employee(db, employee_id=employee_id)
    if db_employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return db_employee

@router.get("/employees/{employee_id}/acta-info")
def get_employee_acta_info(employee_id: int, db: Session = Depends(database.get_db)):
    """
    Get structured information about an employee's devices and actas.
    Returns information separated by device category (computer vs mobile).
    """
    db_employee = crud.get_employee(db, employee_id=employee_id)
    if db_employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get all active assignments (not returned)
    active_assignments = [a for a in db_employee.assignments if not a.returned_date]
    
    # Categorize devices
    has_computer_devices = False
    has_mobile_devices = False
    computer_assignment_id = None
    mobile_assignment_id = None
    computer_acta_path = None
    mobile_acta_path = None
    
    # Check active assignments for device types
    for assignment in active_assignments:
        device = assignment.device
        if not device:
            continue
        
        device_type = device.device_type
        
        # Computer devices
        if device_type in ['laptop', 'monitor', 'kit teclado/mouse', 'mochila', 'auriculares', 'stand', 'keyboard', 'mouse']:
            has_computer_devices = True
            if not computer_assignment_id:
                computer_assignment_id = assignment.id
        # Mobile devices
        elif device_type in ['celular', 'chip', 'charger']:
            has_mobile_devices = True
            if not mobile_assignment_id:
                mobile_assignment_id = assignment.id
    
    # Check ALL assignments (including returned) for actas
    for assignment in db_employee.assignments:
        if assignment.pdf_acta_path:
            device = assignment.device
            if not device:
                continue
            
            device_type = device.device_type
            
            # Computer acta
            if device_type in ['laptop', 'monitor', 'kit teclado/mouse', 'mochila', 'auriculares', 'stand', 'keyboard', 'mouse']:
                if not computer_acta_path:
                    computer_acta_path = assignment.pdf_acta_path
                    # IMPORTANT: Update assignment ID to the one that HAS the acta
                    computer_assignment_id = assignment.id
            # Mobile acta
            elif device_type in ['mobile', 'chip', 'charger']:
                if not mobile_acta_path:
                    mobile_acta_path = assignment.pdf_acta_path
                    # IMPORTANT: Update assignment ID to the one that HAS the acta
                    mobile_assignment_id = assignment.id
    
    return {
        "employee_id": employee_id,
        "employee_name": db_employee.full_name,
        "has_computer_devices": has_computer_devices,
        "has_mobile_devices": has_mobile_devices,
        "computer_assignment_id": computer_assignment_id,
        "mobile_assignment_id": mobile_assignment_id,
        "computer_acta_path": computer_acta_path,
        "mobile_acta_path": mobile_acta_path
    }

@router.patch("/employees/{employee_id}", response_model=schemas.Employee)
def update_employee(employee_id: int, employee_update: schemas.EmployeeUpdate, db: Session = Depends(database.get_db)):
    """Update an employee's information (partial update)"""
    db_employee = crud.update_employee(db, employee_id=employee_id, employee_update=employee_update)
    if db_employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return db_employee

@router.delete("/devices/{device_id}", response_model=schemas.Device)
def delete_device(device_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    """Soft delete a device (can be restored via audit log)"""
    db_device = crud.get_device(db, device_id=device_id)
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    if db_device.deleted_at:
        raise HTTPException(status_code=400, detail="Device already deleted")
    
    # Capture snapshot before deletion
    snapshot_before = audit.get_entity_snapshot(db_device)
    
    # Soft delete
    import datetime
    db_device.deleted_at = datetime.datetime.utcnow()
    db_device.deleted_by_user_id = current_user.id
    db.commit()
    db.refresh(db_device)
    
    # Audit log
    try:
        audit.log_action_with_snapshot(
            db,
            current_user.id,
            "DEVICE_DELETED",
            "device",
            db_device.id,
            snapshot_before=snapshot_before,
            is_revertible=True,
            details=f"Deleted {db_device.brand} {db_device.model}"
        )
    except Exception:
        pass
    
    return db_device

@router.delete("/employees/{employee_id}", response_model=schemas.Employee)
def delete_employee(employee_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    """Soft delete an employee (can be restored via audit log)"""
    db_employee = crud.get_employee(db, employee_id=employee_id)
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if db_employee.deleted_at:
        raise HTTPException(status_code=400, detail="Employee already deleted")
    
    # Capture snapshot before deletion
    snapshot_before = audit.get_entity_snapshot(db_employee)
    
    # Soft delete
    import datetime
    db_employee.deleted_at = datetime.datetime.utcnow()
    db_employee.deleted_by_user_id = current_user.id
    db.commit()
    db.refresh(db_employee)
    
    # Audit log
    try:
        audit.log_action_with_snapshot(
            db,
            current_user.id,
            "EMPLOYEE_DELETED",
            "employee",
            db_employee.id,
            snapshot_before=snapshot_before,
            is_revertible=True,
            details=f"Deleted employee {db_employee.full_name}"
        )
    except Exception:
        pass
    
    return db_employee
