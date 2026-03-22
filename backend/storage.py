"""
Utilidad para Supabase Storage.
Gestiona subida y eliminación de archivos en el bucket 'actas'.

Convención de rutas:
  actas/asignaciones/{filename}
  actas/ceses/{filename}
  actas/ventas/{filename}

Las rutas almacenadas en BD empiezan con 'actas/' (sin slash inicial).
Las rutas locales (legacy) son rutas absolutas del sistema de archivos.
"""
import os
import logging
import requests

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://gcncfvcereubvywxqpoe.supabase.co").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjbmNmdmNlcmV1YnZ5d3hxcG9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDc4NDgsImV4cCI6MjA4NjIyMzg0OH0.6_Do-IMxMgGc_XlS9YbGVrjluVNJNWdc6inMqsMZ5o8")
BUCKET = "actas"


def is_supabase_path(path: str) -> bool:
    """Detecta si la ruta almacenada en BD es de Supabase (no una ruta local legacy)."""
    if not path:
        return False
    return path.startswith("actas/")


def get_public_url(storage_path: str) -> str:
    """Devuelve la URL pública de un objeto en el bucket (bucket es público)."""
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"


def upload_file(file_bytes: bytes, storage_path: str, content_type: str = "application/pdf") -> str:
    """
    Sube un archivo a Supabase Storage.

    Args:
        file_bytes: Contenido del archivo.
        storage_path: Ruta dentro del bucket, e.g. 'actas/asignaciones/123_file.pdf'
        content_type: MIME type del archivo.

    Returns:
        storage_path si fue exitoso.

    Raises:
        RuntimeError si falla la subida.
    """
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise RuntimeError("SUPABASE_URL y SUPABASE_ANON_KEY deben estar configurados")

    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": content_type,
    }

    resp = requests.post(url, data=file_bytes, headers=headers, timeout=30)

    if resp.status_code not in (200, 201):
        logger.error(f"Supabase Storage upload error {resp.status_code}: {resp.text}")
        raise RuntimeError(f"Error subiendo a Supabase Storage: {resp.status_code} {resp.text}")

    # Mirror a Google Drive en background (no bloquea si falla)
    try:
        import google_drive_service
        filename = storage_path.split("/")[-1]
        drive_subfolder = google_drive_service.supabase_path_to_drive_subfolder(storage_path)
        google_drive_service.upload_bytes_async(file_bytes, filename, drive_subfolder, content_type)
    except Exception as _e:
        logger.warning(f"Drive mirror skipped: {_e}")

    return storage_path


def delete_file(storage_path: str) -> None:
    """
    Elimina un archivo de Supabase Storage.
    No lanza excepción si el archivo no existe.
    """
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return

    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }

    resp = requests.delete(url, json={"prefixes": [storage_path]}, headers=headers, timeout=30)

    if resp.status_code not in (200, 204):
        logger.warning(f"Supabase Storage delete warning {resp.status_code}: {resp.text}")
