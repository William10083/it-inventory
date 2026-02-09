from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
import models, schemas
import datetime

# Device CRUD
def get_device(db: Session, device_id: int):
    return db.query(models.Device).options(joinedload(models.Device.assignments)).filter(models.Device.id == device_id).first()

def get_device_by_serial(db: Session, serial: str):
    return db.query(models.Device).filter(models.Device.serial_number == serial).first()

def get_device_by_barcode(db: Session, barcode: str):
    return db.query(models.Device).filter(models.Device.barcode == barcode).first()

def get_devices(db: Session, skip: int = 0, limit: int = 100, search: str = None):
    query = db.query(models.Device).options(joinedload(models.Device.assignments).joinedload(models.Assignment.employee))
    if search:
        search_filter = or_(
            models.Device.serial_number.contains(search),
            models.Device.barcode.contains(search),
            models.Device.brand.contains(search),
            models.Device.model.contains(search),
            models.Device.hostname.contains(search)
        )
        query = query.filter(search_filter)
    return query.offset(skip).limit(limit).all()

def create_device(db: Session, device: schemas.DeviceCreate):
    db_device = models.Device(**device.dict())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

# Employee CRUD
def get_employee(db: Session, employee_id: int):
    return db.query(models.Employee).filter(models.Employee.id == employee_id).first()

def get_employee_by_email(db: Session, email: str):
    return db.query(models.Employee).filter(models.Employee.email == email).first()

def get_employees(db: Session, skip: int = 0, limit: int = 100, search: str = None, active_only: bool = False):
    # Optimize query with eager loading to avoid N+1 problem
    # We need to load assignments and the device within each assignment
    query = db.query(models.Employee).options(
        joinedload(models.Employee.assignments).joinedload(models.Assignment.device)
    )
    
    if active_only:
        query = query.filter(models.Employee.is_active == True)
    if search:
        query = query.filter(models.Employee.full_name.ilike(f"%{search}%") | models.Employee.email.ilike(f"%{search}%"))
    
    # Order by name for consistent pagination
    query = query.order_by(models.Employee.full_name)
    
    return query.offset(skip).limit(limit).all()

def create_employee(db: Session, employee: schemas.EmployeeCreate):
    db_employee = models.Employee(**employee.dict())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee

def update_employee(db: Session, employee_id: int, employee_update: schemas.EmployeeUpdate):
    """Update an employee's information (partial update)"""
    db_employee = get_employee(db, employee_id)
    if not db_employee:
        return None
    
    # Update only provided fields
    update_data = employee_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(db_employee, field, value)
    
    db.commit()
    db.refresh(db_employee)
    return db_employee

# Assignment Logic
def assign_device(db: Session, assignment: schemas.AssignmentCreate):
    # 1. Check if device is available
    device = get_device(db, assignment.device_id)
    if not device:
        return None # In API handle raise HTTPException
    
    # 2. Create Assignment Record
    db_assignment = models.Assignment(**assignment.dict())
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    
    # 3. Update Device status
    device.status = models.DeviceStatus.ASSIGNED
    db.commit()
    
    return db_assignment

def return_device(db: Session, device_id: int):
    device = get_device(db, device_id)
    if not device:
        return None
    
    # Find active assignment (no returned_date) for this device
    assignment = db.query(models.Assignment).filter(
        models.Assignment.device_id == device_id,
        models.Assignment.returned_date == None
    ).first()
    
    if not assignment:
        return None  # Device has no active assignment
    
    # Set returned_date
    assignment.returned_date = datetime.datetime.utcnow()
    
    # Update device status
    device.status = models.DeviceStatus.AVAILABLE
    db.commit()
    return device

def delete_device(db: Session, device_id: int):
    device = get_device(db, device_id)
    if device:
        db.delete(device)
        db.commit()
    return device

def delete_employee(db: Session, employee_id: int):
    employee = get_employee(db, employee_id)
    if employee:
        db.delete(employee)
        db.commit()
    return employee
