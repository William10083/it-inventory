"""
Script de prueba para verificar el mapeo dinámico de placeholders de tabla.
Este script simula la generación de un acta para verificar que el placeholder
correcto se identifica desde el mapeo de variables del template.
"""
import sys
sys.path.append(r'C:\Users\wvilca\Downloads\it_inventory 2\it_inventory\backend')

from database import SessionLocal
from models import DocumentTemplate
import json

db = SessionLocal()

try:
    # Obtener template de ASSIGNMENT_COMPUTER (ID 6)
    template = db.query(DocumentTemplate).filter(DocumentTemplate.id == 6).first()
    
    if not template:
        print("ERROR: Template ID 6 not found")
        sys.exit(1)
    
    print(f"Template: {template.name}")
    print(f"Type: {template.template_type}")
    print(f"File: {template.file_path}")
    print("\n" + "="*80)
    
    # Parsear variables
    if isinstance(template.variables, str):
        variables = json.loads(template.variables)
    else:
        variables = template.variables
    
    print("\nVariable Mappings:")
    for var in variables:
        print(f"  {var.get('name')} -> {var.get('map_to')}")
    
    print("\n" + "="*80)
    
    # Simular la lógica de insert_devices_table_at_placeholder
    table_variables = [
        'DEVICE_TABLE',
        'ASSIGNMENT_COMPUTER_TABLE',
        'MOBILE_DEVICES_TABLE',
        'ASSIGNMENT_MOBILE_TABLE',
        'RETURNED_DEVICES_TABLE',
        'RETURN_COMPUTER_TABLE',
        'RETURN_MOBILE_TABLE'
    ]
    
    actual_placeholder = None
    for var in variables:
        placeholder_name = var.get('name', '')
        map_to = var.get('map_to', '')
        
        if map_to in table_variables:
            actual_placeholder = placeholder_name
            print(f"\n[OK] Found table placeholder mapping: {placeholder_name} -> {map_to}")
            break
    
    if actual_placeholder:
        print(f"\n[OK] Will search for placeholder: {{{{{actual_placeholder}}}}}")
        print(f"  Variants to try:")
        print(f"    - {{{{{actual_placeholder}}}}}")
        print(f"    - {{{{ {actual_placeholder} }}}}")
        print(f"    - {{{{{actual_placeholder.lower()}}}}}")
        print(f"    - {{{{ {actual_placeholder.lower()} }}}}")
    else:
        print("\n[ERROR] No table placeholder found in mapping")
    
    print("\n" + "="*80)
    print("\nTest completed successfully!")
    
finally:
    db.close()
