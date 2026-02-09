from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import database, models, schemas
from datetime import datetime

router = APIRouter()

# Schema for Maintenance Log (Internal or Shared?)
# It's better to verify schemas.py has Maintenance models. 
# Wait, I didn't add Maintenance schemas to schemas.py yet. 
# I should do that first or define them here temporarily (bad practice).
# I will define Pydantic models in schemas.py in the next step, but let's assume they exist
# MaintenanceLogCreate, MaintenanceLog

@router.post("/maintenance/", response_model=schemas.MaintenanceLog)
def create_maintenance_log(log: schemas.MaintenanceLogCreate, db: Session = Depends(database.get_db)):
    # Verify device exists
    device = db.query(models.Device).filter(models.Device.id == log.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    db_log = models.MaintenanceLog(**log.dict())
    
    # Auto-update device status to MAINTENANCE if it's an "open" ticket
    if log.status == "open":
        device.status = models.DeviceStatus.MAINTENANCE
    
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

@router.get("/maintenance/device/{device_id}", response_model=List[schemas.MaintenanceLog])
def read_device_maintenance_history(device_id: int, db: Session = Depends(database.get_db)):
    logs = db.query(models.MaintenanceLog).filter(models.MaintenanceLog.device_id == device_id).order_by(models.MaintenanceLog.date.desc()).all()
    return logs

@router.put("/maintenance/{log_id}", response_model=schemas.MaintenanceLog)
def update_maintenance_log(log_id: int, log_update: schemas.MaintenanceLogUpdate, db: Session = Depends(database.get_db)):
    db_log = db.query(models.MaintenanceLog).filter(models.MaintenanceLog.id == log_id).first()
    if not db_log:
        raise HTTPException(status_code=404, detail="Maintenance log not found")
        
    if log_update.status:
        db_log.status = log_update.status
        # If closing, should we set device to AVAILABLE? Maybe not automatically, user might want to verify.
        # But if the user says "closed", it implies done. 
        # Let's keep it simple: manual status update for device unless explicitly logic'd.
    if log_update.description:
        db_log.description = log_update.description
    if log_update.cost is not None:
        db_log.cost = log_update.cost
    if log_update.vendor:
        db_log.vendor = log_update.vendor
        
    db.commit()
    db.refresh(db_log)
    return db_log
