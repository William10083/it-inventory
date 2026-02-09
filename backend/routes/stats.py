from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
import database, models
import datetime
from typing import Optional

router = APIRouter()

@router.get("/stats")
def get_stats(location: Optional[str] = Query(None), db: Session = Depends(database.get_db)):
    """Get inventory statistics, optionally filtered by location"""
    
    # Build base query for devices with location filter, EXCLUDING SOLD devices
    device_query = db.query(models.Device).filter(
        models.Device.deleted_at == None,
        models.Device.status != models.DeviceStatus.SOLD
    )
    if location and location != "all":
        device_query = device_query.filter(models.Device.location == location)
    
    # Build base query for employees with location filter (Active only for KPIs)
    employee_query = db.query(models.Employee).filter(
        models.Employee.deleted_at == None,
        models.Employee.is_active == True
    )
    if location and location != "all":
        employee_query = employee_query.filter(models.Employee.location == location)
    
    # 1. Total Assets
    total_devices = device_query.count()
    
    # 2. Status Breakdown (filtered by location)
    status_query = db.query(
        models.Device.status, 
        func.count(models.Device.id)
    ).filter(
        models.Device.deleted_at == None,
        models.Device.status != models.DeviceStatus.SOLD
    )
    if location and location != "all":
        status_query = status_query.filter(models.Device.location == location)
    status_counts = status_query.group_by(models.Device.status).all()
    
    stats_by_status = {status: count for status, count in status_counts}
    
    # 3. Type Breakdown (filtered by location)
    type_query = db.query(
        models.Device.device_type, 
        func.count(models.Device.id)
    ).filter(
        models.Device.deleted_at == None,
        models.Device.status != models.DeviceStatus.SOLD
    )
    if location and location != "all":
        type_query = type_query.filter(models.Device.location == location)
    type_counts = type_query.group_by(models.Device.device_type).all()
    
    stats_by_type = {dtype: count for dtype, count in type_counts}
    
    # 4. Employee Stats (filtered by location)
    total_employees = employee_query.count()
    
    # Get active assignments for employees in this location
    # Get active assignments for employees in this location
    # MUST join Employee to filter by is_active status of the employee (exclude terminated)
    assignment_query = db.query(models.Assignment).join(models.Employee).filter(
        models.Assignment.returned_date == None,
        models.Employee.is_active == True,
        models.Employee.deleted_at == None
    )
    if location and location != "all":
        # Filter assignments by employee location
        assignment_query = assignment_query.filter(models.Employee.location == location)
    
    active_assignments = assignment_query.all()
    assigned_employee_ids = set(a.employee_id for a in active_assignments)
    employees_with_devices = len(assigned_employee_ids)
    
    # 5. Renewal Forecast (Devices > 3 years old, filtered by location)
    # SQLite doesn't have easy date diff function in standardSQL, doing in python for simplicity
    # Assumption: purchase_date is populated.
    renewal_count = 0
    renewal_query = db.query(models.Device)
    if location and location != "all":
        renewal_query = renewal_query.filter(models.Device.location == location)
    
    all_devices_for_renewal = renewal_query.all()
    
    today = datetime.date.today()
    for d in all_devices_for_renewal:
        if d.purchase_date:
            age_years = (today - d.purchase_date).days / 365.25
            if age_years > 3:
                renewal_count += 1
                
    # 6. Low Stock Alerts (Available < 3)
    available_query = db.query(
        models.Device.device_type, 
        func.count(models.Device.id)
    ).filter(models.Device.status == models.DeviceStatus.AVAILABLE)
    
    if location and location != "all":
        available_query = available_query.filter(models.Device.location == location)
        
    available_counts = available_query.group_by(models.Device.device_type).all()
    
    available_map = {dtype: count for dtype, count in available_counts}
    low_stock = []
    # Check for all types defined in Enum
    for dtype in models.DeviceType:
        count = available_map.get(dtype, 0)
        if count < 5:
            low_stock.append({"type": dtype, "count": count})

    # 7. Unassigned Employees (Action Items)
    # Get list of employees without active assignments
    unassigned_query = db.query(models.Employee).filter(~models.Employee.id.in_(assigned_employee_ids), models.Employee.is_active == True)
    
    if location and location != "all":
        unassigned_query = unassigned_query.filter(models.Employee.location == location)
        
    unassigned_employees = unassigned_query.limit(5).all()
    unassigned_names = [e.full_name for e in unassigned_employees]

    # 8. Pending Equipment to Assign (Count of employees missing each essential equipment)
    # Group active assignments by employee to see what each has
    from collections import defaultdict
    employee_devices = defaultdict(set)
    
    # Get all employees and filter by location if provided
    all_employees = db.query(models.Employee).filter(models.Employee.is_active == True).all()
    
    # Filter employees by location if specified
    if location and location != 'all':
        employees_in_location = [e for e in all_employees if e.location == location]
    else:
        employees_in_location = all_employees
    
    employee_ids_in_location = {e.id for e in employees_in_location}
    
    # Build map of what devices each employee has
    for a in active_assignments:
        if a.device and a.employee_id in employee_ids_in_location:
            employee_devices[a.employee_id].add(a.device.device_type)
    
    # Count how many employees (in this location) are missing each essential equipment type
    essential_equipment = ['laptop', 'monitor', 'kit teclado/mouse', 'mochila', 'auriculares', 'celular']
    pending_equipment = {}
    
    # Calculate pending for ALL active employees in the location
    for equipment_type in essential_equipment:
        missing_count = 0
        for emp in employees_in_location:
            # Check laptop count specifically (ALWAYS check usage for everyone)
            if equipment_type == 'laptop':
                # Count how many laptops this employee has assigned
                owned_laptops = 0
                for a in active_assignments:
                    if a.employee_id == emp.id and a.device and a.device.device_type == 'laptop':
                        owned_laptops += 1
                
                # Check against expected count (default 1)
                expected = getattr(emp, 'expected_laptop_count', 1) or 1 # Fallback if None
                if owned_laptops < expected:
                    missing_count += (expected - owned_laptops)

            # Skip pending check for mobiles (not everyone needs one)
            # elif equipment_type == 'mobile':
            #     pass
            
            # Check specific equipment rules based on role
            elif equipment_type not in employee_devices[emp.id]:
                position = (emp.position or "").lower()
                is_chofer = "chofer" in position or "conductor" in position
                is_practicante = "practicante" in position

                # Logic per equipment type
                if equipment_type == 'celular':
                    # Practicantes do NOT need mobile
                    if not is_practicante:
                        missing_count += 1
                
                elif equipment_type in ['monitor', 'kit teclado/mouse', 'mochila', 'auriculares']:
                    # Chofers do NOT need these accessories (only laptop + mobile)
                    if not is_chofer:
                        missing_count += 1
                
                else:
                    # Default for other types -> Count as missing
                    missing_count += 1
        pending_equipment[equipment_type] = missing_count

    # 9. Comprehensive Equipment Summary filtered by location
    # Get devices assigned to employees in this location
    devices_assigned_in_location = set()
    for a in active_assignments:
        if a.employee_id in employee_ids_in_location and a.device:
            devices_assigned_in_location.add(a.device.id)
    
    equipment_summary = {}
    for equipment_type in essential_equipment:
        # Query devices of this type with location filter, EXCLUDING SOLD
        device_type_query = db.query(models.Device).filter(
            models.Device.device_type == equipment_type,
            models.Device.deleted_at == None,
            models.Device.status != models.DeviceStatus.SOLD
        )
        
        # Filter by location if specified
        if location and location != 'all':
            devices_of_type_in_location = device_type_query.filter(models.Device.location == location).all()
        else:
            devices_of_type_in_location = device_type_query.all()
        
        total_in_location = len(devices_of_type_in_location)
        
        # Assigned = devices of this type with status 'assigned' IN THIS LOCATION
        # This fixes the discrepancy where a device in this location assigned to an employee from another location wasn't counted.
        assigned = sum(1 for d in devices_of_type_in_location if d.status == models.DeviceStatus.ASSIGNED)
        
        # Available = devices of this type that are available IN THIS LOCATION
        available = sum(1 for d in devices_of_type_in_location if d.status == models.DeviceStatus.AVAILABLE)
        
        # Pending = employees in this location missing this equipment
        pending = pending_equipment.get(equipment_type, 0)
        
        # Calculate if we have enough stock to cover pending assignments
        deficit = max(0, pending - available)
        surplus = max(0, available - pending)
        
        equipment_summary[equipment_type] = {
            "total": total_in_location,
            "assigned": assigned,
            "available": available,
            "pending": pending,
            "deficit": deficit,
            "surplus": surplus,
            "covered": available >= pending
        }

    return {
        "total_devices": total_devices,
        "status_breakdown": stats_by_status,
        "type_breakdown": stats_by_type,
        "employee_stats": {
            "total": total_employees,
            "with_devices": employees_with_devices,
            "without_devices": total_employees - employees_with_devices
        },
        "alerts": {
            "renewal_needed": renewal_count,
            "low_stock": low_stock,
            "unassigned_employees": unassigned_names
        },
        "pending_equipment": pending_equipment,
        "equipment_summary": equipment_summary
    }

