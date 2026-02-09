"""
Script para resetear las secuencias de IDs después de restaurar datos
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def reset_sequences():
    """Resetear todas las secuencias de ID a sus valores máximos"""
    
    sequences = [
        ('devices', 'devices_id_seq'),
        ('employees', 'employees_id_seq'),
        ('assignments', 'assignments_id_seq'),
        ('sales', 'sales_id_seq'),
        ('sale_items', 'sale_items_id_seq'),
        ('users', 'users_id_seq'),
        ('terminations', 'terminations_id_seq'),
        ('decommissions', 'decommissions_id_seq'),
        ('audit_logs', 'audit_logs_id_seq'),
        ('custom_software', 'custom_software_id_seq'),
        ('software_profiles', 'software_profiles_id_seq'),
        ('form_templates', 'form_templates_id_seq'),
        ('document_templates', 'document_templates_id_seq'),
    ]
    
    print("=" * 80)
    print("RESETEO DE SECUENCIAS DE IDs")
    print("=" * 80)
    
    with engine.connect() as conn:
        for table_name, sequence_name in sequences:
            # Obtener el ID máximo actual
            result = conn.execute(text(f"SELECT MAX(id) FROM {table_name}"))
            max_id = result.scalar()
            
            if max_id is None or max_id == 0:
                # Para tablas vacías, resetear a 1 sin marcar como "usado"
                conn.execute(text(f"SELECT setval('{sequence_name}', 1, false)"))
                conn.commit()
                print(f"OK {table_name:<25} -> secuencia reseteada a 1 (tabla vacía)")
            else:
                # Resetear la secuencia al máximo ID
                conn.execute(text(f"SELECT setval('{sequence_name}', {max_id}, true)"))
                conn.commit()
                print(f"OK {table_name:<25} -> secuencia reseteada a {max_id}")
    
    print("\n" + "=" * 80)
    print("SECUENCIAS RESETEADAS EXITOSAMENTE")
    print("=" * 80)

if __name__ == "__main__":
    try:
        reset_sequences()
        print("\nOK: Proceso completado")
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
