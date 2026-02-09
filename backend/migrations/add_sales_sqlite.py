"""
Migration script to add Sales functionality to SQLite database
"""
import sqlite3
import os

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'inventory.db')

def run_migration():
    print("Starting migration: Add Sales functionality")
    print(f"Database: {DB_PATH}")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 1. Create sales table
        print("Creating sales table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                buyer_name TEXT NOT NULL,
                buyer_dni TEXT NOT NULL,
                buyer_email TEXT,
                buyer_phone TEXT,
                buyer_address TEXT,
                sale_price INTEGER,
                payment_method TEXT,
                notes TEXT,
                acta_path TEXT,
                created_by_user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 2. Add sale_id column to devices table
        print("Adding sale_id column to devices table...")
        try:
            cursor.execute("ALTER TABLE devices ADD COLUMN sale_id INTEGER REFERENCES sales(id)")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print("  Column sale_id already exists, skipping...")
            else:
                raise
        
        # 3. Create indexes
        print("Creating indexes...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_devices_sale_id ON devices(sale_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sales_buyer_dni ON sales(buyer_dni)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date)")
        
        # Commit changes
        conn.commit()
        print("✅ Migration completed successfully!")
        
        # Verification
        print("\nVerification:")
        cursor.execute("SELECT COUNT(*) FROM sales")
        sales_count = cursor.fetchone()[0]
        print(f"  Sales table: {sales_count} records")
        
        cursor.execute("PRAGMA table_info(devices)")
        columns = cursor.fetchall()
        has_sale_id = any(col[1] == 'sale_id' for col in columns)
        print(f"  Devices.sale_id column: {'✅ exists' if has_sale_id else '❌ missing'}")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
