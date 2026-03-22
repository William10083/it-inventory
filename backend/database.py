from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

logger = logging.getLogger(__name__)

# PostgreSQL Database URL
SQLALCHEMY_DATABASE_URL = os.getenv('DATABASE_URL')

# Si no hay DATABASE_URL, construirla desde las variables individuales (Local)
if not SQLALCHEMY_DATABASE_URL:
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'it_inventory')
    SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    logger.info(f"DB: local PostgreSQL @ {DB_HOST}:{DB_PORT}/{DB_NAME} (user={DB_USER})")
else:
    # Fix para SQLAlchemy que requiere postgresql:// en vez de postgres://
    if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)
    logger.info("DB: using DATABASE_URL from environment")

# Detectar si es Supabase (pooler: supabase.com / directo: supabase.co)
_is_supabase = "supabase.com" in SQLALCHEMY_DATABASE_URL or "supabase.co" in SQLALCHEMY_DATABASE_URL

# PgBouncer (Supabase pooler) requiere:
# - SSL (sslmode=require)
# - Pool pequeño (ya hay pooling externo)
# - Pool corto (pool_recycle bajo)
_connect_args = {}
if _is_supabase:
    _connect_args = {
        "sslmode": "require",
        "connect_timeout": 10,
    }
    _pool_size = 3
    _max_overflow = 5
    _pool_recycle = 300   # 5 min
else:
    _pool_size = 10
    _max_overflow = 20
    _pool_recycle = 3600  # 1 hora

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=_pool_size,
    max_overflow=_max_overflow,
    pool_pre_ping=True,
    pool_recycle=_pool_recycle,
    connect_args=_connect_args,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
