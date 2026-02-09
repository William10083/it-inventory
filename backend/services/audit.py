from sqlalchemy.orm import Session
import models
import json
import datetime

def log_action(db: Session, user_id: int, action: str, details: str = None):
    """
    Logs an action to the audit_logs table (legacy, simple version).
    """
    try:
        log = models.AuditLog(
            user_id=user_id,
            action=action,
            details=details,
            is_revertible=False
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Failed to write audit log: {e}")
        # Don't crash the main application for a log failure
        db.rollback()

def log_action_with_snapshot(
    db: Session,
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: int,
    snapshot_before: dict = None,
    snapshot_after: dict = None,
    is_revertible: bool = True,
    details: str = None
):
    """
    Logs an action with snapshots for undo/revert functionality.
    
    Args:
        db: Database session
        user_id: ID of the user performing the action
        action: Action name (e.g., "DEVICE_UPDATED", "DEVICE_DELETED")
        entity_type: Type of entity affected ("device", "employee", "assignment")
        entity_id: ID of the affected entity
        snapshot_before: Dictionary representing state before the action
        snapshot_after: Dictionary representing state after the action
        is_revertible: Whether this action can be undone
        details: Human-readable description of the action
    """
    try:
        log = models.AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            snapshot_before=json.dumps(snapshot_before) if snapshot_before else None,
            snapshot_after=json.dumps(snapshot_after) if snapshot_after else None,
            is_revertible=is_revertible,
            details=details
        )
        db.add(log)
        db.commit()
        return log
    except Exception as e:
        print(f"Failed to write audit log: {e}")
        db.rollback()
        return None

def get_entity_snapshot(entity) -> dict:
    """
    Convert a SQLAlchemy model instance to a dictionary snapshot.
    Excludes relationships and internal SQLAlchemy attributes.
    """
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

def revert_action(db: Session, audit_log_id: int, user_id: int):
    """
    Revert an action based on the audit log entry.
    
    Returns:
        tuple: (success: bool, message: str)
    """
    # Get the audit log entry
    log = db.query(models.AuditLog).filter(models.AuditLog.id == audit_log_id).first()
    
    if not log:
        return False, "Audit log not found"
    
    if not log.is_revertible:
        return False, "This action cannot be reverted"
    
    if log.reverted_at:
        return False, "This action has already been reverted"
    
    try:
        # Parse the snapshot
        snapshot_before = json.loads(log.snapshot_before) if log.snapshot_before else None
        
        if not snapshot_before:
            return False, "No snapshot available for reversion"
        
        # Perform reversion based on entity type
        if log.entity_type == "device":
            device = db.query(models.Device).filter(models.Device.id == log.entity_id).first()
            
            if log.action == "DEVICE_DELETED":
                # Restore deleted device
                if device and device.deleted_at:
                    device.deleted_at = None
                    device.deleted_by_user_id = None
                else:
                    return False, "Device not found or not deleted"
            
            elif log.action == "DEVICE_UPDATED":
                # Restore previous values
                if device:
                    for key, value in snapshot_before.items():
                        if key not in ['id', 'deleted_at', 'deleted_by_user_id']:
                            setattr(device, key, value)
                else:
                    return False, "Device not found"
        
        elif log.entity_type == "employee":
            employee = db.query(models.Employee).filter(models.Employee.id == log.entity_id).first()
            
            if log.action == "EMPLOYEE_DELETED":
                # Restore deleted employee
                if employee and employee.deleted_at:
                    employee.deleted_at = None
                    employee.deleted_by_user_id = None
                else:
                    return False, "Employee not found or not deleted"
            
            elif log.action == "EMPLOYEE_UPDATED":
                # Restore previous values
                if employee:
                    for key, value in snapshot_before.items():
                        if key not in ['id', 'deleted_at', 'deleted_by_user_id']:
                            setattr(employee, key, value)
                else:
                    return False, "Employee not found"
        
        elif log.entity_type == "assignment":
            assignment = db.query(models.Assignment).filter(models.Assignment.id == log.entity_id).first()
            
            if log.action == "ASSIGNMENT_CREATED":
                # Undo assignment (return device)
                if assignment and not assignment.returned_date:
                    assignment.returned_date = datetime.datetime.utcnow()
                    # Update device status
                    device = assignment.device
                    if device:
                        device.status = models.DeviceStatus.AVAILABLE
                else:
                    return False, "Assignment not found or already returned"
            
            elif log.action == "DEVICE_RETURNED":
                # Undo return (re-assign)
                if assignment and assignment.returned_date:
                    assignment.returned_date = None
                    # Update device status
                    device = assignment.device
                    if device:
                        device.status = models.DeviceStatus.ASSIGNED
                else:
                    return False, "Assignment not found or not returned"
        
        else:
            return False, f"Unknown entity type: {log.entity_type}"
        
        # Mark the audit log as reverted
        log.reverted_at = datetime.datetime.utcnow()
        log.reverted_by_user_id = user_id
        
        # Create a new audit log for the revert action itself
        log_action(
            db, 
            user_id, 
            f"REVERTED_{log.action}",
            f"Reverted action: {log.action} (Log ID: {log.id})"
        )
        
        db.commit()
        return True, "Action reverted successfully"
    
    except Exception as e:
        db.rollback()
        return False, f"Failed to revert action: {str(e)}"
