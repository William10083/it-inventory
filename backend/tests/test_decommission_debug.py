import sys
import os
import json
from datetime import datetime

# Path adjustment
sys.path.append(r'C:\Users\wvilca\Downloads\it_inventory 2\it_inventory\backend')

from database import SessionLocal
import models
from pdf_generator import generate_batch_acta

def test_decommission_template():
    db = SessionLocal()
    try:
        # 1. Buscar el template de baja
        template = db.query(models.DocumentTemplate).filter(
            models.DocumentTemplate.template_type == "ACTA_BAJA",
            models.DocumentTemplate.is_active == True
        ).first()
        
        if not template:
            print("ERROR: No active ACTA_BAJA template found in DB")
            return
            
        print(f"--- TEMPLATE INFO ---")
        print(f"ID: {template.id}")
        print(f"Name: {template.name}")
        print(f"File Path: {template.file_path}")
        print(f"----------------------\n")
        
        # 2. Datos simulados
        devices_info = [{
            'type': 'LAPTOP',
            'brand': 'HP',
            'model': 'PROBOOK 440 G9',
            'serial': '5CG2345678',
            'hostname': 'TAM-LP001',
            'inventory_code': 'INV-LAP-001',
            'status': 'BAJA'
        }]
        
        decommission_data = {
            'fabrication_year': 2020,
            'purchase_reason': 'FALLA TECNICA',
            'device_image_path': None,
            'serial_image_path': None
        }
        
        # 3. Generar Acta
        print("--- STARTING GENERATION ---")
        pdf_path = generate_batch_acta(
            assignment_id=7777,
            employee_name="USUARIO DE PRUEBA",
            devices_info=devices_info,
            template=template,
            acta_observations="Prueba de depuración de template",
            decommission_data=decommission_data
        )
        print("--- GENERATION FINISHED ---")
        
        print(f"\nSUCCESS: Acta generated at {pdf_path}")
        
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_decommission_template()
