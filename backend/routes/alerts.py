from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Device, Employee, Assignment, DeviceStatus, DeviceType
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy import func

router = APIRouter(prefix="/alerts")

@router.get("/", response_model=List[Dict[str, Any]])
def get_alerts(db: Session = Depends(get_db)):
    alerts = []
    
    # --- 1. STOCK ALERTS (Optimized) ---
    LOW_STOCK_THRESHOLD = 3
    critical_devices = ['laptop', 'monitor', 'kit teclado/mouse', 'auriculares', 'mochila']
    
    # Optimized: Single query to get counts for all active device types
    stock_counts = db.query(
        Device.device_type, func.count(Device.id)
    ).filter(
        Device.device_type.in_(critical_devices),
        Device.status == DeviceStatus.AVAILABLE
    ).group_by(Device.device_type).all()
    
    # Convert to dict for O(1) lookup
    counts_map = {item[0]: item[1] for item in stock_counts}
    
    for dev_type in critical_devices:
        count = counts_map.get(dev_type, 0)
        
        if count < LOW_STOCK_THRESHOLD:
            priority = "critical" if count == 0 else "warning"
            alerts.append({
                "id": f"stock-{dev_type}",
                "type": "STOCK",
                "priority": priority,
                "title": f"Stock bajo de {dev_type.upper()}",
                "message": f"Solo quedan {count} unidades disponibles.",
                "action_link": "/inventory"
            })

    # --- 2. INTEGRITY ALERTS (Optimized) ---
    
    # Optimized: Get employees with > 1 laptop in a single query + join
    # We find duplicate assignments first
    from sqlalchemy.orm import aliased
    
    # Subquery for laptop counts
    laptop_counts = db.query(
        Assignment.employee_id, func.count(Assignment.id).label('count')
    ).join(Device).filter(
        Device.device_type == 'laptop',
        Assignment.returned_date == None
    ).group_by(Assignment.employee_id).having(func.count(Assignment.id) > 1).all()
    
    if laptop_counts:
        # Get all affected employee IDs
        emp_ids = [r.employee_id for r in laptop_counts]
        # Bulk fetch employees
        employees_map = {
            e.id: e for e in db.query(Employee).filter(Employee.id.in_(emp_ids)).all()
        }
        
        for emp_id, count in laptop_counts:
            emp = employees_map.get(emp_id)
            if emp:
                alerts.append({
                    "id": f"integrity-multilaptop-{emp_id}",
                    "type": "INTEGRITY",
                    "priority": "warning",
                    "title": "Múltiples Laptops Asignadas",
                    "message": f"{emp.full_name} tiene {count} laptops asignadas activamente.",
                    "action_link": f"/employees/{emp.id}"
                })

    # --- 3. COMPLIANCE ALERTS (Optimized) ---
    
    # Optimized: Eager load assignments and devices to avoid N+1 loop
    from sqlalchemy.orm import joinedload
    
    # Filter only active employees to reduce set
    active_employees = db.query(Employee).options(
        joinedload(Employee.assignments).joinedload(Assignment.device)
    ).filter(
        Employee.is_active == True
    ).all()
    
    for emp in active_employees:
        # In-memory checks (fast because data is preloaded)
        has_laptop = False
        has_headphones = False
        
        active_assignments = [a for a in emp.assignments if a.returned_date is None]
        
        for a in active_assignments:
            if not a.device:
                continue
            if a.device.device_type == 'laptop':
                has_laptop = True
            elif a.device.device_type in ['auriculares', 'headset']:
                has_headphones = True
        
        if not has_laptop:
             alerts.append({
                "id": f"compliance-nolaptop-{emp.id}",
                "type": "COMPLIANCE",
                "priority": "critical",
                "title": "Empleado sin Laptop",
                "message": f"{emp.full_name} está activo pero no tiene laptop asignada.",
                "action_link": "/assignments"
            })
            
        if not has_headphones:
             alerts.append({
                "id": f"compliance-noheadphones-{emp.id}",
                "type": "COMPLIANCE",
                "priority": "suggestion",
                "title": "Faltan Auriculares",
                "message": f"{emp.full_name} no tiene auriculares asignados.",
                "action_link": "/assignments"
            })

    return alerts
