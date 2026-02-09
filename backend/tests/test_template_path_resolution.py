"""
Script para probar la resolución de rutas de templates
"""
import sys
import os
sys.path.append(r'C:\Users\wvilca\Downloads\it_inventory 2\it_inventory\backend')

from database import SessionLocal
from models import DocumentTemplate

db = SessionLocal()

try:
    # Obtener template
    template = db.query(DocumentTemplate).filter(DocumentTemplate.id == 6).first()
    
    print("="*80)
    print("TEMPLATE INFO")
    print("="*80)
    print(f"Name: {template.name}")
    print(f"File Path (from DB): {template.file_path}")
    
    # Simular la resolución de ruta en generate_batch_acta
    template_path = template.file_path
    backend_dir = r'C:\Users\wvilca\Downloads\it_inventory 2\it_inventory\backend'
    
    print("\n" + "="*80)
    print("PATH RESOLUTION SIMULATION")
    print("="*80)
    
    # Caso 1: Path relativo (como viene de la DB)
    if not os.path.isabs(template_path):
        print(f"Path is relative: {template_path}")
        
        # Intentar resolverlo relativo al backend
        full_path = os.path.join(backend_dir, template_path)
        print(f"Resolved to: {full_path}")
        print(f"Exists: {os.path.exists(full_path)}")
        
        if os.path.exists(full_path):
            print(f"\n[OK] Template found at: {full_path}")
        else:
            print(f"\n[ERROR] Template NOT found at: {full_path}")
            
            # Buscar el archivo
            templates_dir = os.path.join(backend_dir, "templates")
            if os.path.exists(templates_dir):
                print(f"\nSearching in templates directory...")
                for file in os.listdir(templates_dir):
                    if "ACTA_DE_ENTREGA_EQUIPO_COMPUTO" in file:
                        print(f"  Found: {file}")
    
finally:
    db.close()
