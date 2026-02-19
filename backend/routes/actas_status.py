from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta
import database, models

router = APIRouter()

@router.get("/actas-status/")
def get_actas_status(
    status_filter: Optional[str] = None,  # 'signed', 'pending', 'all'
    search: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """
    Get status of all actas (signed and pending) for:
    - Assignment Computer (laptop, monitor, keyboard, mouse, etc.)
    - Assignment Mobile (mobile, chip, charger)
    - Sales
    - Terminations (computer and mobile)
    """
    
    # 1. OPTIMIZED: Get all active employees with eager loaded assignments and devices
    # This avoids N+1 queries for assignments and looking up devices
    active_employees = db.query(models.Employee).options(
        joinedload(models.Employee.assignments).joinedload(models.Assignment.device)
    ).filter(
        models.Employee.is_active == True
    ).all()
    
    # 2. OPTIMIZED: Pre-fetch all relevant sales
    # Get list of employee names to query sales in bulk
    emp_names = [e.full_name for e in active_employees if e.full_name]
    
    all_sales = []
    if emp_names:
        all_sales = db.query(models.Sale).filter(
            models.Sale.buyer_name.in_(emp_names)
        ).all()
    
    # Map sales to employee name for O(1) lookup
    sales_map = {}
    for sale in all_sales:
        if sale.buyer_name not in sales_map:
            sales_map[sale.buyer_name] = []
        sales_map[sale.buyer_name].append(sale)

    assignment_computer_data = []
    assignment_mobile_data = []
    sales_data = []
    
    for emp in active_employees:
        # Apply search filter
        if search and search.lower() not in emp.full_name.lower():
            continue
        
        # Get active assignments (not returned)
        # Data is already loaded, so this is fast
        active_assignments = [a for a in emp.assignments if not a.returned_date]
        
        if not active_assignments:
            # Even if no active assignments, we might check for past actas? 
            # Original logic continues if not active_assignments, but let's check adherence.
            # strict reading of original code: 
            # "if not active_assignments: continue"
            # So we keep that behavior.
            if not sales_map.get(emp.full_name): # Optimization: check if they have sales even if no assignments? 
                # Original code logic: checking sales was separate loop?
                # Actually original code continued ONLY if empty assignments loop. 
                # Wait, original code structure:
                # for emp in active_employees:
                #    if search... continue
                #    active_assignments = ...
                #    if not active_assignments: continue
                #    ... logic for assignments ...
                #    ... logic for sales ...
                # Wait, if `if not active_assignments: continue` executes, it SKIPS sales check!
                # That looks like a bug in the original code or intentional. 
                # "Get status of all actas... Sales..." 
                # If an employee has a sale but no active assignment, they wouldn't show up?
                # I will preserve original behavior to avoid regressions even if it looks odd.
                pass
            
        if not active_assignments:
             continue
        
        # Categorize assignments by device type
        computer_assignments = []
        mobile_assignments = []
        
        for assignment in active_assignments:
            # Device is eager loaded! No query needed.
            device = assignment.device
            
            if not device:
                continue
            
            device_type = device.device_type
            
            # Computer devices
            if device_type in ['laptop', 'monitor', 'kit teclado/mouse', 'mochila', 
                             'auriculares', 'stand', 'keyboard', 'mouse']:
                computer_assignments.append(assignment)
            # Mobile devices
            elif device_type in ['celular', 'chip', 'charger']:
                mobile_assignments.append(assignment)
        
        # Check for COMPUTER acta
        if computer_assignments:
            # Check if ANY assignment has an acta (including past assignments)
            computer_acta = None
            for assignment in emp.assignments:  # Check ALL assignments, not just active
                if assignment.pdf_acta_path:
                    # Verify it's a computer device
                    # Device IS eager loaded for ALL assignments in the relationship
                    device = assignment.device
                    if device and device.device_type in ['laptop', 'monitor', 'kit teclado/mouse', 
                                                         'mochila', 'auriculares', 'stand', 'keyboard', 'mouse']:
                        computer_acta = assignment
                        break
            
            # Use most recent computer assignment for date
            most_recent_computer = max(computer_assignments, key=lambda a: a.assigned_date)
            has_computer_acta = bool(computer_acta)
            days_pending_computer = (datetime.utcnow() - most_recent_computer.assigned_date).days if not has_computer_acta else None
            
            # Apply status filter
            add_record = True
            if status_filter == 'signed' and not has_computer_acta:
                add_record = False
            elif status_filter == 'pending' and has_computer_acta:
                add_record = False
            
            if add_record:
                assignment_computer_data.append({
                    'employee_id': emp.id,
                    'employee_name': emp.full_name,
                    'employee_email': emp.email,
                    'employee_location': emp.location,
                    'assignment_id': computer_acta.id if computer_acta else most_recent_computer.id,
                    'assignment_date': most_recent_computer.assigned_date,
                    'has_acta': has_computer_acta,
                    'acta_path': computer_acta.pdf_acta_path if computer_acta else None,
                    'days_pending': days_pending_computer,
                    'type': 'assignment_computer'
                })
        
        # Check for MOBILE acta
        if mobile_assignments:
            # Check if ANY assignment has an acta (including past assignments)
            mobile_acta = None
            for assignment in emp.assignments:  # Check ALL assignments, not just active
                if assignment.pdf_acta_path:
                    # Device already loaded
                    device = assignment.device
                    if device and device.device_type in ['celular', 'chip', 'charger']:
                        mobile_acta = assignment
                        break
            
            # Use most recent mobile assignment for date
            most_recent_mobile = max(mobile_assignments, key=lambda a: a.assigned_date)
            has_mobile_acta = bool(mobile_acta)
            days_pending_mobile = (datetime.utcnow() - most_recent_mobile.assigned_date).days if not has_mobile_acta else None
            
            # Apply status filter
            add_record = True
            if status_filter == 'signed' and not has_mobile_acta:
                add_record = False
            elif status_filter == 'pending' and has_mobile_acta:
                add_record = False
            
            if add_record:
                # Special Logic Refined:
                # - Practicantes: NO need mobile acta (skip mobile)
                # - Chofers/Conductors: DO need mobile acta (they have phones)
                
                position = (emp.position or "").lower()
                is_practicante = "practicante" in position

                # If filter is 'pending' (or all) and they have no acta BUT are practicante -> SCIP
                if not has_mobile_acta and is_practicante:
                    pass # Don't add to list (Practicantes don't need mobile acta)
                else:
                    assignment_mobile_data.append({
                        'employee_id': emp.id,
                        'employee_name': emp.full_name,
                        'employee_email': emp.email,
                        'employee_location': emp.location,
                        'assignment_id': mobile_acta.id if mobile_acta else most_recent_mobile.id,
                        'assignment_date': most_recent_mobile.assigned_date,
                        'has_acta': has_mobile_acta,
                        'acta_path': mobile_acta.pdf_acta_path if mobile_acta else None,
                        'days_pending': days_pending_mobile,
                        'type': 'assignment_mobile'
                    })
        
        # Check for SALES acta
        # Use our pre-fetched map
        emp_sales = sales_map.get(emp.full_name, [])
        
        for sale in emp_sales:
            has_sale_acta = bool(sale.acta_path)
            days_pending_sale = (datetime.utcnow() - sale.sale_date).days if not has_sale_acta else None
            
            # Apply status filter
            if status_filter == 'signed' and not has_sale_acta:
                continue
            if status_filter == 'pending' and has_sale_acta:
                continue
            
            sales_data.append({
                'employee_id': emp.id,
                'employee_name': emp.full_name,
                'employee_email': emp.email,
                'employee_location': emp.location,
                'sale_id': sale.id,
                'sale_date': sale.sale_date,
                'has_acta': has_sale_acta,
                'acta_path': sale.acta_path,
                'days_pending': days_pending_sale,
                'type': 'sale'
            })
    
    # 3. OPTIMIZED: Get all terminations with eager loading
    terminations = db.query(models.Termination).options(
        joinedload(models.Termination.returned_assignments).joinedload(models.Assignment.device),
        joinedload(models.Termination.employee)
    ).all()
    
    terminations_data = []
    for term in terminations:
        employee = term.employee
        
        # Apply search filter
        if search and search.lower() not in employee.full_name.lower():
            continue
        
        # Check computer acta
        has_computer_acta = bool(term.computer_acta_path)
        has_mobile_acta = bool(term.mobile_acta_path)
        
        # Check if termination has computer or mobile devices
        assignments = term.returned_assignments
        # Data is pre-loaded
        has_computer_devices = any(
            a.device and a.device.device_type in ['laptop', 'monitor', 'keyboard', 'mouse', 'kit teclado/mouse', 'mochila', 'stand']
            for a in assignments
        )
        has_mobile_devices = any(
            a.device and a.device.device_type in ['celular', 'chip', 'charger']
            for a in assignments
        )
        
        days_pending_computer = (datetime.utcnow() - term.termination_date).days if has_computer_devices and not has_computer_acta else None
        days_pending_mobile = (datetime.utcnow() - term.termination_date).days if has_mobile_devices and not has_mobile_acta else None
        
        # Add computer acta entry if applicable
        if has_computer_devices:
            # Apply status filter
            add_term = True
            if status_filter == 'signed' and not has_computer_acta:
                add_term = False
            elif status_filter == 'pending' and has_computer_acta:
                add_term = False
            
            if add_term:
                terminations_data.append({
                    'employee_id': employee.id,
                    'employee_name': employee.full_name,
                    'employee_email': employee.email,
                    'employee_location': employee.location,
                    'termination_id': term.id,
                    'termination_date': term.termination_date,
                    'has_acta': has_computer_acta,
                    'acta_path': term.computer_acta_path,
                    'days_pending': days_pending_computer,
                    'type': 'termination_computer'
                })
        
        # Add mobile acta entry if applicable
        if has_mobile_devices:
            # Apply status filter
            add_term = True
            if status_filter == 'signed' and not has_mobile_acta:
                add_term = False
            elif status_filter == 'pending' and has_mobile_acta:
                add_term = False
            
            if add_term:
                terminations_data.append({
                    'employee_id': employee.id,
                    'employee_name': employee.full_name,
                    'employee_email': employee.email,
                    'employee_location': employee.location,
                    'termination_id': term.id,
                    'termination_date': term.termination_date,
                    'has_acta': has_mobile_acta,
                    'acta_path': term.mobile_acta_path,
                    'days_pending': days_pending_mobile,
                    'type': 'termination_mobile'
                })
    
    # Calculate summary
    assignment_computer_signed = sum(1 for a in assignment_computer_data if a['has_acta'])
    assignment_mobile_signed = sum(1 for a in assignment_mobile_data if a['has_acta'])
    sales_signed = sum(1 for s in sales_data if s['has_acta'])
    terminations_signed = sum(1 for t in terminations_data if t['has_acta'])
    
    assignment_computer_total = len(assignment_computer_data)
    assignment_mobile_total = len(assignment_mobile_data)
    sales_total = len(sales_data)
    terminations_total = len(terminations_data)
    
    return {
        'assignment_computer': assignment_computer_data,
        'assignment_mobile': assignment_mobile_data,
        'sales': sales_data,
        'terminations': terminations_data,
        'summary': {
            'assignment_computer_signed': assignment_computer_signed,
            'assignment_computer_total': assignment_computer_total,
            'assignment_computer_pending': assignment_computer_total - assignment_computer_signed,
            
            'assignment_mobile_signed': assignment_mobile_signed,
            'assignment_mobile_total': assignment_mobile_total,
            'assignment_mobile_pending': assignment_mobile_total - assignment_mobile_signed,
            
            'sales_signed': sales_signed,
            'sales_total': sales_total,
            'sales_pending': sales_total - sales_signed,
            
            'terminations_signed': terminations_signed,
            'terminations_total': terminations_total,
            'terminations_pending': terminations_total - terminations_signed,
            
            'total_signed': assignment_computer_signed + assignment_mobile_signed + sales_signed + terminations_signed,
            'total': assignment_computer_total + assignment_mobile_total + sales_total + terminations_total,
            'total_pending': (assignment_computer_total - assignment_computer_signed) + 
                           (assignment_mobile_total - assignment_mobile_signed) + 
                           (sales_total - sales_signed) + 
                           (terminations_total - terminations_signed)
        }
    }

import io
import zipfile
import os
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

@router.get("/actas-status/export-zip")
def export_actas_zip(
    status_filter: Optional[str] = 'signed',  # Default to signed for zip export
    search: Optional[str] = None,
    location_filter: Optional[str] = 'all',
    type_filter: Optional[str] = Query(None), # Comma separated list of types
    token: Optional[str] = Query(None),
    db: Session = Depends(database.get_db)
):
    """
    Export filter actas as a ZIP file.
    Naming format: ACTA DE ENTREGA EQUIPO COMPUTO - {USUARIO} - {DD-MM-AAAA}.pdf
    """
    
    # Files to archive: list of tuples (file_path, archive_name)
    files_to_archive = []
    
    # Parse type filters
    allowed_types = []
    if type_filter:
        allowed_types = type_filter.split(',')
    
    # Helper to check if type is allowed
    def is_type_allowed(label):
        if not allowed_types: return True
        return label in allowed_types

    # 1. Employees query
    query = db.query(models.Employee).options(
        joinedload(models.Employee.assignments).joinedload(models.Assignment.device)
    ).filter(models.Employee.is_active == True)
    
    # Apply location filter at DB level if possible, or python level if flexible match needed
    # Frontend logic: loc.includes(filter)
    if location_filter and location_filter != 'all':
        query = query.filter(models.Employee.location.ilike(f"%{location_filter}%"))
        
    active_employees = query.all()
    
    # Pre-fetch sales for these employees
    emp_names = [e.full_name for e in active_employees if e.full_name]
    sales_map = {}
    if emp_names:
        sales = db.query(models.Sale).filter(models.Sale.buyer_name.in_(emp_names)).all()
        for s in sales:
            if s.buyer_name not in sales_map: sales_map[s.buyer_name] = []
            sales_map[s.buyer_name].append(s)
            
    # Helper to check if file exists and add to list
    def add_file(path, user_name, date_obj, prefix="ACTA DE ENTREGA EQUIPO COMPUTO"):
        if not path or not os.path.exists(path):
            return
            
        date_str = date_obj.strftime("%d-%m-%Y") if date_obj else "SIN-FECHA"
        filename = f"{prefix} - {user_name} - {date_str}.pdf"
        
        # Ensure unique filename in archive
        # Check current list
        count = 1
        original_filename = filename
        while any(f[1] == filename for f in files_to_archive):
             filename = f"{original_filename[:-4]}_{count}.pdf"
             count += 1
             
        files_to_archive.append((path, filename))

    for emp in active_employees:
        # Search filter
        if search and search.lower() not in emp.full_name.lower():
            continue
            
        # Assignments
        # We need to find the ACTA path. 
        # Logic similar to get_actas_status: find valid acta path.
        
        # Computer Acta
        # Filter check: 'Asignación - Cómputo'
        if is_type_allowed('Asignación - Cómputo'):
            computer_acta_path = None
            computer_date = None
            for a in emp.assignments:
                if a.pdf_acta_path:
                    d = a.device
                    if d and d.device_type in ['laptop', 'monitor', 'kit teclado/mouse', 'mochila', 'auriculares', 'stand', 'keyboard', 'mouse']:
                        computer_acta_path = a.pdf_acta_path
                        computer_date = a.assigned_date
                        break 
            
            if computer_acta_path and (status_filter in ['all', 'signed']):
                 add_file(computer_acta_path, emp.full_name, computer_date, "ACTA DE ENTREGA EQUIPO COMPUTO")

        # Mobile Acta
        # Filter check: 'Asignación - Celular'
        if is_type_allowed('Asignación - Celular'):
            mobile_acta_path = None
            mobile_date = None
            for a in emp.assignments:
                if a.pdf_acta_path:
                    d = a.device
                    if d and d.device_type in ['celular', 'chip', 'charger']:
                        mobile_acta_path = a.pdf_acta_path
                        mobile_date = a.assigned_date
                        break
                        
            if mobile_acta_path and (status_filter in ['all', 'signed']):
                 add_file(mobile_acta_path, emp.full_name, mobile_date, "ACTA DE ENTREGA EQUIPO COMPUTO (MOVIL)") 
             
        # Sales
        # Filter check: 'Venta'
        if is_type_allowed('Venta'):
            for sale in sales_map.get(emp.full_name, []):
                if sale.acta_path and (status_filter in ['all', 'signed']):
                     add_file(sale.acta_path, sale.buyer_name, sale.sale_date, "ACTA DE VENTA")

    # Terminations (Assignments returned)
    # Reuse query filter if location applies to active employees (Terminated employees are NOT active usually).
    # Logic in get_actas_status queries Terminations separately. We need to do the same.
    
    term_query = db.query(models.Termination).options(
        joinedload(models.Termination.returned_assignments),
        joinedload(models.Termination.employee)
    )
    
    # Apply location filter to terminations (by employee location at time of termination? or current?)
    # Termination has 'employee' relation.
    if location_filter and location_filter != 'all':
        term_query = term_query.join(models.Employee).filter(models.Employee.location.ilike(f"%{location_filter}%"))
        
    terminations = term_query.all()
    
    for term in terminations:
        employee = term.employee
        if search and search.lower() not in employee.full_name.lower():
            continue
            
        if status_filter in ['all', 'signed']:
            if term.computer_acta_path and is_type_allowed('Cese - Cómputo'):
                add_file(term.computer_acta_path, employee.full_name, term.termination_date, "ACTA DE CESE COMPUTO")
            if term.mobile_acta_path and is_type_allowed('Cese - Celular'):
                add_file(term.mobile_acta_path, employee.full_name, term.termination_date, "ACTA DE CESE MOVIL")

    # Create ZIP
    # Memory buffer
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for path, name in files_to_archive:
            try:
                zip_file.write(path, name)
            except Exception as e:
                print(f"Error zipping {path}: {e}")
                
    zip_buffer.seek(0)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"Actas_Export_{timestamp}.zip"
    
    return StreamingResponse(
        zip_buffer, 
        media_type="application/zip", 
        headers={"Content-Disposition": f"attachment; filename={zip_filename}"}
    )
