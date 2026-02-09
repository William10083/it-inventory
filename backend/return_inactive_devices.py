"""
Script para devolver dispositivos de empleados inactivos
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def return_inactive_employee_devices():
    """Devolver todos los dispositivos de empleados inactivos"""
    
    print("=" * 100)
    print("DEVOLVIENDO DISPOSITIVOS DE EMPLEADOS INACTIVOS")
    print("=" * 100)
    
    with engine.connect() as conn:
        # 1. Obtener asignaciones de empleados inactivos
        query = """
        SELECT 
            a.id as assignment_id,
            e.full_name,
            e.location,
            d.device_type,
            d.brand || ' ' || d.model as dispositivo,
            d.serial_number,
            d.id as device_id
        FROM employees e
        JOIN assignments a ON e.id = a.employee_id
        JOIN devices d ON a.device_id = d.id
        WHERE e.is_active = false
            AND a.returned_date IS NULL
        ORDER BY e.full_name, d.device_type
        """
        
        result = conn.execute(text(query))
        assignments = result.fetchall()
        
        if not assignments:
            print("\nNo hay dispositivos asignados a empleados inactivos.")
            return
        
        print(f"\nSe encontraron {len(assignments)} dispositivos asignados a empleados inactivos:\n")
        print(f"{'Empleado':<30} {'Sede':<15} {'Tipo':<20} {'Dispositivo':<30} {'Serie'}")
        print("-" * 100)
        
        for row in assignments:
            empleado = row[1]
            location = row[2] or 'N/A'
            device_type = row[3]
            dispositivo = row[4]
            serial = row[5] or 'N/A'
            print(f"{empleado:<30} {location:<15} {device_type:<20} {dispositivo:<30} {serial}")
        
        # 2. Devolver dispositivos
        print(f"\n{'='*100}")
        print("PROCESANDO DEVOLUCIONES...")
        print(f"{'='*100}\n")
        
        returned_count = 0
        
        for row in assignments:
            assignment_id = row[0]
            device_id = row[6]
            empleado = row[1]
            device_type = row[3]
            
            try:
                # Marcar asignación como devuelta
                conn.execute(text("""
                    UPDATE assignments 
                    SET returned_date = NOW() 
                    WHERE id = :assignment_id
                """), {"assignment_id": assignment_id})
                
                # Cambiar estado del dispositivo a available
                conn.execute(text("""
                    UPDATE devices 
                    SET status = 'available' 
                    WHERE id = :device_id
                """), {"device_id": device_id})
                
                conn.commit()
                
                print(f"OK Devuelto: {device_type} de {empleado}")
                returned_count += 1
                
            except Exception as e:
                print(f"ERROR devolviendo {device_type} de {empleado}: {e}")
                conn.rollback()
        
        print(f"\n{'='*100}")
        print(f"RESUMEN: {returned_count} de {len(assignments)} dispositivos devueltos exitosamente")
        print(f"{'='*100}")

if __name__ == "__main__":
    try:
        return_inactive_employee_devices()
        print("\nOK Proceso completado")
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
