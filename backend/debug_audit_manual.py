
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import json
from dotenv import load_dotenv
import models
from services import audit

load_dotenv()

DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'it_inventory')

if not DB_PASSWORD:
    password_part = ""
else:
    password_part = f":{DB_PASSWORD}"

SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}{password_part}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

print("Attempting to manually create an audit log...")

try:
    # Fetch a real device to snapshot
    device = db.query(models.Device).first()
    if not device:
        print("No devices found to test with.")
        exit(1)

    print(f"Using device: {device.brand} {device.model} (ID: {device.id})")

    snapshot = audit.get_entity_snapshot(device)
    print("Snapshot created successfully.")
    
    # Try to log
    # Assuming user_id 1 exists (usually admin)
    user = db.query(models.User).first()
    user_id = user.id if user else 1
    
    print(f"Using User ID: {user_id}")
    
    result = audit.log_action_with_snapshot(
        db,
        user_id,
        "DEBUG_TEST_ACTION",
        "device",
        device.id,
        snapshot_before=snapshot,
        snapshot_after=snapshot,
        details="Manual debug test"
    )
    
    if result:
        print("Log created successfully!")
    else:
        print("Log creation FAILED (returned None). Check audit_error.log")

except Exception as e:
    print(f"Script crashed: {e}")

db.close()
