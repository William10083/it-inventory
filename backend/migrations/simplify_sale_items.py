"""
Migration script to simplify sale_items table
- Remove quantity column (always 1)
- Remove subtotal column (redundant)
- Rename unit_price to price
"""
from sqlalchemy import create_engine, text
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine

def simplify_sale_items_table():
    """Simplify sale_items table by removing redundant columns"""
    
    with engine.connect() as conn:
        print("Simplifying sale_items table...")
        
        # Step 1: Rename unit_price to price
        print("  1. Renaming unit_price to price...")
        conn.execute(text("ALTER TABLE sale_items RENAME COLUMN unit_price TO price"))
        
        # Step 2: Drop quantity column
        print("  2. Dropping quantity column...")
        conn.execute(text("ALTER TABLE sale_items DROP COLUMN quantity"))
        
        # Step 3: Drop subtotal column
        print("  3. Dropping subtotal column...")
        conn.execute(text("ALTER TABLE sale_items DROP COLUMN subtotal"))
        
        conn.commit()
        print("OK Table simplified successfully")
        
        # Verify changes
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sale_items'
            ORDER BY ordinal_position
        """))
        
        columns = [row[0] for row in result]
        print(f"\nCurrent columns: {', '.join(columns)}")
        
        if 'price' in columns and 'quantity' not in columns and 'subtotal' not in columns:
            print("OK Verification passed")
            return True
        else:
            print("ERROR: Verification failed")
            return False

if __name__ == "__main__":
    print("=" * 60)
    print("SIMPLIFY SALE_ITEMS TABLE MIGRATION")
    print("=" * 60)
    
    try:
        if simplify_sale_items_table():
            print("\n" + "=" * 60)
            print("MIGRATION COMPLETED SUCCESSFULLY")
            print("=" * 60)
        else:
            print("\nERROR: Migration verification failed")
            sys.exit(1)
        
    except Exception as e:
        print(f"\nERROR: Migration failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
