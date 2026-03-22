"""
Google Drive integration para backup de PDFs/DOCX generados por el sistema.

Estructura en Drive:
  IT_Inventory/ (GDRIVE_FOLDER_ID)
  ├── asignaciones/     → actas de asignación generadas (DOCX)
  ├── bajas/            → actas de baja generadas (DOCX)
  ├── firmadas/
  │   ├── asignaciones/ → PDFs firmados subidos por el usuario
  │   ├── terminaciones/→ PDFs firmados de ceses
  │   └── ventas/       → PDFs firmados de ventas

Variables de entorno necesarias:
  GOOGLE_CLIENT_ID      → OAuth client ID
  GOOGLE_CLIENT_SECRET  → OAuth client secret
  GOOGLE_REFRESH_TOKEN  → refresh token obtenido en autorización inicial
  GDRIVE_FOLDER_ID      → ID de la carpeta raíz en Drive
"""
import os
import io
import logging
import threading

logger = logging.getLogger(__name__)

GDRIVE_FOLDER_ID = os.getenv("GDRIVE_FOLDER_ID", "")


def _is_configured() -> bool:
    return all([
        os.getenv("GOOGLE_CLIENT_ID"),
        os.getenv("GOOGLE_CLIENT_SECRET"),
        os.getenv("GOOGLE_REFRESH_TOKEN"),
        os.getenv("GDRIVE_FOLDER_ID"),
    ])


def _get_service():
    """Construye el cliente de Google Drive usando OAuth con refresh token."""
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build

        creds = Credentials(
            token=None,
            refresh_token=os.getenv("GOOGLE_REFRESH_TOKEN"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        )
        creds.refresh(Request())
        return build("drive", "v3", credentials=creds, cache_discovery=False)
    except Exception as e:
        logger.error(f"Error inicializando Google Drive: {e}")
        return None


def _get_or_create_folder(service, name: str, parent_id: str) -> str:
    """Obtiene o crea una carpeta dentro de parent_id. Retorna el ID de la carpeta."""
    query = (
        f"name='{name}' and "
        f"mimeType='application/vnd.google-apps.folder' and "
        f"'{parent_id}' in parents and "
        f"trashed=false"
    )
    results = service.files().list(q=query, fields="files(id)", spaces="drive").execute()
    files = results.get("files", [])
    if files:
        return files[0]["id"]

    metadata = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    folder = service.files().create(body=metadata, fields="id").execute()
    return folder["id"]


def _resolve_folder(service, drive_subfolder: str) -> str:
    """
    Navega/crea la estructura de carpetas desde la raíz.
    drive_subfolder: e.g. 'asignaciones' o 'firmadas/ventas'
    """
    root = os.getenv("GDRIVE_FOLDER_ID", GDRIVE_FOLDER_ID)
    current = root
    for part in drive_subfolder.strip("/").split("/"):
        if part:
            current = _get_or_create_folder(service, part, current)
    return current


def _do_upload_file(local_path: str, drive_subfolder: str, filename: str = None):
    """Sube un archivo local a Drive. Ejecutar en background."""
    if not _is_configured():
        return

    if not os.path.exists(local_path):
        logger.warning(f"Drive upload: archivo no encontrado {local_path}")
        return

    service = _get_service()
    if not service:
        return

    try:
        from googleapiclient.http import MediaFileUpload
        import mimetypes

        if not filename:
            filename = os.path.basename(local_path)

        folder_id = _resolve_folder(service, drive_subfolder)

        # Verificar si ya existe para actualizar en lugar de duplicar
        query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
        existing = service.files().list(q=query, fields="files(id)").execute().get("files", [])

        mime_type, _ = mimetypes.guess_type(local_path)
        if not mime_type:
            mime_type = "application/octet-stream"

        media = MediaFileUpload(local_path, mimetype=mime_type, resumable=False)

        if existing:
            service.files().update(fileId=existing[0]["id"], media_body=media).execute()
        else:
            metadata = {"name": filename, "parents": [folder_id]}
            service.files().create(body=metadata, media_body=media, fields="id").execute()

        logger.info(f"Drive OK: {filename} → {drive_subfolder}")
    except Exception as e:
        logger.error(f"Drive upload error ({local_path}): {e}")


def _do_upload_bytes(file_bytes: bytes, filename: str, drive_subfolder: str, mime_type: str):
    """Sube bytes directamente a Drive. Ejecutar en background."""
    if not _is_configured():
        return

    service = _get_service()
    if not service:
        return

    try:
        from googleapiclient.http import MediaIoBaseUpload

        folder_id = _resolve_folder(service, drive_subfolder)

        query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
        existing = service.files().list(q=query, fields="files(id)").execute().get("files", [])

        media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype=mime_type, resumable=False)

        if existing:
            service.files().update(fileId=existing[0]["id"], media_body=media).execute()
        else:
            metadata = {"name": filename, "parents": [folder_id]}
            service.files().create(body=metadata, media_body=media, fields="id").execute()

        logger.info(f"Drive OK (bytes): {filename} → {drive_subfolder}")
    except Exception as e:
        logger.error(f"Drive bytes upload error ({filename}): {e}")


# ── API pública (no bloquean el hilo principal) ───────────────────────────────

def upload_file_async(local_path: str, drive_subfolder: str, filename: str = None):
    """Sube un archivo local a Drive en background (no bloquea la respuesta HTTP)."""
    t = threading.Thread(
        target=_do_upload_file,
        args=(local_path, drive_subfolder, filename),
        daemon=True,
    )
    t.start()


def upload_bytes_async(file_bytes: bytes, filename: str, drive_subfolder: str, mime_type: str = "application/pdf"):
    """Sube bytes a Drive en background (no bloquea la respuesta HTTP)."""
    t = threading.Thread(
        target=_do_upload_bytes,
        args=(file_bytes, filename, drive_subfolder, mime_type),
        daemon=True,
    )
    t.start()


def supabase_path_to_drive_subfolder(storage_path: str) -> str:
    """
    Convierte una ruta de Supabase Storage a subcarpeta de Drive.
    Ejemplos:
      'actas/asignaciones/123_file.pdf' → 'firmadas/asignaciones'
      'actas/ceses/456_file.pdf'        → 'firmadas/terminaciones'
      'actas/ventas/789_file.pdf'       → 'firmadas/ventas'
    """
    mapping = {
        "actas/asignaciones": "firmadas/asignaciones",
        "actas/ceses":        "firmadas/terminaciones",
        "actas/ventas":       "firmadas/ventas",
    }
    for prefix, drive_folder in mapping.items():
        if storage_path.startswith(prefix):
            return drive_folder
    # Fallback: quita 'actas/' del inicio
    parts = storage_path.split("/")
    if parts[0] == "actas" and len(parts) > 1:
        return "firmadas/" + parts[1]
    return "firmadas"
