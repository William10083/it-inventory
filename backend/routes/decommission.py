from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, crud
from auth import get_current_user

router = APIRouter()

@router.post("/", response_model=schemas.DecommissionResponse)
def create_decommission(
    decommission: schemas.DecommissionCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Registra la baja de un equipo.
    1. Verifica que el equipo exista y esté disponible (o asignado, según lógica, pero idealmente disponible).
    2. Cambia el estado del equipo a RETIRED.
    3. Crea el registro de Decommission.
    4. Genera PDF de Acta de Baja.
    """
    
    # 1. Get Device
    device = db.query(models.Device).filter(models.Device.id == decommission.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    
    # Optional: Check status. Allow decommission even if assigned? Probably yes, creates implicit return?
    # For now, let's assume simple flow: User manually unassigns first or we allow it.
    # Let's enforce it shouldn't be 'sold' already.
    if device.status == models.DeviceStatus.SOLD:
        raise HTTPException(status_code=400, detail="El dispositivo ya ha sido vendido")
    if device.status == models.DeviceStatus.RETIRED:
        raise HTTPException(status_code=400, detail="El dispositivo ya está dado de baja")

    # 2. Update Device Status
    device.status = models.DeviceStatus.RETIRED
    
    # 3. Create Decommission Record
    new_decommission = models.Decommission(
        device_id=decommission.device_id,
        reason=decommission.reason,
        observations=decommission.observations,
        fabrication_year=decommission.fabrication_year,
        purchase_reason=decommission.purchase_reason,
        device_image_path=decommission.device_image_path,
        serial_image_path=decommission.serial_image_path,
        created_by_user_id=current_user.id
        # decommission_date uses default utcnow
    )
    db.add(new_decommission)
    db.commit()
    db.refresh(new_decommission)
    
    # 4. Generate PDF
    try:
        from pdf_generator import generate_batch_acta
        
        # Get Template
        template = db.query(models.DocumentTemplate).filter(
            models.DocumentTemplate.template_type == "ACTA_BAJA",
            models.DocumentTemplate.is_active == True
        ).first()
        
        print(f"DEBUG: Decommission Route - Found Template: {template.name if template else 'NONE'} (ID: {template.id if template else 'N/A'})")
        if template:
            print(f"DEBUG: Template File Path: {template.file_path}")
        
        # User info (Admin giving decommission)
        employee_name = current_user.full_name or current_user.username
        
        # Device Info
        devices_info = [{
            'type': device.device_type,
            'brand': device.brand,
            'model': device.model,
            'serial': device.serial_number,
            'hostname': device.hostname,
            'inventory_code': device.inventory_code,
            'status': 'BAJA'
        }]
        
        # Additional decommission data for PDF generation
        decommission_data = {
            'fabrication_year': decommission.fabrication_year,
            'purchase_reason': decommission.purchase_reason,
            'device_image_path': decommission.device_image_path,
            'serial_image_path': decommission.serial_image_path
        }
        
        pdf_path = generate_batch_acta(
            assignment_id=new_decommission.id, # Use ID for filename uniqueness
            employee_name=employee_name,
            devices_info=devices_info,
            template=template,
            acta_observations=decommission.observations,
            decommission_data=decommission_data  # Pass additional data
        )
        
        new_decommission.acta_path = pdf_path
        db.commit()
    except Exception as e:
        print(f"Error generating Decommission PDF: {e}")
        # Don't fail the transaction, just log error. PDF can be regenerated manually if feature added.
    
    return new_decommission

@router.get("/", response_model=List[schemas.DecommissionResponse])
def read_decommissions(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    decommissions = db.query(models.Decommission).order_by(models.Decommission.decommission_date.desc()).offset(skip).limit(limit).all()
    return decommissions

@router.get("/{decommission_id}/download-acta")
def download_decommission_acta(
    decommission_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Download the decommission acta (DOCX file)
    """
    from fastapi.responses import FileResponse
    import os
    
    # Get decommission record
    decommission = db.query(models.Decommission).filter(models.Decommission.id == decommission_id).first()
    if not decommission:
        raise HTTPException(status_code=404, detail="Registro de baja no encontrado")
    
    if not decommission.acta_path:
        raise HTTPException(status_code=404, detail="Acta no disponible para esta baja")
    
    # Check if file exists
    if not os.path.exists(decommission.acta_path):
        raise HTTPException(status_code=404, detail="Archivo de acta no encontrado")
    
    # Extract filename
    filename = os.path.basename(decommission.acta_path)
    
    print(f"DEBUG: Serving download for Decommission {decommission_id}: {decommission.acta_path}")
    print(f"DEBUG: File size: {os.path.getsize(decommission.acta_path)} bytes")
    
    return FileResponse(
        path=decommission.acta_path,
        filename=filename,
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )

@router.post("/upload-image")
async def upload_decommission_image(
    file: UploadFile = File(...)
):
    """
    Sube una imagen relacionada con la baja (equipo o serie).
    Retorna la ruta relativa del archivo guardado.
    """
    import os
    import shutil
    import uuid
    
    # Validar extensión
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes (png, jpg, jpeg, webp)")
    
    # Directorio de uploads para bajas
    UPLOAD_DIR = "uploads/decommission"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Generar nombre único
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        # Read file content
        content = await file.read()
        
        # Process and save using utility logic (Smart Crop, EXIF Rotate)
        from utils.image_processing import process_and_save_image
        process_and_save_image(content, file_path)
            
        return {"file_path": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar imagen: {str(e)}")

@router.put("/{decommission_id}", response_model=schemas.DecommissionResponse)
def update_decommission(
    decommission_id: int,
    decommission_update: schemas.DecommissionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Actualiza la información de una baja y regenera el acta PDF.
    """
    # 1. Get Decommission Record
    db_decommission = db.query(models.Decommission).filter(models.Decommission.id == decommission_id).first()
    if not db_decommission:
        raise HTTPException(status_code=404, detail="Registro de baja no encontrado")
        
    # 2. Update fields if provided
    if decommission_update.reason is not None:
        db_decommission.reason = decommission_update.reason
    if decommission_update.observations is not None:
        db_decommission.observations = decommission_update.observations
    if decommission_update.fabrication_year is not None:
        db_decommission.fabrication_year = decommission_update.fabrication_year
    if decommission_update.purchase_reason is not None:
        db_decommission.purchase_reason = decommission_update.purchase_reason
    if decommission_update.device_image_path is not None:
        db_decommission.device_image_path = decommission_update.device_image_path
    if decommission_update.serial_image_path is not None:
        db_decommission.serial_image_path = decommission_update.serial_image_path
        
    db.commit()
    db.refresh(db_decommission)
    
    # 3. Regenerate PDF
    try:
        from pdf_generator import generate_batch_acta
        
        # Get Template
        template = db.query(models.DocumentTemplate).filter(
            models.DocumentTemplate.template_type == "ACTA_BAJA",
            models.DocumentTemplate.is_active == True
        ).first()
        
        # Get Creator Info (or Current User)
        creator = db.query(models.User).filter(models.User.id == db_decommission.created_by_user_id).first()
        employee_name = creator.full_name or creator.username if creator else current_user.full_name or current_user.username
        
        # Device Info
        device = db_decommission.device
        devices_info = [{
            'type': device.device_type,
            'brand': device.brand,
            'model': device.model,
            'serial': device.serial_number,
            'hostname': device.hostname,
            'inventory_code': device.inventory_code,
            'status': 'BAJA'
        }]
        
        # Additional decommission data for PDF generation
        decommission_data = {
            'fabrication_year': db_decommission.fabrication_year,
            'purchase_reason': db_decommission.purchase_reason,
            'device_image_path': db_decommission.device_image_path,
            'serial_image_path': db_decommission.serial_image_path
        }
        
        pdf_path = generate_batch_acta(
            assignment_id=db_decommission.id, 
            employee_name=employee_name,
            devices_info=devices_info,
            template=template,
            acta_observations=db_decommission.observations,
            decommission_data=decommission_data
        )
        
        db_decommission.acta_path = pdf_path
        db.commit()
    except Exception as e:
        print(f"Error regenerating Decommission PDF: {e}")
        # Non-blocking error
        
    return db_decommission

@router.delete("/{decommission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_decommission(
    decommission_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Elimina un registro de baja y revierte el estado del equipo a AVAILABLE.
    También ELIMINA los archivos asociados (PDF y Fotos) si existen.
    """
    import os
    
    # 1. Get Decommission Record
    db_decommission = db.query(models.Decommission).filter(models.Decommission.id == decommission_id).first()
    if not db_decommission:
        raise HTTPException(status_code=404, detail="Registro de baja no encontrado")
    
    # 2. Revert Device Status
    device = db_decommission.device
    if device:
        # Revert to AVAILABLE. 
        # Note: If it was assigned before, we lost that info, so AVAILABLE is the safest bet.
        device.status = models.DeviceStatus.AVAILABLE
    
    # 3. Delete Files (Cleanup)
    files_to_delete = []
    if db_decommission.acta_path:
        files_to_delete.append(db_decommission.acta_path)
    if db_decommission.device_image_path:
        files_to_delete.append(db_decommission.device_image_path)
    if db_decommission.serial_image_path:
        files_to_delete.append(db_decommission.serial_image_path)
        
    for file_path in files_to_delete:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"DEBUG: Deleted file {file_path}")
        except Exception as e:
            print(f"ERROR: Failed to delete file {file_path}: {e}")

    # 4. Delete Record
    db.delete(db_decommission)
    db.commit()
    
    return None
