from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from typing import List, Optional
import json
from datetime import datetime
import auth
from models import AuditLog, User, Device, Employee, Assignment

router = APIRouter(prefix="/audit-logs")

@router.get("/")
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog).options(joinedload(AuditLog.user))

    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    
    # Order by newest first
    logs = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    result = []
    for log in logs:
        # Parse snapshots if they exist
        details_data = {}
        if log.snapshot_before:
            try:
                details_data['snapshot_before'] = json.loads(log.snapshot_before)
            except:
                details_data['snapshot_before'] = log.snapshot_before
        
        if log.snapshot_after:
            try:
                details_data['snapshot_after'] = json.loads(log.snapshot_after)
            except:
                details_data['snapshot_after'] = log.snapshot_after
                
        if log.reverted_at:
            details_data['reverted_at'] = log.reverted_at
            if log.reverted_by:
                 details_data['reverted_by_username'] = log.reverted_by.username

        result.append({
            "id": log.id,
            "user_username": log.user.username if log.user else "System",
            "user_fullname": log.user.full_name if log.user else None,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "timestamp": log.timestamp,
            "details": log.details,
            "is_revertible": log.is_revertible,
            "reverted_at": log.reverted_at,
            "detailsData": details_data
        })
        
    return result

@router.get("/{log_id}")
def get_audit_log(
    log_id: int,
    db: Session = Depends(get_db)
):
    log = db.query(AuditLog).options(joinedload(AuditLog.user), joinedload(AuditLog.reverted_by)).filter(AuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
        
    # Parse details
    details_data = {}
    if log.snapshot_before:
        try:
            details_data['snapshot_before'] = json.loads(log.snapshot_before)
        except:
            details_data['snapshot_before'] = log.snapshot_before
    
    if log.snapshot_after:
        try:
            details_data['snapshot_after'] = json.loads(log.snapshot_after)
        except:
            details_data['snapshot_after'] = log.snapshot_after
            
    if log.reverted_at:
        details_data['reverted_at'] = log.reverted_at
        if log.reverted_by:
                details_data['reverted_by_username'] = log.reverted_by.username
                
    return details_data

@router.post("/{log_id}/revert")
def revert_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_active_user)
):
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
        
    if not log.is_revertible:
        raise HTTPException(status_code=400, detail="This action cannot be reverted")
        
    if log.reverted_at:
        raise HTTPException(status_code=400, detail="This action has already been reverted")

    if not log.snapshot_before:
        raise HTTPException(status_code=400, detail="No snapshot available to revert to")

    try:
        previous_state = json.loads(log.snapshot_before)
    except:
        raise HTTPException(status_code=500, detail="Corrupted snapshot data")

    # Determine entity model
    model_map = {
        'device': Device,
        'employee': Employee,
        'assignment': Assignment
    }
    
    model_class = model_map.get(log.entity_type)
    if not model_class:
        raise HTTPException(status_code=400, detail=f"Unsupported entity type for revert: {log.entity_type}")

    # Fetch entity
    entity = db.query(model_class).filter(model_class.id == log.entity_id).first()
    if not entity:
         raise HTTPException(status_code=404, detail="Target entity no longer exists")

    # Restore state
    for key, value in previous_state.items():
        if hasattr(entity, key) and key not in ['id', 'created_at', 'updated_at', 'metadata']: 
             setattr(entity, key, value)
    
    # Update log status
    log.reverted_at = datetime.utcnow()
    log.reverted_by_user_id = current_user.id
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to revert: {str(e)}")

    return {"message": "Action reverted successfully"}
