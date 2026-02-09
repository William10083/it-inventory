from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# PostgreSQL Database URL
# En la nube (Render/Railway/Heroku) la variable DATABASE_URL suele estar definida
SQLALCHEMY_DATABASE_URL = os.getenv('DATABASE_URL')

# Si no hay DATABASE_URL, construirla desde las variables individuales (Local)
if not SQLALCHEMY_DATABASE_URL:
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'it_inventory')
    
    SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    
    print(f"DEBUG: DB_USER={DB_USER}")
    print(f"DEBUG: DB_PASSWORD={DB_PASSWORD} (len={len(str(DB_PASSWORD)) if DB_PASSWORD else 0})")
    print(f"DEBUG: DB_HOST={DB_HOST}")
    print(f"DEBUG: DB_NAME={DB_NAME}")
    
    print("--- DB CONFIGURATION ---")
    print(f"Database: PostgreSQL")
    print(f"Host: {DB_HOST}:{DB_PORT}")
    print(f"Database Name: {DB_NAME}")
    print(f"User: {DB_USER}")
else:
    # Fix para SQLAlchemy que requiere postgresql:// en vez de postgres://
    if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)
    print("DEBUG: Using DATABASE_URL from environment")
    print("--- DB CONFIGURATION ---")
    print(f"Database URL: {SQLALCHEMY_DATABASE_URL}")


engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
