from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Body
from utils import doc_utils
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from typing import List, Optional, Dict, Any
import shutil
import os
import uuid
import re
import zipfile
import schemas, models, auth

router = APIRouter(prefix="/templates")

UPLOAD_DIR = "templates"
TEMP_DIR = "templates/temp"

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

def extract_variables_from_docx(file_path):
    """
    Extract variables in format {{variable_name}} from docx xml content.
    """
    variables = set()
    try:
        with zipfile.ZipFile(file_path) as z:
            xml_content = z.read('word/document.xml').decode('utf-8')
            clean_text = re.sub(r'<[^>]+>', '', xml_content)
            matches = re.findall(r'\{\{([^}]+)\}\}', clean_text)
            for m in matches:
                variables.add(m.strip())
                
    except Exception as e:
        print(f"Error parsing docx: {e}")
    
    return list(variables)

def _get_preview_table_xml(table_type: str) -> str:
    """Helper to generate sample table XML for preview using doc_utils"""
    is_return = 'DEVOLUCION' in table_type
    
    if is_return:
        headers = ["Nro.", "EQUIPO", "MARCA", "MODELO", "Nro. SERIE"]
        sample_row = ["1", "MONITOR", "LENOVO", "E24-30", "VNA123"]
    else:
        headers = ["Nro.", "EQUIPO", "MARCA", "MODELO", "Nro. SERIE"]
        sample_row = ["1", "LAPTOP", "LENOVO", "THINKBOOK 15 G2", "MP259EGX"]
        
    return doc_utils.get_table_xml(headers, [sample_row])

@router.post("/upload")
async def upload_template(file: UploadFile = File(...)):
    """
    Upload a docx file, save it temporarily, and parse variables.
    """
    if not file.filename.endswith('.docx'):
        raise HTTPException(status_code=400, detail="Only .docx files are allowed")

    # Save temp file
    temp_filename = f"temp_{uuid.uuid4()}_{file.filename}"
    temp_path = os.path.join(TEMP_DIR, temp_filename)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Extract variables
        variables = extract_variables_from_docx(temp_path)
        
        return {
            "filename": file.filename,
            "temp_path": temp_filename,
            "variables": variables
        }
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/upload/preview")
async def preview_template(
    temp_filename: Optional[str] = None,
    template_id: Optional[int] = None,
    data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Generate a preview (filled DOCX) from a temp upload OR existing template + data.
    """
    source_path = None
    
    if temp_filename:
        source_path = os.path.join(TEMP_DIR, temp_filename)
    elif template_id:
        template = db.query(models.DocumentTemplate).filter(models.DocumentTemplate.id == template_id).first()
        if template:
            source_path = template.file_path
            
    if not source_path or not os.path.exists(source_path):
        raise HTTPException(status_code=404, detail="Template file not found")
        
    preview_filename = f"preview_{temp_filename if temp_filename else template_id}_{uuid.uuid4()}.docx"
    dest_path = os.path.join(TEMP_DIR, preview_filename)
    
    # Prepare Table Strings if any
    table_xml_map = {}
    variables_clean = {}
    
    for key, value in data.items():
        val_str = str(value)
        if 'TABLA' in val_str:
            # Generate sample table
            table_xml_map[key] = _get_preview_table_xml(val_str)
        else:
            variables_clean[key] = val_str

    # Fill variables
    success = doc_utils.replace_variables_in_docx(source_path, dest_path, variables_clean, table_xml_map)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to generate preview")
        
    # Ideally convert to PDF here, but for now return DOCX.
    # Frontend handles blob. Chrome might download it instead of previewing.
    
    return FileResponse(
        dest_path, 
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename="preview.docx"
    )

@router.get("/", response_model=List[schemas.TemplateResponse])
def get_templates(db: Session = Depends(get_db)):
    """List all templates"""
    templates = db.query(models.DocumentTemplate).filter(models.DocumentTemplate.is_active == True).all()
    # Explicitly check if list is empty to avoid null/undefined on one frontend path? No, empty list is fine.
    return templates

@router.post("/", response_model=schemas.TemplateResponse)
def create_template(
    template: schemas.TemplateCreate,
    temp_filename: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Create a new template record from a temporary uploaded file.
    """
    temp_path = os.path.join(TEMP_DIR, temp_filename)
    if not os.path.exists(temp_path):
        raise HTTPException(status_code=400, detail="Temporary file not found or expired")
    
    # Generate final path
    final_filename = f"{uuid.uuid4()}_{template.name.replace(' ', '_')}.docx"
    final_path = os.path.join(UPLOAD_DIR, final_filename)
    
    try:
        # Move file
        shutil.move(temp_path, final_path)
        
        # Create DB record
        db_template = models.DocumentTemplate(
            name=template.name,
            description=template.description,
            template_type=template.template_type,
            file_path=final_path,
            variables=template.variables,
            is_active=True,
            created_by=current_user.id
        )
        db.add(db_template)
        db.commit()
        db.refresh(db_template)
        return db_template
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")

@router.delete("/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Soft delete or hard delete template"""
    template = db.query(models.DocumentTemplate).filter(models.DocumentTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    try:
        db.delete(template)
        db.commit()
        
        # Optionally remove file
        if os.path.exists(template.file_path):
            os.remove(template.file_path)
            
        return {"message": "Template deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{template_id}/set-default")
def set_default_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Set a template as the default for its type"""
    # Get the target template
    template = db.query(models.DocumentTemplate).filter(models.DocumentTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Unset default for all other templates of the same type
    db.query(models.DocumentTemplate).filter(
        models.DocumentTemplate.template_type == template.template_type,
        models.DocumentTemplate.id != template_id
    ).update({"is_default": False})
    
    # Set this one as default
    template.is_default = True
    db.commit()
    
    return {"message": "Template set as default successfully", "template_id": template_id}

@router.put("/{template_id}", response_model=schemas.TemplateResponse)
def update_template(
    template_id: int,
    template_update: schemas.TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Update template details including variables"""
    db_template = db.query(models.DocumentTemplate).filter(models.DocumentTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    for var, value in template_update.dict(exclude_unset=True).items():
        setattr(db_template, var, value)
        
    try:
        db.commit()
        db.refresh(db_template)
        return db_template
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update template: {str(e)}")
