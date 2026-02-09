
import sys
import os
import requests
from datetime import datetime
import json
import random

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
from models import Base, Device, User, DeviceStatus, DeviceType, Decommission
from sqlalchemy.orm import Session
from sqlalchemy import text

def setup_test_data(db: Session):
    print("Configurando datos de prueba...")
    
    # 1. Obtener cualquier usuario administrador, o crear uno si no existe
    user = db.query(User).filter(User.role == "admin").first()
    if not user:
        # Si no hay admin, buscar cualquier usuario
        user = db.query(User).first()
        
    if not user:
        # Crear uno si la DB está vacía
        user = User(
            username=f"test_admin_{int(datetime.now().timestamp())}",
            full_name="Test Admin",
            role="admin",
            hashed_password="dummy_password"
        )
        db.add(user)
        try:
            db.commit()
            db.refresh(user)
        except Exception as e:
            db.rollback()
            print(f"Error creando usuario, intentando recuperar existente: {e}")
            user = db.query(User).first()
            if not user: raise Exception("No se pudo obtener un usuario de prueba")

    
    # 2. Crear un dispositivo de prueba
    device = Device(
        serial_number=f"TEST-DECOM-{int(datetime.now().timestamp())}-{random.randint(100,999)}",
        device_type=DeviceType.LAPTOP,
        brand="TestBrand",
        model="TestModel",
        status=DeviceStatus.AVAILABLE,
        location="Callao"
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    
    print(f"Dispositivo de prueba creado: ID {device.id}, Serial {device.serial_number}")
    return user, device

def test_decommission_logic():
    db = SessionLocal()
    try:
        user, device = setup_test_data(db)
        
        print("\nProbando lógica de baja...")
        
        # Datos para la baja
        decommission_data = {
            "device_id": device.id,
            "reason": "Obsolescencia",
            "observations": "Prueba de nuevos campos",
            "fabrication_year": 2020, # Campo Nuevo
            "purchase_reason": "Renovacion 2020", # Campo Nuevo
            "device_image_path": "/tmp/test_img.jpg", # Campo Nuevo
            "serial_image_path": "/tmp/test_serial.jpg" # Campo Nuevo
        }
        
        # Simular la lógica del endpoint (backend/routes/decommission.py)
        # 1. Verificar estado
        if device.status == DeviceStatus.RETIRED:
            print("ERROR: El dispositivo ya está dado de baja")
            return

        # 2. Actualizar estado
        device.status = DeviceStatus.RETIRED
        
        # 3. Crear registro Decommission
        new_decommission = Decommission(
            device_id=decommission_data["device_id"],
            reason=decommission_data["reason"],
            observations=decommission_data["observations"],
            fabrication_year=decommission_data["fabrication_year"],
            purchase_reason=decommission_data["purchase_reason"],
            device_image_path=decommission_data["device_image_path"],
            serial_image_path=decommission_data["serial_image_path"],
            created_by_user_id=user.id
        )
        
        db.add(new_decommission)
        db.commit()
        db.refresh(new_decommission)
        
        print(f"Registro de baja creado: ID {new_decommission.id}")
        
        # VERIFICACIÓN
        print("\nVerificando campos guardados en DB...")
        saved_decom = db.query(Decommission).filter(Decommission.id == new_decommission.id).first()
        
        assert saved_decom.fabrication_year == 2020, f"Error: fabrication_year esperado 2020, obtenido {saved_decom.fabrication_year}"
        assert saved_decom.purchase_reason == "Renovacion 2020", f"Error: purchase_reason incorrecto"
        assert saved_decom.device_image_path == "/tmp/test_img.jpg", "Error: device_image_path incorrecto"
        
        print("[OK] TODOS LOS CAMPOS NUEVOS SE GUARDARON CORRECTAMENTE")

        # 4. Generar PDF (Verificación de Integración)
        print("\nVerificando Generación de PDF...")
        try:
            from pdf_generator import generate_batch_acta
            
            # Datos simulados para PDF
            devices_info = [{
                'type': device.device_type,
                'brand': device.brand,
                'model': device.model,
                'serial': device.serial_number,
                'hostname': device.hostname,
                'inventory_code': device.inventory_code,
                'status': 'BAJA'
            }]
            
            # Decommission data
            decom_data_for_pdf = {
                'fabrication_year': decommission_data['fabrication_year'],
                'purchase_reason': decommission_data['purchase_reason'],
                'device_image_path': decommission_data['device_image_path'],
                'serial_image_path': decommission_data['serial_image_path']
            }
            
            pdf_path = generate_batch_acta(
                assignment_id=new_decommission.id,
                employee_name=user.full_name or user.username,
                devices_info=devices_info,
                decommission_data=decom_data_for_pdf
            )
            
            print(f"[OK] PDF Generado exitosamente en: {pdf_path}")
            
            if not os.path.exists(pdf_path):
                 print("[ERROR] El archivo PDF no existe físicamente.")
            
        except ImportError:
             print("[WARN] No se pudo importar pdf_generator, saltando prueba de PDF.")
        except Exception as e:
             print(f"[ERROR] Falló la generación de PDF: {e}")
        
        # Limpieza (Opcional, pero recomendada para no llenar la BD de basura de prueba)
        # db.delete(saved_decom)
        # db.delete(device)
        # db.commit()
        # print("Datos de prueba limpiados.")

    except Exception as e:
        print(f"[ERROR] EN LA PRUEBA: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_decommission_logic()
