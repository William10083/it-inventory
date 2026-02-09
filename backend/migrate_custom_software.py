"""
Migration script to create custom_software table for Image Builder
Run this script to add the custom_software table to your database
"""

from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from database import engine, Base
import models
import datetime

def create_custom_software_table():
    """Create the custom_software table"""
    print("Creating custom_software table...")
    
    # Import all models to ensure they're registered
    from models import CustomSoftware
    
    # Create all tables (this will only create missing ones)
    Base.metadata.create_all(bind=engine)
    
    print("SUCCESS: custom_software table created successfully!")

if __name__ == "__main__":
    create_custom_software_table()
