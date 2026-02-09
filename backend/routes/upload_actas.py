"""
Endpoints para subida y descarga de PDFs firmados (actas).
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import database, models, auth
import os
import shutil
from datetime import datetime
from pathlib import Path

router = APIRouter()

# Directorio base para almacenar PDFs
ACTAS_DIR = Path("actas")
ACTAS_DIR.mkdir(exist_ok=True)

# Subdirectorios
ASIGNACIONES_DIR = ACTAS_DIR / "asignaciones"
CESES_DIR = ACTAS_DIR / "ceses"
ASIGNACIONES_DIR.mkdir(exist_ok=True)
CESES_DIR.mkdir(exist_ok=True)

# Validaciones
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".pdf"}

def validate_pdf(file: UploadFile):
    """Valida que el archivo sea un PDF y no exceda el tamaño máximo"""
    # Validar extensión
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")
    
    # Validar tipo MIME
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF")
    
    return True

def sanitize_filename(filename: str) -> str:
    """Sanitiza el nombre del archivo para evitar problemas de seguridad"""
    # Obtener solo el nombre base sin ruta
    filename = os.path.basename(filename)
    # Reemplazar caracteres problemáticos
    filename = filename.replace(" ", "_")
    # Mantener solo caracteres alfanuméricos, guiones y puntos
    filename = "".join(c for c in filename if c.isalnum() or c in "._-")
    return filename

@router.post("/assignments/{assignment_id}/upload-acta")
async def upload_assignment_acta(
    assignment_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Sube el acta firmada de una asignación"""
    # Validar archivo
    validate_pdf(file)
    
    # Verificar que la asignación existe
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    
    # Generar nombre de archivo único
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = sanitize_filename(file.filename)
    filename = f"{assignment_id}_{timestamp}_{safe_filename}"
    file_path = ASIGNACIONES_DIR / filename
    
    # Guardar archivo
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar archivo: {str(e)}")
    
    # Actualizar ruta en la base de datos
    assignment.pdf_acta_path = str(file_path)
    db.commit()
    
    return {
        "message": "Acta subida exitosamente",
        "filename": filename,
        "path": str(file_path)
    }

@router.post("/terminations/{termination_id}/upload-computer-acta")
async def upload_termination_computer_acta(
    termination_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Sube el acta firmada de devolución de computadora en un cese"""
    validate_pdf(file)
    
    termination = db.query(models.Termination).filter(models.Termination.id == termination_id).first()
    if not termination:
        raise HTTPException(status_code=404, detail="Cese no encontrado")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = sanitize_filename(file.filename)
    filename = f"{termination_id}_computer_{timestamp}_{safe_filename}"
    file_path = CESES_DIR / filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar archivo: {str(e)}")
    
    termination.computer_acta_path = str(file_path)
    db.commit()
    
    return {
        "message": "Acta de computadora subida exitosamente",
        "filename": filename,
        "path": str(file_path)
    }

@router.post("/terminations/{termination_id}/upload-mobile-acta")
async def upload_termination_mobile_acta(
    termination_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Sube el acta firmada de devolución de móvil en un cese"""
    validate_pdf(file)
    
    termination = db.query(models.Termination).filter(models.Termination.id == termination_id).first()
    if not termination:
        raise HTTPException(status_code=404, detail="Cese no encontrado")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = sanitize_filename(file.filename)
    filename = f"{termination_id}_mobile_{timestamp}_{safe_filename}"
    file_path = CESES_DIR / filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar archivo: {str(e)}")
    
    termination.mobile_acta_path = str(file_path)
    db.commit()
    
    return {
        "message": "Acta de móvil subida exitosamente",
        "filename": filename,
        "path": str(file_path)
    }

@router.get("/assignments/{assignment_id}/download-acta")
async def download_assignment_acta(
    assignment_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Descarga el acta de una asignación"""
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    
    if not assignment.pdf_acta_path:
        raise HTTPException(status_code=404, detail="No hay acta firmada subida para esta asignación")
    
    if not os.path.exists(assignment.pdf_acta_path):
        raise HTTPException(status_code=404, detail="El archivo del acta no existe en el servidor")
    
    return FileResponse(
        assignment.pdf_acta_path,
        media_type="application/pdf",
        filename=os.path.basename(assignment.pdf_acta_path)
    )

@router.delete("/assignments/{assignment_id}/delete-acta")
async def delete_assignment_acta(
    assignment_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Elimina el acta firmada de una asignación"""
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    
    if not assignment.pdf_acta_path:
        raise HTTPException(status_code=404, detail="No hay acta firmada para eliminar")
    
    # Eliminar archivo físico si existe
    if os.path.exists(assignment.pdf_acta_path):
        try:
            os.remove(assignment.pdf_acta_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al eliminar archivo: {str(e)}")
    
    # Limpiar ruta en BD
    assignment.pdf_acta_path = None
    db.commit()
    
    return {"message": "Acta eliminada exitosamente"}

@router.get("/terminations/{termination_id}/download-computer-acta")
async def download_termination_computer_acta(
    termination_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Descarga el acta de devolución de computadora"""
    termination = db.query(models.Termination).filter(models.Termination.id == termination_id).first()
    if not termination:
        raise HTTPException(status_code=404, detail="Cese no encontrado")
    
    if not termination.computer_acta_path:
        raise HTTPException(status_code=404, detail="No hay acta de computadora subida")
    
    if not os.path.exists(termination.computer_acta_path):
        raise HTTPException(status_code=404, detail="El archivo del acta no existe en el servidor")
    
    return FileResponse(
        termination.computer_acta_path,
        media_type="application/pdf",
        filename=os.path.basename(termination.computer_acta_path)
    )

@router.delete("/terminations/{termination_id}/delete-computer-acta")
async def delete_termination_computer_acta(
    termination_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Elimina el acta de devolución de computadora"""
    termination = db.query(models.Termination).filter(models.Termination.id == termination_id).first()
    if not termination:
        raise HTTPException(status_code=404, detail="Cese no encontrado")
    
    if not termination.computer_acta_path:
        raise HTTPException(status_code=404, detail="No hay acta de computadora para eliminar")
    
    # Eliminar archivo físico
    if os.path.exists(termination.computer_acta_path):
        try:
            os.remove(termination.computer_acta_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al eliminar archivo: {str(e)}")
    
    # Limpiar ruta en BD
    termination.computer_acta_path = None
    db.commit()
    
    return {"message": "Acta de computadora eliminada exitosamente"}

@router.get("/terminations/{termination_id}/download-mobile-acta")
async def download_termination_mobile_acta(
    termination_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Descarga el acta de devolución de móvil"""
    termination = db.query(models.Termination).filter(models.Termination.id == termination_id).first()
    if not termination:
        raise HTTPException(status_code=404, detail="Cese no encontrado")
    
    if not termination.mobile_acta_path:
        raise HTTPException(status_code=404, detail="No hay acta de móvil subida")
    
    if not os.path.exists(termination.mobile_acta_path):
        raise HTTPException(status_code=404, detail="El archivo del acta no existe en el servidor")
    
    return FileResponse(
        termination.mobile_acta_path,
        media_type="application/pdf",
        filename=os.path.basename(termination.mobile_acta_path)
    )

@router.delete("/terminations/{termination_id}/delete-mobile-acta")
async def delete_termination_mobile_acta(
    termination_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Elimina el acta de devolución de móvil"""
    termination = db.query(models.Termination).filter(models.Termination.id == termination_id).first()
    if not termination:
        raise HTTPException(status_code=404, detail="Cese no encontrado")
    
    if not termination.mobile_acta_path:
        raise HTTPException(status_code=404, detail="No hay acta de móvil para eliminar")
    
    # Eliminar archivo físico
    if os.path.exists(termination.mobile_acta_path):
        try:
            os.remove(termination.mobile_acta_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al eliminar archivo: {str(e)}")
    
    # Limpiar ruta en BD
    termination.mobile_acta_path = None
    db.commit()
    
    return {"message": "Acta de móvil eliminada exitosamente"}
