from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func
import database, models, cache, auth
import datetime
from typing import Optional

router = APIRouter()


# ──────────────────────────────────────────────────────────────────────────────
# Endpoint
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(
    location: Optional[str] = Query(None),
    db: Session = Depends(database.get_db),
    _: models.User = Depends(auth.get_current_active_user),
):
    """
    Get inventory statistics, optionally filtered by location.

    Optimisations vs. original:
    - Renewal count: SQL date filter instead of loading all devices in Python
    - Employee list: SQL location filter instead of Python list comprehension
    - Pending equipment: selectinload (1 query) + O(N) Python — no nested loops
    - Equipment summary: 1 GROUP BY query instead of 6 separate queries
    - Result: ~6 queries total vs. 20+ in the original
    """

    # Check cache first
    cached = cache.get_stats(location)
    if cached:
        return cached

    loc_filter = bool(location and location != "all")

    # ── 1. Total Assets (non-sold, non-deleted) ────────────────────────────
    base_device_filter = [
        models.Device.deleted_at == None,
        models.Device.status != models.DeviceStatus.SOLD,
    ]
    if loc_filter:
        base_device_filter.append(models.Device.location == location)

    total_devices = db.query(func.count(models.Device.id)).filter(*base_device_filter).scalar() or 0

    # ── 2. Status Breakdown — single GROUP BY ─────────────────────────────
    status_q = db.query(
        models.Device.status,
        func.count(models.Device.id)
    ).filter(*base_device_filter).group_by(models.Device.status)
    stats_by_status = {s: c for s, c in status_q.all()}

    # ── 3. Type Breakdown — single GROUP BY ───────────────────────────────
    type_q = db.query(
        models.Device.device_type,
        func.count(models.Device.id)
    ).filter(*base_device_filter).group_by(models.Device.device_type)
    stats_by_type = {t: c for t, c in type_q.all()}

    # ── 4. Employees + Assignments + Devices — ONE selectinload query ──────
    #  This eliminates N+1 completely: all assignments and their devices
    #  are fetched with a single IN subquery per relationship level.
    emp_q = db.query(models.Employee).options(
        selectinload(models.Employee.assignments).selectinload(models.Assignment.device)
    ).filter(
        models.Employee.is_active == True,
        models.Employee.deleted_at == None,
    )
    if loc_filter:
        emp_q = emp_q.filter(models.Employee.location == location)
    employees_in_location = emp_q.all()

    total_employees = len(employees_in_location)

    # Build per-employee active device map entirely from loaded data (0 extra queries)
    employee_devices: dict[int, tuple[set, int]] = {}
    for emp in employees_in_location:
        types: set[str] = set()
        laptop_count = 0
        for a in emp.assignments:
            if a.returned_date is None and a.device:
                types.add(a.device.device_type)
                if a.device.device_type == "laptop":
                    laptop_count += 1
        employee_devices[emp.id] = (types, laptop_count)

    employees_with_devices = sum(1 for types, _ in employee_devices.values() if types)

    # ── 5. Renewal Count — SQL date filter (no Python loop over all devices) ─
    three_years_ago = datetime.date.today() - datetime.timedelta(days=3 * 365)
    renewal_q = db.query(func.count(models.Device.id)).filter(
        models.Device.deleted_at == None,
        models.Device.status != models.DeviceStatus.SOLD,
        models.Device.purchase_date != None,
        models.Device.purchase_date < three_years_ago,
    )
    if loc_filter:
        renewal_q = renewal_q.filter(models.Device.location == location)
    renewal_count = renewal_q.scalar() or 0

    # ── 6. Low Stock Alerts — single GROUP BY ─────────────────────────────
    avail_q = db.query(
        models.Device.device_type,
        func.count(models.Device.id)
    ).filter(models.Device.status == models.DeviceStatus.AVAILABLE)
    if loc_filter:
        avail_q = avail_q.filter(models.Device.location == location)
    available_map = {t: c for t, c in avail_q.group_by(models.Device.device_type).all()}
    low_stock = [
        {"type": dtype, "count": available_map.get(dtype, 0)}
        for dtype in models.DeviceType
        if available_map.get(dtype, 0) < 5
    ]

    # ── 7. Unassigned employees (from already-loaded data) ─────────────────
    assigned_emp_ids = {eid for eid, (types, _) in employee_devices.items() if types}
    unassigned_names = [
        emp.full_name for emp in employees_in_location
        if emp.id not in assigned_emp_ids
    ][:5]

    # ── 8. Pending Equipment — O(N) Python, 0 extra queries ───────────────
    essential_equipment = ["laptop", "monitor", "kit teclado/mouse", "mochila", "auriculares", "celular"]
    pending_equipment = {eq: 0 for eq in essential_equipment}

    for emp in employees_in_location:
        position = (emp.position or "").lower()
        is_chofer = "chofer" in position or "conductor" in position
        is_practicante = "practicante" in position
        types, owned_laptops = employee_devices.get(emp.id, (set(), 0))

        # Laptops: can expect more than 1
        expected = emp.expected_laptop_count or 1
        if owned_laptops < expected:
            pending_equipment["laptop"] += expected - owned_laptops

        # Accessories (choferes only need laptop + celular)
        for eq in ["monitor", "kit teclado/mouse", "mochila", "auriculares"]:
            if eq not in types and not is_chofer:
                pending_equipment[eq] += 1

        # Celular (practicantes no necesitan)
        if "celular" not in types and not is_practicante:
            pending_equipment["celular"] += 1

    # ── 9. Equipment Summary — 1 GROUP BY instead of 6 separate queries ───
    ts_raw = db.query(
        models.Device.device_type,
        models.Device.status,
        func.count(models.Device.id).label("count"),
    ).filter(
        models.Device.device_type.in_(essential_equipment),
        models.Device.deleted_at == None,
        models.Device.status != models.DeviceStatus.SOLD,
    )
    if loc_filter:
        ts_raw = ts_raw.filter(models.Device.location == location)
    ts_raw = ts_raw.group_by(models.Device.device_type, models.Device.status).all()

    ts_map: dict[str, dict[str, int]] = {}
    for dtype, status, count in ts_raw:
        ts_map.setdefault(dtype, {})[status] = count

    equipment_summary = {}
    for eq in essential_equipment:
        eq_map = ts_map.get(eq, {})
        total_eq = sum(eq_map.values())
        assigned_eq = eq_map.get(models.DeviceStatus.ASSIGNED, 0)
        available_eq = eq_map.get(models.DeviceStatus.AVAILABLE, 0)
        pending_eq = pending_equipment.get(eq, 0)
        equipment_summary[eq] = {
            "total": total_eq,
            "assigned": assigned_eq,
            "available": available_eq,
            "pending": pending_eq,
            "deficit": max(0, pending_eq - available_eq),
            "surplus": max(0, available_eq - pending_eq),
            "covered": available_eq >= pending_eq,
        }

    result = {
        "total_devices": total_devices,
        "status_breakdown": stats_by_status,
        "type_breakdown": stats_by_type,
        "employee_stats": {
            "total": total_employees,
            "with_devices": employees_with_devices,
            "without_devices": total_employees - employees_with_devices,
        },
        "alerts": {
            "renewal_needed": renewal_count,
            "low_stock": low_stock,
            "unassigned_employees": unassigned_names,
        },
        "pending_equipment": pending_equipment,
        "equipment_summary": equipment_summary,
    }

    cache.set_stats(location, result)
    return result
