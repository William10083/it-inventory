from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime
from typing import Optional
import database, models, cache, auth

router = APIRouter()

def calculate_analytics(db: Session, location: str = None):
    """
    Calculate analytics using optimized aggregated SQL queries.
    Much faster than loading all data and filtering in Python.
    
    Args:
        db: Database session
        location: Optional location filter (e.g., 'Callao', 'Lima')
    """
    
    
    # For ASSIGNED devices, we need to count by EMPLOYEE location
    # For AVAILABLE/MAINTENANCE devices, we count by DEVICE location
    
    # First, get counts for available/maintenance devices by device.location
    available_devices_filter = and_(
        models.Device.deleted_at == None,
        or_(
            models.Device.status == 'available',
            models.Device.status == 'maintenance'
        )
    )
    
    if location:
        available_devices_filter = and_(
            available_devices_filter,
            models.Device.location == location
        )
    
    available_stats = db.query(
        models.Device.device_type,
        models.Device.status,
        func.count(models.Device.id).label('count')
    ).filter(available_devices_filter)\
     .group_by(models.Device.device_type, models.Device.status)\
     .all()
    
    # Second, get counts for ASSIGNED devices by EMPLOYEE location
    assigned_query = db.query(
        models.Device.device_type,
        func.count(models.Device.id).label('count')
    ).join(models.Assignment, models.Device.id == models.Assignment.device_id)\
     .join(models.Employee, models.Assignment.employee_id == models.Employee.id)\
     .filter(
        models.Device.deleted_at == None,
        models.Device.status == 'assigned',
        models.Assignment.returned_date == None,
        models.Employee.is_active == True
    )
    
    if location:
        assigned_query = assigned_query.filter(models.Employee.location == location)
    
    assigned_stats = assigned_query.group_by(models.Device.device_type).all()
    
    # Combine into stats_dict
    stats_dict = {}
    
    # Add available/maintenance counts
    for device_type, status, count in available_stats:
        if device_type not in stats_dict:
            stats_dict[device_type] = {}
        stats_dict[device_type][status] = count
    
    # Add assigned counts
    for device_type, count in assigned_stats:
        if device_type not in stats_dict:
            stats_dict[device_type] = {}
        stats_dict[device_type]['assigned'] = count
    
    # Helper function to get count
    def get_count(device_type, status=None):
        if device_type not in stats_dict:
            return 0
        if status is None:
            return sum(stats_dict[device_type].values())
        return stats_dict[device_type].get(status, 0)

    # Query 3: employees por location + assignments activos en UNA sola query
    # Evita 3 round-trips separados a Supabase (total_employees, by_location, total_assignments)
    emp_q = db.query(
        models.Employee.location,
        func.count(models.Employee.id).label('emp_count'),
        func.count(models.Assignment.id).label('assign_count'),
    ).outerjoin(
        models.Assignment,
        and_(
            models.Assignment.employee_id == models.Employee.id,
            models.Assignment.returned_date == None,
        )
    ).filter(models.Employee.is_active == True)

    if location:
        emp_q = emp_q.filter(models.Employee.location == location)

    emp_rows = emp_q.group_by(models.Employee.location).all()

    location_stats = {loc: emp for loc, emp, _ in emp_rows}
    total_employees = sum(emp for _, emp, _ in emp_rows)
    total_assignments = sum(assign for _, _, assign in emp_rows)
    
    return {
        # Device statistics
        "devices": {
            "laptop": {
                "total": get_count('laptop'),
                "available": get_count('laptop', 'available'),
                "assigned": get_count('laptop', 'assigned'),
                "maintenance": get_count('laptop', 'maintenance')
            },
            "monitor": {
                "total": get_count('monitor'),
                "available": get_count('monitor', 'available'),
                "assigned": get_count('monitor', 'assigned'),
                "maintenance": get_count('monitor', 'maintenance')
            },
            "celular": {
                "total": get_count('celular'),
                "available": get_count('celular', 'available'),
                "assigned": get_count('celular', 'assigned'),
                "maintenance": get_count('celular', 'maintenance')
            },
            "kit teclado/mouse": {
                "total": get_count('kit teclado/mouse'),
                "available": get_count('kit teclado/mouse', 'available'),
                "assigned": get_count('kit teclado/mouse', 'assigned')
            },
            "mochila": {
                "total": get_count('mochila'),
                "available": get_count('mochila', 'available'),
                "assigned": get_count('mochila', 'assigned')
            },
            "auriculares": {
                "total": get_count('auriculares'),
                "available": get_count('auriculares', 'available'),
                "assigned": get_count('auriculares', 'assigned')
            }
        },
        
        # Employee statistics
        "employees": {
            "total": total_employees,
            "by_location": location_stats
        },
        
        # Assignment statistics
        "assignments": {
            "total_active": total_assignments
        },
        
        # Cache metadata
        "cached_at": datetime.now().isoformat(),
        "cache_expires_in_seconds": 300,  # 5 minutes
        "filtered_by_location": location if location else "all"
    }

@router.get("/analytics/")
def get_analytics(
    location: Optional[str] = Query(None, description="Filter analytics by location (e.g., 'Callao', 'Lima')"),
    db: Session = Depends(database.get_db),
    _: models.User = Depends(auth.get_current_active_user),
):
    """
    Get analytics dashboard data with caching.
    Results are cached for 5 minutes to improve performance.
    
    Args:
        location: Optional location filter
        db: Database session
    """
    cached = cache.get_analytics(location)
    if cached:
        return cached
    result = calculate_analytics(db, location)
    cache.set_analytics(location, result)
    return result

@router.post("/analytics/refresh")
def refresh_analytics_cache(
    db: Session = Depends(database.get_db),
    _: models.User = Depends(auth.get_current_active_user),
):
    """
    Force refresh the analytics cache for all locations.
    Useful after bulk operations.
    """
    cache.invalidate_all()
    result = calculate_analytics(db)
    cache.set_analytics(None, result)
    return result
