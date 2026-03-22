"""
Script de migración: sube todos los archivos locales existentes a Google Drive.

Uso:
  cd backend
  set GOOGLE_CLIENT_ID=...
  set GOOGLE_CLIENT_SECRET=...
  set GOOGLE_REFRESH_TOKEN=...
  set GDRIVE_FOLDER_ID=...
  python migrate_to_drive.py
"""
import os, mimetypes
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

CLIENT_ID     = os.environ["GOOGLE_CLIENT_ID"]
CLIENT_SECRET = os.environ["GOOGLE_CLIENT_SECRET"]
REFRESH_TOKEN = os.environ["GOOGLE_REFRESH_TOKEN"]
ROOT          = os.environ["GDRIVE_FOLDER_ID"]
BASE          = os.path.abspath(".")

creds = Credentials(token=None, refresh_token=REFRESH_TOKEN,
    token_uri="https://oauth2.googleapis.com/token",
    client_id=CLIENT_ID, client_secret=CLIENT_SECRET)
creds.refresh(Request())
svc = build("drive", "v3", credentials=creds, cache_discovery=False)
cache = {}

def get_or_create(name, parent):
    key = f"{parent}/{name}"
    if key in cache: return cache[key]
    q = f"name='{name}' and mimeType='application/vnd.google-apps.folder' and '{parent}' in parents and trashed=false"
    res = svc.files().list(q=q, fields="files(id)").execute().get("files", [])
    fid = res[0]["id"] if res else svc.files().create(
        body={"name": name, "mimeType": "application/vnd.google-apps.folder", "parents": [parent]}, fields="id"
    ).execute()["id"]
    cache[key] = fid
    return fid

def resolve(subfolder):
    cur = ROOT
    for p in subfolder.strip("/").split("/"):
        if p: cur = get_or_create(p, cur)
    return cur

def upload(fpath, folder_id):
    name = os.path.basename(fpath)
    mime, _ = mimetypes.guess_type(fpath)
    mime = mime or "application/octet-stream"
    q = f"name='{name}' and '{folder_id}' in parents and trashed=false"
    existing = svc.files().list(q=q, fields="files(id)").execute().get("files", [])
    media = MediaFileUpload(fpath, mimetype=mime, resumable=False)
    if existing:
        svc.files().update(fileId=existing[0]["id"], media_body=media).execute()
        return "actualizado"
    svc.files().create(body={"name": name, "parents": [folder_id]}, media_body=media, fields="id").execute()
    return "creado"

DIR_MAP = [
    ("actas/asignaciones",           "firmadas/asignaciones"),
    ("actas/bajas",                  "bajas"),
    ("uploaded_actas/ventas",        "firmadas/ventas"),
    ("uploaded_actas/asignaciones",  "firmadas/asignaciones"),
    ("uploaded_actas/terminaciones", "firmadas/terminaciones"),
    ("uploaded_actas/ceses",         "firmadas/terminaciones"),
]
DOCX_ROOT_MAP = [
    ("Acta_Recepcion_Celular",     "terminaciones"),
    ("Acta_Recepcion_Computadora", "terminaciones"),
    ("Acta_Celular",               "asignaciones"),
    ("Acta_Entrega",               "asignaciones"),
    ("Acta_Baja",                  "bajas"),
]

ok, err = 0, 0

for local_dir, drive_sub in DIR_MAP:
    full = os.path.join(BASE, local_dir)
    if not os.path.isdir(full): continue
    folder_id = resolve(drive_sub)
    for fname in os.listdir(full):
        if not (fname.endswith(".pdf") or fname.endswith(".docx")): continue
        fpath = os.path.join(full, fname)
        if not os.path.isfile(fpath): continue
        try:
            print(f"OK  {local_dir}/{fname} ({upload(fpath, folder_id)})")
            ok += 1
        except Exception as e:
            print(f"ERR {fname}: {e}"); err += 1

actas_root = os.path.join(BASE, "actas")
if os.path.isdir(actas_root):
    for fname in os.listdir(actas_root):
        if not fname.endswith(".docx"): continue
        fpath = os.path.join(actas_root, fname)
        if not os.path.isfile(fpath): continue
        drive_sub = "asignaciones"
        for prefix, sub in DOCX_ROOT_MAP:
            if fname.startswith(prefix): drive_sub = sub; break
        try:
            print(f"OK  actas/{fname} ({upload(fpath, resolve(drive_sub))})")
            ok += 1
        except Exception as e:
            print(f"ERR {fname}: {e}"); err += 1

print(f"\nTotal: {ok} subidos, {err} errores.")
