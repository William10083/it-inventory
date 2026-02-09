"""
Verify sales migration
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'inventory.db')

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("Verificando migracion de ventas...")
print("")

# Check sales table
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sales'")
if cursor.fetchone():
    print("[OK] Tabla 'sales' existe")
    cursor.execute("SELECT COUNT(*) FROM sales")
    count = cursor.fetchone()[0]
    print(f"    Registros: {count}")
else:
    print("[ERROR] Tabla 'sales' NO existe")

# Check sale_id column in devices
cursor.execute("PRAGMA table_info(devices)")
columns = [col[1] for col in cursor.fetchall()]
if 'sale_id' in columns:
    print("[OK] Columna 'sale_id' existe en devices")
else:
    print("[ERROR] Columna 'sale_id' NO existe en devices")

# Check indexes
cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%sale%'")
indexes = cursor.fetchall()
print(f"[OK] Indices creados: {len(indexes)}")
for idx in indexes:
    print(f"    - {idx[0]}")

conn.close()
print("")
print("Verificacion completada!")
