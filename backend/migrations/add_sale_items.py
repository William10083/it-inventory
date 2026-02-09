"""
Migration script to add sale_items table
Run this script to create the sale_items table in your database
"""
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, text
from sqlalchemy.orm import Session
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, get_db
import models

def create_sale_items_table():
    """Create the sale_items table"""
    
    # SQL to create the table (PostgreSQL syntax)
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL,
        device_id INTEGER,
        device_type VARCHAR NOT NULL,
        device_description VARCHAR NOT NULL,
        serial_number VARCHAR,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price INTEGER NOT NULL,
        subtotal INTEGER NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
    );
    """
    
    with engine.connect() as conn:
        print("Creating sale_items table...")
        conn.execute(text(create_table_sql))
        conn.commit()
        print("OK sale_items table created successfully")
        
        # Verify table was created
        result = conn.execute(text("SELECT tablename FROM pg_tables WHERE tablename='sale_items'"))
        if result.fetchone():
            print("OK Verified: sale_items table exists")
        else:
            print("ERROR: sale_items table was not created")
            return False
    
    return True

def migrate_existing_sales():
    """
    Migrate existing sales to create SaleItem records
    This will create one SaleItem per device in each sale
    """
    print("\nMigrating existing sales...")
    
    with Session(engine) as db:
        # Get all sales
        sales = db.query(models.Sale).all()
        print(f"Found {len(sales)} existing sales")
        
        for sale in sales:
            # Get devices linked to this sale
            devices = db.query(models.Device).filter(models.Device.sale_id == sale.id).all()
            
            if not devices:
                print(f"  Sale {sale.id}: No devices found, skipping")
                continue
            
            print(f"  Sale {sale.id}: Creating {len(devices)} sale items...")
            
            for device in devices:
                # Check if SaleItem already exists
                existing = db.query(models.SaleItem).filter(
                    models.SaleItem.sale_id == sale.id,
                    models.SaleItem.device_id == device.id
                ).first()
                
                if existing:
                    print(f"    Device {device.id}: SaleItem already exists, skipping")
                    continue
                
                # Create device description
                device_description = f"{device.brand} {device.model}"
                if device.device_type == "laptop" and device.specifications:
                    device_description += f" ({device.specifications[:50]})"
                
                # Calculate unit price (divide total by number of devices if possible)
                unit_price = 0
                if sale.sale_price and len(devices) > 0:
                    unit_price = sale.sale_price // len(devices)
                
                sale_item = models.SaleItem(
                    sale_id=sale.id,
                    device_id=device.id,
                    device_type=device.device_type,
                    device_description=device_description,
                    serial_number=device.serial_number,
                    quantity=1,
                    unit_price=unit_price,
                    subtotal=unit_price
                )
                db.add(sale_item)
            
            db.commit()
            print(f"  OK Sale {sale.id}: Created {len(devices)} sale items")
    
    print("\nOK Migration completed successfully")

if __name__ == "__main__":
    print("=" * 60)
    print("SALE ITEMS TABLE MIGRATION")
    print("=" * 60)
    
    try:
        # Step 1: Create table
        if not create_sale_items_table():
            print("\nERROR: Failed to create table")
            sys.exit(1)
        
        # Step 2: Migrate existing data
        migrate_existing_sales()
        
        print("\n" + "=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 60)
        
    except Exception as e:
        print(f"\nERROR: Migration failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
