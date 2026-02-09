"""
Script para extraer serial_numbers del backup y compararlos con la BD actual
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def get_current_serials():
    """Obtener serial_numbers actuales de la BD"""
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT id, serial_number, device_type, brand, model, status
            FROM devices
            WHERE deleted_at IS NULL
            ORDER BY id
        """))
        
        current = {}
        for row in result:
            current[row[0]] = {
                'id': row[0],
                'serial_number': row[1],
                'device_type': row[2],
                'brand': row[3],
                'model': row[4],
                'status': row[5]
            }
        
        return current

def main():
    print("=" * 80)
    print("EXTRACTOR DE SERIAL NUMBERS")
    print("=" * 80)
    
    # Obtener serials actuales
    current_serials = get_current_serials()
    
    print(f"\nTotal de dispositivos actuales: {len(current_serials)}")
    print("\n" + "=" * 80)
    print("DISPOSITIVOS ACTUALES:")
    print("=" * 80)
    print(f"{'ID':<5} {'Serial':<25} {'Tipo':<15} {'Marca':<15} {'Modelo':<20} {'Status':<10}")
    print("-" * 80)
    
    for device in sorted(current_serials.values(), key=lambda x: x['id']):
        serial = device['serial_number'] or 'NULL'
        print(f"{device['id']:<5} {serial:<25} {device['device_type']:<15} "
              f"{device['brand']:<15} {device['model']:<20} {device['status']:<10}")
    
    # Exportar a archivo
    output_file = "current_serials.txt"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("ID\tSerial Number\tDevice Type\tBrand\tModel\tStatus\n")
        for device in sorted(current_serials.values(), key=lambda x: x['id']):
            serial = device['serial_number'] or 'NULL'
            f.write(f"{device['id']}\t{serial}\t{device['device_type']}\t"
                   f"{device['brand']}\t{device['model']}\t{device['status']}\n")
    
    print(f"\n✓ Exportado a: {output_file}")
    
    # Mostrar estadísticas
    print("\n" + "=" * 80)
    print("ESTADÍSTICAS:")
    print("=" * 80)
    
    by_type = {}
    by_status = {}
    null_serials = 0
    
    for device in current_serials.values():
        # Por tipo
        dtype = device['device_type']
        by_type[dtype] = by_type.get(dtype, 0) + 1
        
        # Por status
        status = device['status']
        by_status[status] = by_status.get(status, 0) + 1
        
        # Serials nulos
        if not device['serial_number']:
            null_serials += 1
    
    print("\nPor tipo de dispositivo:")
    for dtype, count in sorted(by_type.items()):
        print(f"  {dtype}: {count}")
    
    print("\nPor status:")
    for status, count in sorted(by_status.items()):
        print(f"  {status}: {count}")
    
    print(f"\nDispositivos sin serial number: {null_serials}")

if __name__ == "__main__":
    main()
