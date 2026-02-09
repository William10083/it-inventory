"""
Script para analizar la discrepancia entre empleados activos y dispositivos asignados
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def analyze_device_discrepancy():
    """Analizar discrepancia entre empleados y dispositivos asignados"""
    
    print("=" * 120)
    print("ANALISIS DE DISCREPANCIA: EMPLEADOS vs DISPOSITIVOS ASIGNADOS")
    print("=" * 120)
    
    with engine.connect() as conn:
        # 1. Contar empleados activos por sede
        print("\n1. EMPLEADOS ACTIVOS POR SEDE")
        print("-" * 120)
        
        query_employees = """
        SELECT 
            location,
            COUNT(*) as total_empleados
        FROM employees
        WHERE is_active = true
        GROUP BY location
        ORDER BY location
        """
        
        result = conn.execute(text(query_employees))
        employees_by_location = result.fetchall()
        
        print(f"{'Sede':<20} {'Empleados Activos'}")
        print("-" * 120)
        for row in employees_by_location:
            print(f"{row[0]:<20} {row[1]}")
        
        # 2. Contar dispositivos asignados por tipo y sede (incluyendo empleados inactivos)
        print("\n\n2. DISPOSITIVOS ASIGNADOS POR TIPO Y SEDE (Incluyendo empleados inactivos)")
        print("-" * 120)
        
        query_devices = """
        SELECT 
            e.location,
            d.device_type,
            COUNT(*) as total_asignados,
            COUNT(CASE WHEN e.is_active = true THEN 1 END) as asignados_activos,
            COUNT(CASE WHEN e.is_active = false THEN 1 END) as asignados_inactivos
        FROM assignments a
        JOIN devices d ON a.device_id = d.id
        JOIN employees e ON a.employee_id = e.id
        WHERE a.returned_date IS NULL
        GROUP BY e.location, d.device_type
        ORDER BY e.location, d.device_type
        """
        
        result = conn.execute(text(query_devices))
        devices_by_location = result.fetchall()
        
        print(f"{'Sede':<20} {'Tipo':<20} {'Total Asignados':<20} {'Activos':<15} {'Inactivos'}")
        print("-" * 120)
        for row in devices_by_location:
            location = row[0] or 'N/A'
            device_type = row[1]
            total = row[2]
            activos = row[3]
            inactivos = row[4]
            print(f"{location:<20} {device_type:<20} {total:<20} {activos:<15} {inactivos}")
        
        # 3. Empleados inactivos con dispositivos asignados
        print("\n\n3. EMPLEADOS INACTIVOS CON DISPOSITIVOS ASIGNADOS")
        print("-" * 120)
        
        query_inactive = """
        SELECT 
            e.full_name,
            e.location,
            d.device_type,
            d.brand || ' ' || d.model as dispositivo,
            d.serial_number
        FROM employees e
        JOIN assignments a ON e.id = a.employee_id
        JOIN devices d ON a.device_id = d.id
        WHERE e.is_active = false
            AND a.returned_date IS NULL
        ORDER BY e.location, e.full_name, d.device_type
        """
        
        result = conn.execute(text(query_inactive))
        inactive_assignments = result.fetchall()
        
        if inactive_assignments:
            print(f"{'Empleado':<30} {'Sede':<15} {'Tipo':<20} {'Dispositivo':<30} {'Serie'}")
            print("-" * 120)
            for row in inactive_assignments:
                empleado = row[0]
                location = row[1] or 'N/A'
                device_type = row[2]
                dispositivo = row[3]
                serial = row[4] or 'N/A'
                print(f"{empleado:<30} {location:<15} {device_type:<20} {dispositivo:<30} {serial}")
        else:
            print("No hay empleados inactivos con dispositivos asignados.")
        
        # 4. Resumen específico para Callao
        print("\n\n4. RESUMEN DETALLADO - SEDE CALLAO")
        print("-" * 120)
        
        query_callao = """
        SELECT 
            d.device_type,
            COUNT(*) as total_asignados,
            COUNT(DISTINCT e.id) as empleados_unicos,
            COUNT(*) - COUNT(DISTINCT e.id) as diferencia
        FROM assignments a
        JOIN devices d ON a.device_id = d.id
        JOIN employees e ON a.employee_id = e.id
        WHERE a.returned_date IS NULL
            AND e.location = 'Callao'
            AND e.is_active = true
            AND d.device_type IN ('mochila', 'kit teclado/mouse', 'auriculares')
        GROUP BY d.device_type
        ORDER BY d.device_type
        """
        
        result = conn.execute(text(query_callao))
        callao_summary = result.fetchall()
        
        print(f"{'Tipo':<25} {'Total Asignados':<20} {'Empleados Únicos':<20} {'Diferencia'}")
        print("-" * 120)
        for row in callao_summary:
            device_type = row[0]
            total = row[1]
            unicos = row[2]
            diferencia = row[3]
            print(f"{device_type:<25} {total:<20} {unicos:<20} {diferencia}")
        
        # 5. Empleados con múltiples del mismo tipo en Callao
        print("\n\n5. EMPLEADOS EN CALLAO CON MULTIPLES DISPOSITIVOS DEL MISMO TIPO")
        print("-" * 120)
        
        query_multiples = """
        SELECT 
            e.full_name,
            d.device_type,
            COUNT(*) as cantidad,
            STRING_AGG(d.serial_number || ' (' || d.brand || ')', ', ') as dispositivos
        FROM employees e
        JOIN assignments a ON e.id = a.employee_id
        JOIN devices d ON a.device_id = d.id
        WHERE a.returned_date IS NULL
            AND e.is_active = true
            AND e.location = 'Callao'
            AND d.device_type IN ('mochila', 'kit teclado/mouse', 'auriculares')
        GROUP BY e.id, e.full_name, d.device_type
        HAVING COUNT(*) > 1
        ORDER BY d.device_type, e.full_name
        """
        
        result = conn.execute(text(query_multiples))
        multiples = result.fetchall()
        
        if multiples:
            print(f"{'Empleado':<30} {'Tipo':<25} {'Cantidad':<10} {'Dispositivos'}")
            print("-" * 120)
            for row in multiples:
                empleado = row[0]
                device_type = row[1]
                cantidad = row[2]
                dispositivos = row[3]
                print(f"{empleado:<30} {device_type:<25} {cantidad:<10} {dispositivos}")
        else:
            print("No hay empleados con múltiples dispositivos del mismo tipo.")

if __name__ == "__main__":
    try:
        analyze_device_discrepancy()
        print("\n" + "=" * 120)
        print("ANALISIS COMPLETADO")
        print("=" * 120)
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
