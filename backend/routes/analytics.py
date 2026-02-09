from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
from typing import Optional
import database, models

router = APIRouter()

# Simple in-memory cache (5 minutes TTL) - now supports multiple locations
_analytics_cache = {}

def get_cached_analytics(db: Session, location: Optional[str] = None):
    """
    Get analytics with caching to avoid recalculating frequently.
    Cache expires after 5 minutes.
    Separate cache entries for each location.
    """
    now = datetime.now()
    cache_key = location if location else "all"
    
    # Check if cache is valid for this location
    if (cache_key in _analytics_cache and 
        _analytics_cache[cache_key]["data"] is not None and 
        _analytics_cache[cache_key]["timestamp"] is not None and 
        now - _analytics_cache[cache_key]["timestamp"] < timedelta(minutes=5)):
        return _analytics_cache[cache_key]["data"]
    
    # Calculate analytics using aggregated queries
    analytics = calculate_analytics(db, location)
    
    # Update cache for this location
    _analytics_cache[cache_key] = {
        "data": analytics,
        "timestamp": now
    }
    
    return analytics

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
    
    # Employee statistics - filter by location if specified
    employee_filter = models.Employee.is_active == True
    if location:
        employee_filter = and_(employee_filter, models.Employee.location == location)
    
    total_employees = db.query(func.count(models.Employee.id))\
        .filter(employee_filter)\
        .scalar() or 0
    
    # Employees by location
    employees_by_location = db.query(
        models.Employee.location,
        func.count(models.Employee.id).label('count')
    ).filter(models.Employee.is_active == True)
    
    # If filtering by location, only show that location
    if location:
        employees_by_location = employees_by_location.filter(models.Employee.location == location)
    
    employees_by_location = employees_by_location.group_by(models.Employee.location).all()
    
    location_stats = {loc: count for loc, count in employees_by_location}
    
    # Assignment statistics - filter by employee location if specified
    assignment_filter = models.Assignment.returned_date == None
    if location:
        # Join with employees to filter by location
        total_assignments = db.query(func.count(models.Assignment.id))\
            .join(models.Employee, models.Assignment.employee_id == models.Employee.id)\
            .filter(
                assignment_filter,
                models.Employee.location == location
            ).scalar() or 0
    else:
        total_assignments = db.query(func.count(models.Assignment.id))\
            .filter(assignment_filter)\
            .scalar() or 0
    
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
    db: Session = Depends(database.get_db)
):
    """
    Get analytics dashboard data with caching.
    Results are cached for 5 minutes to improve performance.
    
    Args:
        location: Optional location filter
        db: Database session
    """
    return get_cached_analytics(db, location)

@router.post("/analytics/refresh")
def refresh_analytics_cache(db: Session = Depends(database.get_db)):
    """
    Force refresh the analytics cache for all locations.
    Useful after bulk operations.
    """
    global _analytics_cache
    _analytics_cache = {}
    return get_cached_analytics(db)
