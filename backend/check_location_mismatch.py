"""
Script para verificar discrepancia entre device.location y employee.location
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def check_location_mismatch():
    """Verificar dispositivos asignados donde device.location != employee.location"""
    
    print("=" * 120)
    print("VERIFICANDO DISCREPANCIA: device.location vs employee.location")
    print("=" * 120)
    
    with engine.connect() as conn:
        # Dispositivos asignados donde la ubicación no coincide
        result = conn.execute(text("""
            SELECT 
                e.full_name as empleado,
                e.location as empleado_location,
                d.device_type,
                d.brand || ' ' || d.model as dispositivo,
                d.serial_number,
                d.location as device_location
            FROM assignments a
            JOIN devices d ON a.device_id = d.id
            JOIN employees e ON a.employee_id = e.id
            WHERE a.returned_date IS NULL
                AND e.is_active = true
                AND d.location != e.location
            ORDER BY e.location, d.device_type, e.full_name
        """))
        
        mismatches = result.fetchall()
        
        if mismatches:
            print(f"\nSe encontraron {len(mismatches)} dispositivos con ubicación diferente al empleado:\n")
            print(f"{'Empleado':<30} {'Emp.Loc':<15} {'Tipo':<20} {'Dev.Loc':<15} {'Dispositivo'}")
            print("-" * 120)
            
            for row in mismatches:
                empleado = row[0]
                emp_loc = row[1] or 'N/A'
                device_type = row[2]
                dev_loc = row[5] or 'N/A'
                dispositivo = row[3][:40]
                
                print(f"{empleado:<30} {emp_loc:<15} {device_type:<20} {dev_loc:<15} {dispositivo}")
        else:
            print("\nNo hay discrepancias. Todas las ubicaciones coinciden.")
        
        # Resumen por tipo de dispositivo
        print(f"\n{'='*120}")
        print("RESUMEN POR TIPO DE DISPOSITIVO")
        print(f"{'='*120}")
        
        result = conn.execute(text("""
            SELECT 
                d.device_type,
                COUNT(*) as total_mismatches
            FROM assignments a
            JOIN devices d ON a.device_id = d.id
            JOIN employees e ON a.employee_id = e.id
            WHERE a.returned_date IS NULL
                AND e.is_active = true
                AND d.location != e.location
            GROUP BY d.device_type
            ORDER BY total_mismatches DESC
        """))
        
        summary = result.fetchall()
        
        if summary:
            print(f"\n{'Tipo Dispositivo':<25} {'Total Discrepancias'}")
            print("-" * 120)
            for row in summary:
                print(f"{row[0]:<25} {row[1]}")

if __name__ == "__main__":
    try:
        check_location_mismatch()
        print("\n" + "=" * 120)
        print("ANALISIS COMPLETADO")
        print("=" * 120)
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
