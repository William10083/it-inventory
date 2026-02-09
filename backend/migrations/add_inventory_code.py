"""
Script de migración para agregar columna inventory_code a la tabla devices
y migrar datos existentes de hostname a inventory_code para monitores.
"""
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine, SessionLocal
import models

def migrate_inventory_code():
    """
    1. Agregar columna inventory_code a la tabla devices
    2. Migrar códigos de inventario de monitores de hostname a inventory_code
    """
    
    print("=" * 60)
    print("MIGRACION: Agregar campo inventory_code")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # Step 1: Add column inventory_code if it doesn't exist
        print("\n[1/3] Verificando si la columna inventory_code existe...")
        
        # Check if column exists
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='devices' AND column_name='inventory_code'
        """))
        
        if result.fetchone():
            print("[OK] La columna inventory_code ya existe")
        else:
            print("[->] Agregando columna inventory_code...")
            db.execute(text("ALTER TABLE devices ADD COLUMN inventory_code VARCHAR"))
            db.commit()
            print("[OK] Columna inventory_code agregada exitosamente")
        
        # Step 2: Migrate monitor inventory codes from hostname to inventory_code
        print("\n[2/3] Migrando codigos de inventario de monitores...")
        
        # Get all monitors with hostname
        monitors = db.query(models.Device).filter(
            models.Device.device_type == 'monitor',
            models.Device.hostname.isnot(None),
            models.Device.hostname != '',
            models.Device.hostname != '-'
        ).all()
        
        migrated_count = 0
        for monitor in monitors:
            # Move hostname to inventory_code
            monitor.inventory_code = monitor.hostname
            # Clear hostname for monitors (they don't have hostnames)
            monitor.hostname = None
            migrated_count += 1
        
        db.commit()
        print(f"[OK] Migrados {migrated_count} codigos de inventario de monitores")
        
        # Step 3: Report summary
        print("\n[3/3] Resumen de migracion:")
        
        # Count devices with inventory_code
        devices_with_code = db.query(models.Device).filter(
            models.Device.inventory_code.isnot(None),
            models.Device.inventory_code != '',
            models.Device.inventory_code != '-'
        ).count()
        
        # Count laptops with hostname
        laptops_with_hostname = db.query(models.Device).filter(
            models.Device.device_type == 'laptop',
            models.Device.hostname.isnot(None),
            models.Device.hostname != '',
            models.Device.hostname != '-'
        ).count()
        
        print(f"  - Dispositivos con codigo de inventario: {devices_with_code}")
        print(f"  - Laptops con hostname: {laptops_with_hostname}")
        
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
    migrate_inventory_code()
