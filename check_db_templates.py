import sys
import os

# Ajustar path para importar desde backend
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal
import models

def check_templates():
    db = SessionLocal()
    try:
        templates = db.query(models.DocumentTemplate).all()
        print(f"Total templates in DB: {len(templates)}")
        print("-" * 50)
        for t in templates:
            ext_path = os.path.join(os.getcwd(), 'backend', t.file_path)
            exists = os.path.exists(ext_path)
            print(f"ID: {t.id}")
            print(f"  Name: {t.name}")
            print(f"  Type: |{t.template_type}|")
            print(f"  Is Active: {t.is_active}")
            print(f"  Is Default: {getattr(t, 'is_default', 'N/A')}")
            print(f"  File Path: {t.file_path}")
            print(f"  Absolute Path: {ext_path}")
            print(f"  Exists on Disk: {exists}")
            print("-" * 50)
            
    finally:
        db.close()

if __name__ == "__main__":
    check_templates()
