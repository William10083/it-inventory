from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
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
    
    # Get all active employees
    active_employees = db.query(models.Employee).filter(
        models.Employee.is_active == True
    ).all()
    
    assignment_computer_data = []
    assignment_mobile_data = []
    sales_data = []
    
    for emp in active_employees:
        # Apply search filter
        if search and search.lower() not in emp.full_name.lower():
            continue
        
        # Get active assignments (not returned)
        active_assignments = [a for a in emp.assignments if not a.returned_date]
        
        if not active_assignments:
            continue
        
        # Categorize assignments by device type
        computer_assignments = []
        mobile_assignments = []
        
        for assignment in active_assignments:
            device = db.query(models.Device).filter(
                models.Device.id == assignment.device_id
            ).first()
            
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
                    device = db.query(models.Device).filter(
                        models.Device.id == assignment.device_id
                    ).first()
                    if device and device.device_type in ['laptop', 'monitor', 'kit teclado/mouse', 
                                                         'mochila', 'auriculares', 'stand', 'keyboard', 'mouse']:
                        computer_acta = assignment
                        break
            
            # Use most recent computer assignment for date
            most_recent_computer = max(computer_assignments, key=lambda a: a.assigned_date)
            has_computer_acta = bool(computer_acta)
            days_pending_computer = (datetime.utcnow() - most_recent_computer.assigned_date).days if not has_computer_acta else None
            
            # Apply status filter
            if status_filter == 'signed' and not has_computer_acta:
                pass
            elif status_filter == 'pending' and has_computer_acta:
                pass
            else:
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
                    # Verify it's a mobile device
                    device = db.query(models.Device).filter(
                        models.Device.id == assignment.device_id
                    ).first()
                    if device and device.device_type in ['celular', 'chip', 'charger']:
                        mobile_acta = assignment
                        break
            
            # Use most recent mobile assignment for date
            most_recent_mobile = max(mobile_assignments, key=lambda a: a.assigned_date)
            has_mobile_acta = bool(mobile_acta)
            days_pending_mobile = (datetime.utcnow() - most_recent_mobile.assigned_date).days if not has_mobile_acta else None
            
            # Apply status filter
            if status_filter == 'signed' and not has_mobile_acta:
                pass
            elif status_filter == 'pending' and has_mobile_acta:
                pass
            else:
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
        sales = db.query(models.Sale).filter(
            models.Sale.buyer_name == emp.full_name
        ).all()
        
        for sale in sales:
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
    
    # Get all terminations (keep existing logic)
    terminations = db.query(models.Termination).all()
    
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
            if status_filter == 'signed' and not has_computer_acta:
                pass
            elif status_filter == 'pending' and has_computer_acta:
                pass
            else:
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
            if status_filter == 'signed' and not has_mobile_acta:
                pass
            elif status_filter == 'pending' and has_mobile_acta:
                pass
            else:
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
