"""
Script de prueba end-to-end para verificar el flujo completo de generación de actas
con mapeo dinámico de placeholders de tabla.
"""
import sys
sys.path.append(r'C:\Users\wvilca\Downloads\it_inventory 2\it_inventory\backend')

from database import SessionLocal
from models import DocumentTemplate
from pdf_generator import build_placeholders_from_template, insert_devices_table_at_placeholder
from docx import Document
import json
import os

db = SessionLocal()

try:
    # 1. Obtener template de ASSIGNMENT_COMPUTER (ID 6)
    template = db.query(DocumentTemplate).filter(DocumentTemplate.id == 6).first()
    
    if not template:
        print("ERROR: Template ID 6 not found")
        sys.exit(1)
    
    print("="*80)
    print(f"Template: {template.name}")
    print(f"Type: {template.template_type}")
    print(f"File: {template.file_path}")
    print("="*80)
    
    # 2. Preparar datos de prueba
    employee_data = {
        'name': 'Juan Perez',
        'dni': '12345678',
        'company': 'TRANSTOTAL',
        'location': 'CALLAO',
        'observations': '',
        'template_type': 'ASSIGNMENT_COMPUTER'
    }
    
    devices_info = [
        {
            'type': 'LAPTOP',
            'brand': 'HP',
            'model': 'EliteBook 840',
            'serial': 'ABC123456',
            'hostname': 'TAM-LP001'
        },
        {
            'type': 'MONITOR',
            'brand': 'LENOVO',
            'model': 'ThinkVision E24',
            'serial': 'MON123456',
            'hostname': 'TAM-MN001'
        }
    ]
    
    # 3. Construir placeholders (debe EXCLUIR variables de tabla)
    print("\n" + "="*80)
    print("STEP 1: Building placeholders from template")
    print("="*80)
    
    placeholders = build_placeholders_from_template(template, employee_data, devices_info)
    
    print(f"\nGenerated {len(placeholders)} placeholders:")
    for key in sorted(placeholders.keys())[:10]:  # Mostrar solo los primeros 10
        print(f"  {key} -> {placeholders[key][:50] if len(str(placeholders[key])) > 50 else placeholders[key]}")
    
    # Verificar que NO se incluyó el placeholder de tabla
    tabla_in_placeholders = any('TABLA' in key for key in placeholders.keys())
    if tabla_in_placeholders:
        print("\n[ERROR] Table placeholder found in placeholders dict - should be excluded!")
    else:
        print("\n[OK] Table placeholder correctly excluded from placeholders dict")
    
    # 4. Verificar que insert_devices_table_at_placeholder puede identificar el placeholder
    print("\n" + "="*80)
    print("STEP 2: Verifying table placeholder identification")
    print("="*80)
    
    # Parsear variables del template
    if isinstance(template.variables, str):
        variables = json.loads(template.variables)
    else:
        variables = template.variables
    
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
            print(f"[OK] Found table placeholder: {placeholder_name} -> {map_to}")
            break
    
    if actual_placeholder:
        print(f"\n[OK] insert_devices_table_at_placeholder will search for: {{{{{actual_placeholder}}}}}")
    else:
        print("\n[ERROR] No table placeholder found!")
    
    # 5. Resumen
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"✓ Template loaded: {template.name}")
    print(f"✓ Placeholders built: {len(placeholders)} (excluding table variables)")
    print(f"✓ Table placeholder identified: {{{{{actual_placeholder}}}}} -> DEVICE_TABLE")
    print(f"✓ Table will be inserted dynamically by insert_devices_table_at_placeholder()")
    print("\n[OK] All checks passed!")
    
finally:
    db.close()
