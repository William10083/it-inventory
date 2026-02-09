"""
Script para análisis detallado de discrepancias en asignaciones por sede
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def detailed_analysis_by_location():
    """Análisis detallado de empleados vs dispositivos por sede"""
    
    print("=" * 120)
    print("ANALISIS DETALLADO: EMPLEADOS vs DISPOSITIVOS POR SEDE")
    print("=" * 120)
    
    locations = ['Callao', 'San Isidro', 'Mollendo', 'Ilo', 'Chimbote']
    
    with engine.connect() as conn:
        for location in locations:
            print(f"\n{'='*120}")
            print(f"SEDE: {location}")
            print(f"{'='*120}")
            
            # 1. Contar empleados activos
            result = conn.execute(text("""
                SELECT COUNT(*) 
                FROM employees 
                WHERE is_active = true AND location = :location
            """), {"location": location})
            active_employees = result.scalar()
            
            print(f"\nEmpleados activos: {active_employees}")
            
            # 2. Dispositivos asignados por tipo
            result = conn.execute(text("""
                SELECT 
                    d.device_type,
                    COUNT(*) as total_asignados,
                    COUNT(DISTINCT a.employee_id) as empleados_unicos
                FROM assignments a
                JOIN devices d ON a.device_id = d.id
                JOIN employees e ON a.employee_id = e.id
                WHERE a.returned_date IS NULL
                    AND e.location = :location
                    AND e.is_active = true
                    AND d.device_type IN ('mochila', 'kit teclado/mouse', 'auriculares', 'laptop', 'monitor', 'celular')
                GROUP BY d.device_type
                ORDER BY d.device_type
            """), {"location": location})
            
            devices = result.fetchall()
            
            print(f"\n{'Tipo Dispositivo':<25} {'Total Asignados':<20} {'Empleados Únicos':<20} {'Diferencia'}")
            print("-" * 120)
            
            for row in devices:
                device_type = row[0]
                total = row[1]
                unicos = row[2]
                diferencia = total - unicos
                
                # Marcar si hay discrepancia
                marker = " (!)" if diferencia > 0 else ""
                print(f"{device_type:<25} {total:<20} {unicos:<20} {diferencia}{marker}")
            
            # 3. Empleados con múltiples del mismo tipo
            result = conn.execute(text("""
                SELECT 
                    e.full_name,
                    d.device_type,
                    COUNT(*) as cantidad,
                    STRING_AGG(d.serial_number || ' (' || d.brand || ' ' || d.model || ')', ' | ') as dispositivos
                FROM employees e
                JOIN assignments a ON e.id = a.employee_id
                JOIN devices d ON a.device_id = d.id
                WHERE a.returned_date IS NULL
                    AND e.is_active = true
                    AND e.location = :location
                    AND d.device_type IN ('mochila', 'kit teclado/mouse', 'auriculares', 'laptop', 'monitor', 'celular')
                GROUP BY e.id, e.full_name, d.device_type
                HAVING COUNT(*) > 1
                ORDER BY d.device_type, e.full_name
            """), {"location": location})
            
            multiples = result.fetchall()
            
            if multiples:
                print(f"\n{'Empleado':<30} {'Tipo':<25} {'Cantidad':<10} {'Dispositivos'}")
                print("-" * 120)
                for row in multiples:
                    empleado = row[0]
                    device_type = row[1]
                    cantidad = row[2]
                    dispositivos = row[3][:80] + "..." if len(row[3]) > 80 else row[3]
                    print(f"{empleado:<30} {device_type:<25} {cantidad:<10} {dispositivos}")
            
            # 4. Empleados sin ciertos dispositivos
            result = conn.execute(text("""
                SELECT 
                    e.full_name,
                    e.id,
                    CASE WHEN laptop_count > 0 THEN 'Sí' ELSE 'No' END as tiene_laptop,
                    CASE WHEN monitor_count > 0 THEN 'Sí' ELSE 'No' END as tiene_monitor,
                    CASE WHEN kit_count > 0 THEN 'Sí' ELSE 'No' END as tiene_kit,
                    CASE WHEN mochila_count > 0 THEN 'Sí' ELSE 'No' END as tiene_mochila,
                    CASE WHEN auriculares_count > 0 THEN 'Sí' ELSE 'No' END as tiene_auriculares
                FROM employees e
                LEFT JOIN (
                    SELECT 
                        a.employee_id,
                        SUM(CASE WHEN d.device_type = 'laptop' THEN 1 ELSE 0 END) as laptop_count,
                        SUM(CASE WHEN d.device_type = 'monitor' THEN 1 ELSE 0 END) as monitor_count,
                        SUM(CASE WHEN d.device_type = 'kit teclado/mouse' THEN 1 ELSE 0 END) as kit_count,
                        SUM(CASE WHEN d.device_type = 'mochila' THEN 1 ELSE 0 END) as mochila_count,
                        SUM(CASE WHEN d.device_type = 'auriculares' THEN 1 ELSE 0 END) as auriculares_count
                    FROM assignments a
                    JOIN devices d ON a.device_id = d.id
                    WHERE a.returned_date IS NULL
                    GROUP BY a.employee_id
                ) counts ON e.id = counts.employee_id
                WHERE e.is_active = true
                    AND e.location = :location
                    AND (laptop_count IS NULL OR monitor_count IS NULL OR kit_count IS NULL 
                         OR mochila_count IS NULL OR auriculares_count IS NULL
                         OR laptop_count = 0 OR monitor_count = 0 OR kit_count = 0
                         OR mochila_count = 0 OR auriculares_count = 0)
                ORDER BY e.full_name
            """), {"location": location})
            
            missing = result.fetchall()
            
            if missing:
                print(f"\nEmpleados sin equipos completos:")
                print(f"{'Empleado':<30} {'Laptop':<10} {'Monitor':<10} {'Kit':<10} {'Mochila':<10} {'Auriculares'}")
                print("-" * 120)
                for row in missing:
                    print(f"{row[0]:<30} {row[2]:<10} {row[3]:<10} {row[4]:<10} {row[5]:<10} {row[6]}")

if __name__ == "__main__":
    try:
        detailed_analysis_by_location()
        print("\n" + "=" * 120)
        print("ANALISIS COMPLETADO")
        print("=" * 120)
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
