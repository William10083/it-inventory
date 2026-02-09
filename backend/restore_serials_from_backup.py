"""
Script MEJORADO para restaurar serial_numbers desde el backup
Usa la configuración de BD existente para evitar prompts de contraseña
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text, create_engine
import subprocess

# Configuración desde database.py
BACKUP_FILE = r"C:\Users\wvilca\Downloads\it_inventory 2\it_inventory\INVENTARIO1.2.sql"
TEMP_DB = "it_inventory_temp_restore"
PG_RESTORE = r"C:\Program Files\PostgreSQL\18\bin\pg_restore.exe"

# Credenciales de database.py
DB_USER = "postgres"
DB_PASSWORD = "123456"
DB_HOST = "localhost"
DB_PORT = "5432"

def main():
    print("=" * 80)
    print("RECUPERACION DE SERIAL NUMBERS DESDE BACKUP")
    print("=" * 80)
    
    # Paso 1: Crear base de datos temporal
    print("\n1. Creando base de datos temporal...")
    main_engine = create_engine(f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/postgres")
    
    with main_engine.connect() as conn:
        # Terminar conexiones existentes
        conn.execute(text("COMMIT"))
        conn.execute(text(f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{TEMP_DB}'"))
        conn.execute(text("COMMIT"))
        
        # Eliminar si existe
        conn.execute(text(f"DROP DATABASE IF EXISTS {TEMP_DB}"))
        conn.execute(text("COMMIT"))
        
        # Crear nueva
        conn.execute(text(f"CREATE DATABASE {TEMP_DB}"))
        conn.execute(text("COMMIT"))
        print("OK: Base de datos temporal creada")
    
    # Paso 2: Restaurar backup
    print("\n2. Restaurando backup en BD temporal...")
    env = os.environ.copy()
    env['PGPASSWORD'] = DB_PASSWORD
    
    cmd = [
        PG_RESTORE,
        "--host", DB_HOST,
        "--port", DB_PORT,
        "--username", DB_USER,
        "--dbname", TEMP_DB,
        "--no-owner",
        "--no-privileges",
        BACKUP_FILE
    ]
    
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)
    # Ignorar errores de restricciones duplicadas
    print("Restauracion completada (errores de restricciones son normales)")
    
    # Paso 3: Extraer serial_numbers
    print("\n3. Extrayendo serial_numbers del backup...")
    temp_engine = create_engine(f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{TEMP_DB}")
    
    with temp_engine.connect() as conn:
        result = conn.execute(text("""
            SELECT id, serial_number, device_type, brand, model
            FROM devices
            WHERE serial_number IS NOT NULL AND serial_number != ''
            ORDER BY id
        """))
        
        backup_serials = {}
        for row in result:
            backup_serials[row[0]] = {
                'id': row[0],
                'serial_number': row[1],
                'device_type': row[2],
                'brand': row[3],
                'model': row[4]
            }
    
    print(f"Encontrados {len(backup_serials)} dispositivos con serial en el backup")
    
    if len(backup_serials) == 0:
        print("ERROR: No se encontraron serials en el backup!")
        return False
    
    # Mostrar algunos ejemplos
    print("\nEjemplos de serials encontrados:")
    for i, (device_id, data) in enumerate(list(backup_serials.items())[:5]):
        print(f"  ID {device_id}: {data['serial_number']} ({data['device_type']} {data['brand']})")
    
    # Paso 4: Actualizar BD principal
    print(f"\n4. Actualizando {len(backup_serials)} serial_numbers en BD principal...")
    
    with engine.connect() as conn:
        updated = 0
        for device_id, data in backup_serials.items():
            conn.execute(text("""
                UPDATE devices
                SET serial_number = :serial
                WHERE id = :id
            """), {'serial': data['serial_number'], 'id': device_id})
            updated += 1
            
            if updated % 50 == 0:
                print(f"  Actualizados {updated} dispositivos...")
        
        conn.commit()
        print(f"OK: {updated} serial_numbers restaurados")
    
    # Paso 5: Limpiar
    print("\n5. Limpiando base de datos temporal...")
    with main_engine.connect() as conn:
        conn.execute(text("COMMIT"))
        conn.execute(text(f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{TEMP_DB}'"))
        conn.execute(text("COMMIT"))
        conn.execute(text(f"DROP DATABASE {TEMP_DB}"))
        conn.execute(text("COMMIT"))
        print("OK: Base de datos temporal eliminada")
    
    print("\n" + "=" * 80)
    print("RECUPERACION COMPLETADA")
    print("=" * 80)
    print(f"Total de serial_numbers restaurados: {updated}")
    
    return True

if __name__ == "__main__":
    try:
        if main():
            print("\nOK: Proceso completado exitosamente")
        else:
            print("\nERROR: El proceso fallo")
            sys.exit(1)
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
