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
    
    # --- 1. STOCK ALERTS (Low Inventory) ---
    LOW_STOCK_THRESHOLD = 3
    critical_devices = ['laptop', 'monitor', 'kit teclado/mouse', 'auriculares']
    
    for dev_type in critical_devices:
        count = db.query(Device).filter(
            Device.device_type == dev_type,
            Device.status == DeviceStatus.AVAILABLE
        ).count()
        
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

    # --- 2. INTEGRITY ALERTS (Data Inconsistencies) ---
    
    # Example: Employees with multiple active laptops assigned
    # Subquery to count laptops per employee
    laptop_counts = db.query(
        Assignment.employee_id, func.count(Assignment.id).label('count')
    ).join(Device).filter(
        Device.device_type == 'laptop',
        Assignment.returned_date == None
    ).group_by(Assignment.employee_id).all()
    
    for emp_id, count in laptop_counts:
        if count > 1:
            emp = db.query(Employee).get(emp_id)
            if emp:
                alerts.append({
                    "id": f"integrity-multilaptop-{emp_id}",
                    "type": "INTEGRITY",
                    "priority": "warning",
                    "title": "Múltiples Laptops Asignadas",
                    "message": f"{emp.full_name} tiene {count} laptops asignadas activamente.",
                    "action_link": f"/employees" # Ideally deep link to employee details
                })

    # --- 3. COMPLIANCE ALERTS (Missing Equipment) ---
    
    # Employees active > 7 days without LAPTOP
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    # Get all active employees created before 7 days ago
    employees = db.query(Employee).filter(
        Employee.is_active == True,
        # Assuming we can use created_at/hiring date logic, but model might not have hiring_date populated properly yet
        # checking assignments instead.
    ).all()
    
    for emp in employees:
        # Check active assignments
        has_laptop = False
        has_headphones = False
        
        # We need to query assignments because lazy loading might be slow in loop, 
        # but for now iterating is fine for small DBs. 
        # Better: Eager load assignments
        active_assignments = [a for a in emp.assignments if a.returned_date is None]
        
        for a in active_assignments:
            if a.device and a.device.device_type == 'laptop':
                has_laptop = True
            if a.device and (a.device.device_type == 'auriculares' or a.device.device_type == 'headset'):
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
