from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
import auth

router = APIRouter()

@router.get("/software/", response_model=List[schemas.SoftwareLicense])
def get_software_licenses(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    licenses = db.query(models.SoftwareLicense).all()
    # Enrich with counts
    for lic in licenses:
        lic.assignments_count = len(lic.assignments)
    return licenses

@router.post("/software/", response_model=schemas.SoftwareLicense)
def create_software_license(license: schemas.SoftwareLicenseCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    db_license = models.SoftwareLicense(**license.dict())
    db.add(db_license)
    db.commit()
    db.refresh(db_license)
    db_license.assignments_count = 0
    return db_license

@router.post("/software/assign", response_model=schemas.LicenseAssignment)
def assign_license(assignment: schemas.LicenseAssignmentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    # Check license availability
    db_license = db.query(models.SoftwareLicense).filter(models.SoftwareLicense.id == assignment.license_id).first()
    if not db_license:
        raise HTTPException(status_code=404, detail="License not found")
        
    current_count = db.query(models.LicenseAssignment).filter(models.LicenseAssignment.license_id == assignment.license_id).count()
    if current_count >= db_license.seats_total:
        raise HTTPException(status_code=400, detail="No seats available")

    db_assignment = models.LicenseAssignment(**assignment.dict())
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

@router.get("/software/{license_id}/assignments", response_model=List[schemas.LicenseAssignment])
def get_license_assignments(license_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    assignments = db.query(models.LicenseAssignment).filter(models.LicenseAssignment.license_id == license_id).all()
    return assignments
