"""
Migration script to create software_profiles table for Image Builder
Run this script to add the software_profiles table to your database
"""

from database import engine, Base
import models

def create_software_profiles_table():
    """Create the software_profiles table"""
    print("Creating software_profiles table...")
    
    # Import all models to ensure they're registered
    from models import SoftwareProfile
    
    # Create all tables (this will only create missing ones)
    Base.metadata.create_all(bind=engine)
    
    print("SUCCESS: software_profiles table created successfully!")

if __name__ == "__main__":
    create_software_profiles_table()
