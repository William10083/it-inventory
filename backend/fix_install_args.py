"""
Script to fix install_args for existing custom software entries
Removes extra spaces and commas from install arguments
"""

from database import engine, get_db
from models import CustomSoftware

def fix_install_args():
    """Fix install_args by removing commas and extra spaces"""
    db = next(get_db())
    
    print("Fixing install arguments for custom software...")
    
    softwares = db.query(CustomSoftware).all()
    
    for software in softwares:
        old_args = software.install_args
        
        # Remove leading/trailing spaces
        new_args = old_args.strip()
        
        # If it contains commas, take only the first argument
        if ',' in new_args:
            new_args = new_args.split(',')[0].strip()
        
        if old_args != new_args:
            print(f"Fixing '{software.name}':")
            print(f"  Old: [{old_args}]")
            print(f"  New: [{new_args}]")
            software.install_args = new_args
    
    db.commit()
    print("\nSUCCESS: All install arguments fixed!")

if __name__ == "__main__":
    fix_install_args()
