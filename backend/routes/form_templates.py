from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import database
import models
import schemas
import auth
import json

router = APIRouter(
    prefix="/form-templates",
    tags=["Form Templates"]
)

@router.get("/", response_model=List[schemas.FormTemplateResponse])
def get_form_templates(
    type: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """List form templates, optionally filtered by type"""
    query = db.query(models.FormTemplate).filter(models.FormTemplate.is_active == True)
    
    if type:
        query = query.filter(models.FormTemplate.type == type)
        
    return query.order_by(models.FormTemplate.name.asc()).all()

@router.post("/", response_model=schemas.FormTemplateResponse)
def create_form_template(
    template: schemas.FormTemplateCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Create a new form template"""
    # Validate JSON content
    try:
        json.loads(template.content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Content must be a valid JSON string")

    db_template = models.FormTemplate(
        name=template.name,
        type=template.type,
        content=template.content,
        created_by_user_id=current_user.id
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.delete("/{template_id}")
def delete_form_template(
    template_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Soft delete a form template"""
    db_template = db.query(models.FormTemplate).filter(models.FormTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    # Hard delete or soft delete? Model has is_active but logic might prefer deletion to keep name unique?
    # Let's do hard delete for now as these are simple presets, or soft delete setting is_active=False
    db.delete(db_template) # Hard delete for simplicity as requested "eliminar"
    db.commit()
    
    return {"message": "Template deleted successfully"}
