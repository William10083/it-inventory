from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from collections import defaultdict
from typing import Optional
import database, models, cache, auth

router = APIRouter()

ESSENTIAL_EQUIPMENT = ['laptop', 'monitor', 'kit teclado/mouse', 'mochila', 'auriculares', 'celular']
EQUIPMENT_LABELS = {
    'laptop': 'Laptops',
    'monitor': 'Monitores',
    'kit teclado/mouse': 'Kits',
    'mochila': 'Mochilas',
    'auriculares': 'Auriculares',
    'celular': 'Celulares',
}


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def employee_needs(emp):
    """Returns which equipment types this employee needs based on their role."""
    position = (emp.position or '').lower()
    is_chofer = 'chofer' in position or 'conductor' in position
    is_practicante = 'practicante' in position
    needs = ['laptop']
    if not is_chofer:
        needs += ['monitor', 'kit teclado/mouse', 'mochila', 'auriculares']
    if not is_practicante:
        needs.append('celular')
    return needs


# ──────────────────────────────────────────────────────────────────────────────
# Endpoint
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/analytics/powerbi")
def get_powerbi_data(
    location: Optional[str] = Query(None, description="Filtrar por sede (ej. 'Callao', 'Lima')"),
    db: Session = Depends(database.get_db),
    _: models.User = Depends(auth.get_current_active_user),
):
    """
    Power BI executive dashboard data.
    - Cached for 10 minutes per location to avoid recomputing expensive aggregations.
    - Supports optional ?location= filter for all metrics.
    """
    cached = cache.get_powerbi(location)
    if cached:
        return cached

    loc_filter = bool(location and location != 'all')

    # ── 1. Assignments by month (last 12 months) ───────────────────────────
    monthly_q = db.query(
        func.to_char(models.Assignment.assigned_date, 'YYYY-MM').label('month'),
        func.count(models.Assignment.id).label('count')
    ).filter(models.Assignment.assigned_date != None)

    if loc_filter:
        monthly_q = monthly_q.join(models.Employee).filter(
            models.Employee.location == location,
            models.Employee.is_active == True,
        )

    monthly_raw = monthly_q.group_by('month').order_by('month').all()
    assignments_by_month = [{"month": r.month, "asignaciones": r.count} for r in monthly_raw[-12:]]

    # ── 2. Device type distribution (active) ──────────────────────────────
    type_q = db.query(
        models.Device.device_type,
        func.count(models.Device.id).label('count')
    ).filter(
        models.Device.deleted_at == None,
        models.Device.status != 'sold',
    )
    if loc_filter:
        type_q = type_q.filter(models.Device.location == location)

    type_raw = type_q.group_by(models.Device.device_type).all()
    type_distribution = [
        {"name": EQUIPMENT_LABELS.get(r.device_type, r.device_type), "value": r.count}
        for r in type_raw
    ]

    # ── 3. Load employees + assignments + devices in ONE query ─────────────
    #  joinedload → 1 extra IN query per relationship level (not N queries)
    emp_q = db.query(models.Employee).options(
        joinedload(models.Employee.assignments).joinedload(models.Assignment.device)
    ).filter(
        models.Employee.is_active == True,
        models.Employee.deleted_at == None,
    )
    if loc_filter:
        emp_q = emp_q.filter(models.Employee.location == location)
    employees = emp_q.all()

    # ── 4. Coverage by location (heatmap) — from loaded data ──────────────
    location_map: dict[str, list] = defaultdict(list)
    for emp in employees:
        loc = emp.location or 'Sin Sede'
        location_map[loc].append(emp)

    coverage_by_location = []
    for loc, emps in sorted(location_map.items(), key=lambda x: -len(x[1])):
        row = {"location": loc, "total_employees": len(emps)}
        for eq in ESSENTIAL_EQUIPMENT:
            needs_eq = [e for e in emps if eq in employee_needs(e)]
            if not needs_eq:
                row[eq] = None
                continue
            has_eq = sum(
                1 for e in needs_eq
                if any(
                    a.returned_date is None and a.device and a.device.device_type == eq
                    for a in e.assignments
                )
            )
            row[eq] = round((has_eq / len(needs_eq)) * 100) if needs_eq else 0
        coverage_by_location.append(row)

    # ── 5. Top equipped employees — from loaded data ───────────────────────
    emp_data = []
    for emp in employees:
        active = [a for a in emp.assignments if a.returned_date is None and a.device]
        if active:
            emp_data.append({
                "name": emp.full_name,
                "location": emp.location or '-',
                "position": emp.position or '-',
                "device_count": len(active),
                "devices": [a.device.device_type for a in active],
            })
    top_equipped_employees = sorted(emp_data, key=lambda x: -x['device_count'])[:10]

    # ── 6. Status breakdown ────────────────────────────────────────────────
    status_q = db.query(
        models.Device.status,
        func.count(models.Device.id).label('count')
    ).filter(models.Device.deleted_at == None)
    if loc_filter:
        status_q = status_q.filter(models.Device.location == location)
    status_raw = status_q.group_by(models.Device.status).all()
    status_breakdown = [{"status": r.status, "count": r.count} for r in status_raw]

    # ── 7. KPIs — reuse already-loaded employees data where possible ───────
    total_employees = len(employees)

    # total_active_devices: single scalar query (not derivable from employee list)
    active_dev_q = db.query(func.count(models.Device.id)).filter(
        models.Device.deleted_at == None,
        models.Device.status != 'sold',
    )
    if loc_filter:
        active_dev_q = active_dev_q.filter(models.Device.location == location)
    total_active_devices = active_dev_q.scalar() or 0

    # complete_employees: from already-loaded data
    complete_employees = sum(
        1 for emp in employees
        if all(
            any(a.returned_date is None and a.device and a.device.device_type == eq for a in emp.assignments)
            for eq in employee_needs(emp)
        )
    )
    coverage_pct = round((complete_employees / total_employees) * 100, 1) if total_employees else 0

    # assignment_rate: reuse status_breakdown counts
    assigned_count = next((r['count'] for r in status_breakdown if r['status'] == 'assigned'), 0)
    assignment_rate = round((assigned_count / total_active_devices) * 100, 1) if total_active_devices else 0

    result = {
        "kpis": {
            "total_active_devices": total_active_devices,
            "total_employees": total_employees,
            "complete_employees": complete_employees,
            "coverage_pct": coverage_pct,
            "assignment_rate": assignment_rate,
        },
        "assignments_by_month": assignments_by_month,
        "type_distribution": type_distribution,
        "coverage_by_location": coverage_by_location,
        "top_equipped_employees": top_equipped_employees,
        "status_breakdown": status_breakdown,
    }

    cache.set_powerbi(location, result)
    return result
