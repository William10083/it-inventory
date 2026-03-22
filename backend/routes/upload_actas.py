"""
Endpoints para subida y descarga de PDFs firmados (actas).
Los archivos se guardan en Supabase Storage (bucket 'actas') para persistencia.
Las rutas legacy (rutas absolutas del sistema de archivos) siguen siendo servidas
si el archivo existe localmente (compatibilidad hacia atrás).
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session
import database, models, auth
import os
from datetime import datetime
import storage as supabase_storage

router = APIRouter()

# Validaciones
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".pdf"}


def validate_pdf(file: UploadFile):
    """Valida que el archivo sea un PDF"""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF")
    return True


def sanitize_filename(filename: str) -> str:
    """Sanitiza el nombre del archivo"""
    filename = os.path.basename(filename)
    filename = filename.replace(" ", "_")
    filename = "".join(c for c in filename if c.isalnum() or c in "._-")
    return filename


def serve_acta(path: str, download_filename: str):
    """
    Sirve un acta:
    - Si es ruta Supabase (empieza con 'actas/'): redirige a la URL pública.
    - Si es ruta local (legacy): FileResponse si el archivo existe.
    """
    if supabase_storage.is_supabase_path(path):
        public_url = supabase_storage.get_public_url(path)
        return RedirectResponse(url=public_url)

    # Legacy: ruta local
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="El archivo del acta no existe en el servidor")
    return FileResponse(path, media_type="application/pdf", filename=download_filename)


def delete_acta_file(path: str):
    """Elimina un acta del almacenamiento (Supabase o local)."""
    if supabase_storage.is_supabase_path(path):
        supabase_storage.delete_file(path)
    elif os.path.exists(path):
        try:
            os.remove(path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al eliminar archivo: {str(e)}")


# ─── Upload/Download endpoints ────────────────────────────────────────────────

@router.post("/assignments/{assignment_id}/upload-acta")
async def upload_assignment_acta(
    assignment_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Sube el acta firmada de una asignación a Supabase Storage"""
    validate_pdf(file)

    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = sanitize_filename(file.filename)
    filename = f"{assignment_id}_{timestamp}_{safe_filename}"
    storage_path = f"actas/asignaciones/{filename}"

    file_bytes = await file.read()
    try:
        supabase_storage.upload_file(file_bytes, storage_path)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    assignment.pdf_acta_path = storage_path
    db.commit()

    return {"message": "Acta subida exitosamente", "filename": filename, "path": storage_path}


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
    storage_path = f"actas/ceses/{filename}"

    file_bytes = await file.read()
    try:
        supabase_storage.upload_file(file_bytes, storage_path)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    termination.computer_acta_path = storage_path
    db.commit()

    return {"message": "Acta de computadora subida exitosamente", "filename": filename, "path": storage_path}


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
    storage_path = f"actas/ceses/{filename}"

    file_bytes = await file.read()
    try:
        supabase_storage.upload_file(file_bytes, storage_path)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    termination.mobile_acta_path = storage_path
    db.commit()

    return {"message": "Acta de móvil subida exitosamente", "filename": filename, "path": storage_path}


# ─── Download endpoints ────────────────────────────────────────────────────────

from fastapi import Query, Security
from fastapi.security import APIKeyQuery

query_scheme = APIKeyQuery(name="token", auto_error=False)


async def get_current_user_download(
    token: str = Security(query_scheme),
    db: Session = Depends(database.get_db)
):
    """Autenticación para descargas: lee el token del query param ?token=..."""
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated (missing token)")
    try:
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        user = db.query(models.User).filter(models.User.username == username).first()
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/assignments/{assignment_id}/download-acta")
async def download_assignment_acta(
    assignment_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_download)
):
    """Descarga el acta de una asignación"""
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    if not assignment.pdf_acta_path:
        raise HTTPException(status_code=404, detail="No hay acta firmada subida para esta asignación")
    return serve_acta(assignment.pdf_acta_path, os.path.basename(assignment.pdf_acta_path))


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

    delete_acta_file(assignment.pdf_acta_path)
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
    return serve_acta(termination.computer_acta_path, os.path.basename(termination.computer_acta_path))


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

    delete_acta_file(termination.computer_acta_path)
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
    return serve_acta(termination.mobile_acta_path, os.path.basename(termination.mobile_acta_path))


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

    delete_acta_file(termination.mobile_acta_path)
    termination.mobile_acta_path = None
    db.commit()
    return {"message": "Acta de móvil eliminada exitosamente"}
