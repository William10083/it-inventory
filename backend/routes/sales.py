from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from math import ceil
import database, schemas, models, auth
import os
import shutil
from pathlib import Path

router = APIRouter()

# Directory for sale actas
SALES_ACTAS_DIR = Path("uploaded_actas/ventas")
SALES_ACTAS_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/stats")
def get_sales_stats(db: Session = Depends(database.get_db)):
    """
    Get aggregated sales statistics:
    - Total revenue (sum of sale_price)
    - Total devices sold
    """
    from sqlalchemy import func
    
    # Total Revenue
    total_revenue = db.query(func.sum(models.Sale.sale_price)).scalar() or 0.0
    
    # Total Devices Sold
    total_devices_sold = db.query(models.Device).filter(models.Device.status == models.DeviceStatus.SOLD).count()
    
    return {
        "total_revenue": total_revenue,
        "total_devices_sold": total_devices_sold
    }

@router.post("/", response_model=schemas.Sale)
def create_sale(
    sale: schemas.SaleCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Create a new sale record and mark devices as SOLD
    """
    # Validate that all devices exist and are available
    devices = []
    for device_id in sale.device_ids:
        device = db.query(models.Device).filter(models.Device.id == device_id).first()
        if not device:
            raise HTTPException(status_code=404, detail=f"Device {device_id} not found")
        if device.status == models.DeviceStatus.SOLD:
            raise HTTPException(status_code=400, detail=f"Device {device.serial_number} is already sold")
            
        # ALLOW selling assigned devices (implicit return/transfer)
        if device.status == models.DeviceStatus.ASSIGNED:
            # Find and close the active assignment
            active_assignment = db.query(models.Assignment).filter(
                models.Assignment.device_id == device.id,
                models.Assignment.returned_date == None
            ).first()
            
            if active_assignment:
                active_assignment.returned_date = datetime.utcnow()
                active_assignment.return_observations = f"Sold to {sale.buyer_name} (Sale ID Pending)"
        
        devices.append(device)
    
    # Create sale record
    db_sale = models.Sale(
        buyer_name=sale.buyer_name,
        buyer_dni=sale.buyer_dni,
        buyer_email=sale.buyer_email,
        buyer_phone=sale.buyer_phone,
        buyer_address=sale.buyer_address,
        sale_price=sale.sale_price,
        payment_method=sale.payment_method,
        notes=sale.notes,
        created_by_user_id=current_user.id
    )
    db.add(db_sale)
    db.flush()  # Get the ID
    
    # Create SaleItem records for each device
    for i, device in enumerate(devices):
        # Get price from items if provided, otherwise use default
        price = 0
        if sale.items and i < len(sale.items):
            item_data = sale.items[i]
            price = item_data.price
        
        # Create device description
        device_description = f"{device.brand} {device.model}"
        if device.device_type == "laptop" and device.specifications:
            device_description += f" ({device.specifications[:50]})"
        
        sale_item = models.SaleItem(
            sale_id=db_sale.id,
            device_id=device.id,
            device_type=device.device_type,
            device_description=device_description,
            serial_number=device.serial_number,
            price=price
        )
        db.add(sale_item)
        
        # Mark device as SOLD and link to sale
        device.status = models.DeviceStatus.SOLD
        device.sale_id = db_sale.id
    
    db.commit()
    db.refresh(db_sale)
    
    return db_sale

@router.get("/buyers/search")
def search_buyers(
    q: str,
    db: Session = Depends(database.get_db)
):
    """
    Search for previous buyers by name or email for autocomplete
    Returns unique buyer information from past sales
    """
    if not q or len(q) < 2:
        return []
    
    # Search in sales by name or email
    sales = db.query(models.Sale).filter(
        (models.Sale.buyer_name.ilike(f"%{q}%")) |
        (models.Sale.buyer_email.ilike(f"%{q}%"))
    ).order_by(models.Sale.sale_date.desc()).limit(10).all()
    
    # Create unique buyers list
    buyers_dict = {}
    for sale in sales:
        key = sale.buyer_dni or sale.buyer_email or sale.buyer_name
        if key not in buyers_dict:
            buyers_dict[key] = {
                "buyer_name": sale.buyer_name,
                "buyer_dni": sale.buyer_dni,
                "buyer_email": sale.buyer_email,
                "buyer_phone": sale.buyer_phone
            }
    
    return list(buyers_dict.values())

@router.get("/employees/search")
def search_employees_with_devices(
    q: str,
    db: Session = Depends(database.get_db)
):
    """
    Search for active employees by name, email, DNI, or phone
    Returns employee info with their assigned laptop and monitor
    """
    if not q or len(q) < 2:
        return []
    
    # Search active employees
    employees = db.query(models.Employee).filter(
        models.Employee.is_active == True,
        (
            (models.Employee.full_name.ilike(f"%{q}%")) |
            (models.Employee.email.ilike(f"%{q}%")) |
            (models.Employee.dni.ilike(f"%{q}%"))
        )
    ).limit(10).all()
    
    result = []
    for emp in employees:
        # Get active assignments for this employee
        assignments = db.query(models.Assignment).filter(
            models.Assignment.employee_id == emp.id,
            models.Assignment.returned_date == None
        ).all()
        
        # Find laptop and monitors (can have multiple monitors)
        laptop = None
        monitors = []  # Changed to list to support multiple monitors
        
        for assignment in assignments:
            device = db.query(models.Device).filter(
                models.Device.id == assignment.device_id
            ).first()
            
            if device and device.status == models.DeviceStatus.ASSIGNED:
                if device.device_type == 'laptop' and not laptop:
                    laptop = {
                        "id": device.id,
                        "brand": device.brand,
                        "model": device.model,
                        "serial_number": device.serial_number,
                        "hostname": device.hostname,
                        "device_type": device.device_type  # AGREGADO: necesario para el frontend
                    }
                elif device.device_type == 'monitor':  # Removed "and not monitor" to get ALL monitors
                    monitors.append({
                        "id": device.id,
                        "brand": device.brand,
                        "model": device.model,
                        "serial_number": device.serial_number,
                        "hostname": device.hostname,
                        "device_type": device.device_type  # AGREGADO: necesario para el frontend
                    })
        
        result.append({
            "employee_id": emp.id,
            "full_name": emp.full_name,
            "email": emp.email,
            "dni": emp.dni,
            "position": emp.position,
            "location": emp.location,
            "laptop": laptop,
            "monitors": monitors  # Changed from "monitor" to "monitors" (plural)
        })
    
    return result

@router.get("/")
def list_sales(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """
    List all sales with pagination and search
    """
    # Use joinedload to prevent N+1 queries when accessing sold_devices and items later
    from sqlalchemy.orm import joinedload
    query = db.query(models.Sale).options(
        joinedload(models.Sale.sold_devices),
        joinedload(models.Sale.items)
    )
    
    # Apply search filter
    if search:
        query = query.filter(
            (models.Sale.buyer_name.ilike(f"%{search}%")) |
            (models.Sale.buyer_dni.ilike(f"%{search}%"))
        )
    
    # Count total
    total = query.count()
    
    # Apply pagination and ordering
    sales = query.order_by(models.Sale.sale_date.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    # Enrich with device count and items
    result = []
    for sale in sales:
        devices_count = len(sale.sold_devices)
        items_data = [
            {
                "id": item.id,
                "device_type": item.device_type,
                "device_description": item.device_description,
                "serial_number": item.serial_number,
                "price": item.price
            }
            for item in sale.items
        ]
        result.append({
            **sale.__dict__,
            'devices_count': devices_count,
            'has_acta': bool(sale.acta_path),
            'items': items_data
        })
    
    # Calculate pages
    pages = ceil(total / limit) if limit > 0 else 0
    
    return {
        "items": result,
        "total": total,
        "skip": skip,
        "limit": limit,
        "pages": pages
    }

@router.get("/{sale_id}", response_model=schemas.SaleDetail)
def get_sale(sale_id: int, db: Session = Depends(database.get_db)):
    """
    Get detailed sale information including sold devices
    """
    sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    return sale

@router.delete("/{sale_id}")
def delete_sale(
    sale_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Delete a sale and revert devices to AVAILABLE status
    """
    sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    # Revert devices to AVAILABLE
    for device in sale.sold_devices:
        device.status = models.DeviceStatus.AVAILABLE
        device.sale_id = None
    
    # Delete acta file if exists
    if sale.acta_path and os.path.exists(sale.acta_path):
        os.remove(sale.acta_path)
    
    # Delete sale record
    db.delete(sale)
    db.commit()
    
    return {"message": "Sale deleted and devices reverted to available"}

@router.post("/{sale_id}/upload-acta")
async def upload_sale_acta(
    sale_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Upload signed sale acta
    """
    sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    # Validate PDF
    if file.content_type != 'application/pdf':
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Generate filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_buyer_name = "".join(c for c in sale.buyer_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
    filename = f"venta_{sale_id}_{safe_buyer_name}_{timestamp}.pdf"
    file_path = SALES_ACTAS_DIR / filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    # Update sale record
    sale.acta_path = str(file_path)
    db.commit()
    
    return {
        "message": "Acta uploaded successfully",
        "filename": filename,
        "path": str(file_path)
    }

@router.get("/{sale_id}/download-acta")
def download_sale_acta(sale_id: int, db: Session = Depends(database.get_db)):
    """
    Download sale acta (uploaded signed version)
    """
    from fastapi.responses import FileResponse
    
    sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    if not sale.acta_path or not os.path.exists(sale.acta_path):
        raise HTTPException(status_code=404, detail="Acta not found")
    
    return FileResponse(
        path=sale.acta_path,
        filename=f"Acta_Venta_{sale.buyer_name}_{sale_id}.pdf",
        media_type="application/pdf"
    )

    return {"message": "Acta deleted successfully"}

@router.post("/{sale_id}/generate-acta")
def generate_sale_acta(
    sale_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Generate Sale Acta PDF using the uploaded template (or 'Acta de Venta' template).
    """
    from fastapi.responses import FileResponse
    import pdf_generator
    
    sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
        
    # 1. Fetch 'Acta de Venta' template
    # Try finding by name "Acta de Venta" or type "ACTA_VENTA" (if implemented)
    # Since types might be loose, let's look for a template with "Venta" in name
    template_model = db.query(models.DocumentTemplate).filter(
        models.DocumentTemplate.name.ilike("%Venta%")
    ).first()
    
    # If not found, look for any default template or handle error?
    # For now, if no template logic exists in DB, we rely on pdf_generator defaults or error out.
    # But user said "voy a subir un template", so they will likely upload it.
    
    # Fallback/Default path logic handled in pdf_generator usually, but here we want DB template
    if not template_model:
        # Check if there is a 'default' template
        # Or return explicit error asking to upload one
        raise HTTPException(status_code=400, detail="No se encontró una plantilla de 'Acta de Venta'. Por favor suba una en la sección Templates.")
    
    template_path = template_model.file_path
    if not os.path.exists(template_path):
         raise HTTPException(status_code=500, detail=f"El archivo de plantilla no existe en la ruta: {template_path}")

    
    # 2. Prepare Data
    # Try to find if buyer is an employee to get specific company/details
    employee = None
    if sale.buyer_dni:
        employee = db.query(models.Employee).filter(models.Employee.dni == sale.buyer_dni).first()
    
    company_name = 'TRANSTOTAL AGENCIA MARITIMA S.A.' # Default requested by user
    if employee and employee.company:
        company_name = employee.company.upper()

    # Employee Data (Buyer Data in this case)
    buyer_data = {
        'name': sale.buyer_name,
        'dni': sale.buyer_dni,
        'company': company_name,
        'location': sale.buyer_address or (employee.location if employee else 'LIMA'),
        'observations': sale.notes or "Venta de equipos usados en estado 'tal cual'.",
        'template_type': 'ACTA_VENTA'
    }
    
    # Devices Info - Use sale_items for permanent record
    devices_info = []
    from sqlalchemy.orm import joinedload
    
    # Load sale with items (not devices, as they might be deleted)
    sale_with_items = db.query(models.Sale).options(joinedload(models.Sale.items)).filter(models.Sale.id == sale_id).first()
    
    if not sale_with_items.items:
        raise HTTPException(status_code=400, detail="Esta venta no tiene items registrados. No se puede generar el acta.")
    
    for item in sale_with_items.items:
        devices_info.append({
            'type': item.device_type,
            'brand': item.device_description.split()[0] if item.device_description else 'N/A',  # Extract brand from description
            'model': ' '.join(item.device_description.split()[1:]) if item.device_description else 'N/A',  # Extract model
            'serial': item.serial_number or 'N/A',
            'hostname': '',  # Not stored in sale_items
            'inventory_code': '',  # Not stored in sale_items
            'status': 'USADO',  # Sales are usually used items
            'price': item.price  # Now we have individual prices!
        })
        
    # 3. Generate PDF
    try:
        # Use a modified generate function or the batch one?
        # generate_document_from_template is generic?
        # Let's check pdf_generator functions again. 
        # It has `generate_batch_acta` which seems to do the job.
        
        generated_path = pdf_generator.generate_batch_acta(
            assignment_id=f"SALE_{sale.id}", # Hack ID
            employee_name=sale.buyer_name,
            devices_info=devices_info,
            employee_dni=sale.buyer_dni,
            employee_company=buyer_data['company'],
            template_path=template_path,
            template=template_model,
            acta_observations=buyer_data['observations']
        )
        
        if not generated_path or not os.path.exists(generated_path):
             raise HTTPException(status_code=500, detail="Error generando el PDF (archivo no creado)")
             
        return FileResponse(
            path=generated_path,
            filename=f"Acta_Venta_Generada_{sale.buyer_name}.docx", # Returns DOCX initially
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
        
    except Exception as e:
        print(f"Error generating sale acta: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno generando acta: {str(e)}")

