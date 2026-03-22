import os
import time
import logging
from collections import defaultdict
from datetime import timedelta

from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from routes import inventory, assignments, maintenance, terminations, analytics
from database import get_db
import database, models, auth, schemas

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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Environment config
# ──────────────────────────────────────────────────────────────────────────────
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
_IS_PROD = ENVIRONMENT == "production"

# CORS: en producción leer desde env var; en desarrollo permitir localhost
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# ──────────────────────────────────────────────────────────────────────────────
# Security middleware classes
# ──────────────────────────────────────────────────────────────────────────────

class LoginRateLimitMiddleware(BaseHTTPMiddleware):
    """
    Bloquea IPs que superen MAX_ATTEMPTS intentos de login en WINDOW_SECONDS.
    Protege /login y /token contra ataques de fuerza bruta.
    """
    MAX_ATTEMPTS = 5
    WINDOW_SECONDS = 60
    _PROTECTED = {"/login", "/token"}
    _log: dict = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if request.method == "POST" and request.url.path in self._PROTECTED:
            ip = request.client.host if request.client else "unknown"
            now = time.monotonic()
            # Limpiar intentos fuera de la ventana
            self._log[ip] = [t for t in self._log[ip] if now - t < self.WINDOW_SECONDS]
            if len(self._log[ip]) >= self.MAX_ATTEMPTS:
                logger.warning(f"Rate limit superado en {request.url.path} desde IP {ip}")
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Demasiados intentos. Espera 1 minuto antes de intentar de nuevo."},
                )
            self._log[ip].append(now)
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Agrega headers de seguridad estándar a todas las respuestas."""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response


# ──────────────────────────────────────────────────────────────────────────────
# App — docs deshabilitados en producción
# ──────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="IT Inventory System API",
    description=description,
    version="2.2.0",
    contact={"name": "Soporte TI", "email": "soporte@empresa.com"},
    openapi_tags=tags_metadata,
    # En producción no exponer la documentación interactiva
    docs_url=None if _IS_PROD else "/docs",
    redoc_url=None if _IS_PROD else "/redoc",
    openapi_url=None if _IS_PROD else "/openapi.json",
    swagger_ui_parameters={
        "defaultModelsExpandDepth": -1,
        "docExpansion": "none",
        "filter": True,
        "syntaxHighlight.theme": "monokai",
        "tryItOutEnabled": True,
    },
)

# Handler global: captura excepciones no controladas y las loguea correctamente
# Evita que BaseHTTPMiddleware las trague y devuelva "Internal Server Error" opaco
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {type(exc).__name__}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor. Revisa los logs para más detalles."},
    )

@app.on_event("startup")
async def startup_db():
    """Crear tablas en el startup (no en import time) para que un error de DB no impida arrancar."""
    try:
        models.Base.metadata.create_all(bind=database.engine)
        logger.info("DB: tablas verificadas/creadas correctamente")
    except Exception as e:
        logger.error(f"DB: error al crear tablas en startup: {type(e).__name__}: {e}")
        # No re-raise — la app arranca igual; los endpoints fallarán con error claro si DB no responde

# Validar SECRET_KEY al arrancar — falla rápido si está en default
@app.on_event("startup")
async def validate_secret_key():
    secret = os.getenv("SECRET_KEY", "")
    if not secret or secret == "supersecretkey_change_me_in_production":
        if _IS_PROD:
            raise RuntimeError(
                "SECRET_KEY no configurada o usa el valor por defecto. "
                "Define la variable de entorno SECRET_KEY antes de iniciar en producción."
            )
        else:
            logger.warning(
                "ADVERTENCIA DE SEGURIDAD: SECRET_KEY usa el valor por defecto. "
                "Configura SECRET_KEY en producción."
            )

# Middleware (orden: primero se registra = más externo = ejecuta primero)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LoginRateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
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
from routes import powerbi
app.include_router(powerbi.router, tags=["Power BI"])

# Serve static files (uploaded images)
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def read_root():
    return {"message": "IT Inventory API is running"}

@app.get("/debug/count")
def debug_count(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.get_current_active_user),
):
    """Endpoint de diagnóstico — requiere autenticación. No expone DB URL."""
    try:
        dev_count = db.query(models.Device).count()
        emp_count = db.query(models.Employee).count()
        return {"devices": dev_count, "employees": emp_count}
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
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "must_change_password": bool(user.must_change_password)
    }

@app.get("/users/me")
async def get_current_user_info(current_user: models.User = Depends(auth.get_current_active_user)):
    """Get current authenticated user information"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name or "",
        "dni": current_user.dni or "",
        "role": current_user.role,
        "is_active": current_user.is_active,
        "must_change_password": bool(current_user.must_change_password)
    }

@app.put("/users/me")
async def update_current_user_profile(
    profile: schemas.UserProfileUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile (full_name, dni)"""
    if profile.full_name is not None:
        current_user.full_name = profile.full_name
    if profile.dni is not None:
        current_user.dni = profile.dni
    db.commit()
    db.refresh(current_user)
    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name or "",
        "dni": current_user.dni or "",
        "role": current_user.role,
        "is_active": current_user.is_active,
        "must_change_password": bool(current_user.must_change_password)
    }

@app.post("/users/change-password")
async def change_password(
    request: schemas.ChangePasswordRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change current user's password"""
    if not auth.verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")
    current_user.hashed_password = auth.get_password_hash(request.new_password)
    current_user.must_change_password = False
    db.commit()
    return {"message": "Contraseña cambiada exitosamente"}

@app.get("/users")
async def list_users(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all users (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    users = db.query(models.User).order_by(models.User.id).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name or "",
            "dni": u.dni or "",
            "role": u.role,
            "is_active": u.is_active,
            "must_change_password": bool(u.must_change_password)
        }
        for u in users
    ]

@app.post("/users")
async def create_user(
    user_data: schemas.UserCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new IT user with a temporary password (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    existing = db.query(models.User).filter(models.User.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")
    if len(user_data.temporary_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña temporal debe tener al menos 6 caracteres")
    new_user = models.User(
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=auth.get_password_hash(user_data.temporary_password),
        role="user",
        is_active=True,
        must_change_password=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {
        "id": new_user.id,
        "username": new_user.username,
        "full_name": new_user.full_name or "",
        "role": new_user.role,
        "is_active": new_user.is_active,
        "must_change_password": True
    }

@app.get("/users/me/email-config")
async def get_email_config(current_user: models.User = Depends(auth.get_current_active_user)):
    """Get current user's SMTP configuration (password is never returned)"""
    return {
        "smtp_email": current_user.smtp_email or "",
        "smtp_server": current_user.smtp_server or "",
        "smtp_port": current_user.smtp_port or 587,
        "configured": bool(current_user.smtp_email and current_user.smtp_password_enc)
    }

@app.put("/users/me/email-config")
async def update_email_config(
    config: schemas.SmtpConfigUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Save SMTP configuration for the current user"""
    import email_service
    current_user.smtp_email = config.smtp_email
    current_user.smtp_password_enc = email_service.encrypt_password(config.smtp_password)
    db.commit()
    return {"message": "Configuración de correo guardada"}

@app.post("/send-email")
async def send_email_endpoint(
    req: schemas.SendEmailRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
):
    """Send an email using the current user's SMTP configuration"""
    import email_service
    if not current_user.smtp_email or not current_user.smtp_password_enc:
        raise HTTPException(
            status_code=400,
            detail="No tienes configurado el correo. Ve a Configuración → Correo."
        )
    try:
        email_service.send_email(
            smtp_email=current_user.smtp_email,
            smtp_password_enc=current_user.smtp_password_enc,
            to_email=req.to_email,
            subject=req.subject,
            body_html=req.body_html,
            cc_email=req.cc_email,
        )
        return {"message": "Correo enviado exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al enviar correo: {str(e)}")

@app.put("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Enable or disable a user account (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "username": user.username, "is_active": user.is_active}
