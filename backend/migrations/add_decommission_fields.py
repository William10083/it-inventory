"""
Script de migración para agregar campos adicionales a la tabla decommissions
"""
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import SessionLocal

def migrate_decommission_fields():
    """
    Agregar campos adicionales a la tabla decommissions:
    - fabrication_year (Integer)
    - purchase_reason (String)
    - device_image_path (String)
    - serial_image_path (String)
    """
    
    print("=" * 60)
    print("MIGRACION: Agregar campos adicionales a decommissions")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # List of columns to add
        columns_to_add = [
            ("fabrication_year", "INTEGER"),
            ("purchase_reason", "VARCHAR"),
            ("device_image_path", "VARCHAR"),
            ("serial_image_path", "VARCHAR")
        ]
        
        for column_name, column_type in columns_to_add:
            print(f"\n[->] Verificando columna '{column_name}'...")
            
            # Check if column exists
            result = db.execute(text(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='decommissions' AND column_name='{column_name}'
            """))
            
            if result.fetchone():
                print(f"[OK] La columna '{column_name}' ya existe")
            else:
                print(f"[->] Agregando columna '{column_name}'...")
                db.execute(text(f"ALTER TABLE decommissions ADD COLUMN {column_name} {column_type}"))
                db.commit()
                print(f"[OK] Columna '{column_name}' agregada exitosamente")
        
        print("\n" + "=" * 60)
        print("[OK] MIGRACION COMPLETADA EXITOSAMENTE")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n[ERROR] durante la migracion: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate_decommission_fields()
