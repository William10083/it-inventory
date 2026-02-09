
import enum
import json
import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class DeviceStatus(str, enum.Enum):
    AVAILABLE = "available"
    ASSIGNED = "assigned"

class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True)
    status = Column(String, default=DeviceStatus.AVAILABLE)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

def get_entity_snapshot(entity) -> dict:
    if entity is None:
        return None
    
    snapshot = {}
    for column in entity.__table__.columns:
        value = getattr(entity, column.name)
        # Convert datetime to ISO string for JSON serialization
        if isinstance(value, datetime.datetime):
            value = value.isoformat()
        elif isinstance(value, datetime.date):
            value = value.isoformat()
        snapshot[column.name] = value
    
    return snapshot

def test_serialization():
    # Simulate a device instance with a default value
    device = Device(id=1)
    
    # In a real app, if we assign an Enum member directly:
    device.status = DeviceStatus.AVAILABLE
    
    print(f"Device status type: {type(device.status)}")
    print(f"Device status value: {device.status}")

    snapshot = get_entity_snapshot(device)
    print("Snapshot:", snapshot)

    try:
        json_str = json.dumps(snapshot)
        print("Success! JSON:", json_str)
    except Exception as e:
        print("FAILED to serialize JSON:", e)

if __name__ == "__main__":
    test_serialization()
