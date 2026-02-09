import sys
import os

# Ajustar path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal
import models

def check_recent_decommissions():
    db = SessionLocal()
    try:
        decs = db.query(models.Decommission).order_by(models.Decommission.id.desc()).limit(5).all()
        print(f"Recent Decommissions:")
        print("-" * 50)
        for d in decs:
            print(f"ID: {d.id}")
            print(f"  Date: {d.decommission_date}")
            print(f"  Device ID: {d.device_id}")
            print(f"  Acta Path: {d.acta_path}")
            if d.acta_path and os.path.exists(d.acta_path):
                print(f"  File Size: {os.path.getsize(d.acta_path)} bytes")
            else:
                print(f"  File Exists: FALSE")
            print("-" * 50)
    finally:
        db.close()

if __name__ == "__main__":
    check_recent_decommissions()
