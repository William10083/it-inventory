from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from routes import inventory, assignments, maintenance, terminations, analytics
import database, models
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import auth
import schemas
from datetime import timedelta

# Create tables
models.Base.metadata.create_all(bind=database.engine)

description = """
API para la gestión de inventario de TI, asignaciones y control de activos.

## 🚀 Cómo usar esta documentación interactiva

1. **Autenticarse**: Haz clic en el botón **"Authorize" 🔓** (arriba a la derecha)
2. **Obtener token**: Usa el endpoint `/login` con tus credenciales
3. **Copiar token**: Del response, copia el valor de `access_token`
4. **Pegar en Authorize**: Pega el token en el campo `bearerAuth (http, Bearer)`
5. **Probar endpoints**: Ahora puedes hacer clic en "Try it out" en cualquier endpoint

## 📦 Módulos Principales

* **Inventario**: Gestión de dispositivos (Laptops, Monitores, Móviles, etc.)
* **Asignaciones**: Control de entrega y devolución de equipos a empleados
* **Documentos**: Generación automática de Actas de Entrega, Devolución y Bajas en PDF
* **Mantenimiento**: Registro de reparaciones y costos
* **Reportes**: Analytics y exportación de datos

## 🔐 Autenticación
El sistema utiliza **OAuth2 con tokens JWT**. La mayoría de endpoints requieren autenticación.

## 💡 Tip
Los **Schemas** al final de la página muestran la estructura de datos de cada modelo.
"""

tags_metadata = [
    {
        "name": "inventory", 
        "description": "📦 **Gestión CRUD de activos de hardware**. Crear, leer, actualizar y eliminar dispositivos del inventario."
    },
    {
        "name": "assignments", 
        "description": "👥 **Asignación y devolución de equipos a personal**. Controla quién tiene qué equipo y genera actas automáticamente."
    },
    {
        "name": "terminations", 
        "description": "🚪 **Procesos de cese de empleados y retorno de activos**. Gestiona el proceso completo de desvinculación."
    },
    {
        "name": "Decommission", 
        "description": "🛑 **Gestión de bajas y retiro de equipos del inventario**. Da de baja equipos obsoletos, dañados o robados con acta formal."
    },
    {
        "name": "Templates", 
        "description": "📄 **Administración de plantillas Word (.docx) para actas**. Sube y configura tus propios formatos de documentos."
    },
    {
        "name": "Actas Status", 
        "description": "✍️ **Seguimiento de firmas y estados de documentos generados**. Monitorea qué actas están firmadas y cuáles pendientes."
    },
    {
        "name": "Sales", 
        "description": "💰 **Módulo de venta de equipos dados de baja**. Registra la venta de activos retirados del inventario."
    },
    {
        "name": "Audit Logs", 
        "description": "📋 **Registro de auditoría de cambios y revertir acciones**. Historial completo de operaciones con capacidad de deshacer."
    },
    {
        "name": "analytics", 
        "description": "📊 **Métricas y datos para dashboards**. Estadísticas de uso, disponibilidad y distribución de equipos."
    },
    {
        "name": "Stats", 
        "description": "📈 **Estadísticas del sistema**. Reportes y contadores generales."
    },
    {
        "name": "Export", 
        "description": "📥 **Exportación de datos**. Descarga reportes en Excel y otros formatos."
    },
    {
        "name": "Software Licenses", 
        "description": "💿 **Gestión de licencias de software**. Control de licencias asignadas y disponibles."
    },
    {
        "name": "maintenance", 
        "description": "🔧 **Registro de mantenimiento y reparaciones**. Historial de servicios técnicos y costos."
    },
    {
        "name": "Alerts", 
        "description": "🔔 **Sistema de alertas y notificaciones**. Avisos de equipos sin asignar, licencias por vencer, etc."
    },
    {
        "name": "Upload Actas", 
        "description": "📤 **Carga de actas firmadas**. Sube documentos escaneados con firmas físicas."
    },
]

import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="🖥️ IT Inventory System API",
    description=description,
    version="2.2.0",
    contact={
        "name": "Soporte TI",
        "email": "soporte@empresa.com",
    },
    openapi_tags=tags_metadata,
    # Configuración mejorada de Swagger UI
    swagger_ui_parameters={
        "defaultModelsExpandDepth": -1,  # Oculta schemas por defecto para UI más limpia
        "docExpansion": "none",  # Colapsa todos los endpoints por defecto
        "filter": True,  # Habilita búsqueda de endpoints
        "syntaxHighlight.theme": "monokai",  # Tema oscuro para código
        "tryItOutEnabled": True,  # Habilita "Try it out" por defecto
    }
)

# CORS - Note: allow_origins=["*"] is not compatible with allow_credentials=True in FastAPI
# If credentials is true, we must specify origins or use a pattern.
# For now, let's keep it simple by setting allow_credentials to True but only with specific origins if needed,
# or set allow_origins=["*"] and allow_credentials=False if cookies aren't used.
# Since we use Bearer tokens, allow_credentials=False is often fine unless you need cookies.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False, # Changed to False for origin wildcard compatibility
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip Compression - Compress responses larger than 1KB
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include routers
app.include_router(inventory.router, tags=["inventory"])
app.include_router(assignments.router, tags=["assignments"])
app.include_router(maintenance.router, tags=["maintenance"])
app.include_router(terminations.router, tags=["terminations"])
app.include_router(analytics.router, tags=["analytics"])
from routes import stats
app.include_router(stats.router, tags=["Stats"])
from routes import export
app.include_router(export.router, tags=["Export"])
from routes import software
app.include_router(software.router, tags=["Software Licenses"])
from routes import audit
app.include_router(audit.router, tags=["Audit Logs"])
from routes import templates
app.include_router(templates.router, tags=["Templates"])
from routes import alerts
app.include_router(alerts.router, tags=["Alerts"])
from routes import upload_actas
app.include_router(upload_actas.router, tags=["Upload Actas"])
from routes import actas_status
app.include_router(actas_status.router, tags=["Actas Status"])
from routes import sales
app.include_router(sales.router, prefix="/sales", tags=["Sales"])
from routes import decommission
app.include_router(decommission.router, prefix="/decommission", tags=["Decommission"])
from routes import form_templates
app.include_router(form_templates.router, tags=["Form Templates"])
from routes import image_builder
app.include_router(image_builder.router, tags=["Image Builder"])

# Serve static files (uploaded images)
import os
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def read_root():
    return {"message": "IT Inventory API is running"}

@app.get("/debug/count")
def debug_count(db: Session = Depends(get_db)):
    try:
        dev_count = db.query(models.Device).count()
        emp_count = db.query(models.Employee).count()
        db_path = str(db.bind.url)
        return {"devices": dev_count, "employees": emp_count, "db_url": db_path}
    except Exception as e:
        return {"error": str(e)}

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login")
async def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login endpoint for frontend that returns access_token directly"""
    user = db.query(models.User).filter(models.User.username == credentials.username).first()
    if not user or not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "username": user.username}

@app.get("/users/me")
async def get_current_user_info(current_user: models.User = Depends(auth.get_current_active_user)):
    """Get current authenticated user information"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "is_active": current_user.is_active
    }
