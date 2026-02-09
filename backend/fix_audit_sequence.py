
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'it_inventory')

if not DB_PASSWORD:
    password_part = ""
else:
    password_part = f":{DB_PASSWORD}"

SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}{password_part}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

print("Attempting to fix audit_logs PK sequence...")

try:
    with engine.connect() as connection:
        # 1. Get the sequence name
        result = connection.execute(text("SELECT pg_get_serial_sequence('audit_logs', 'id');"))
        seq_name = result.scalar()
        print(f"Sequence name: {seq_name}")
        
        if not seq_name:
            print("Could not find sequence name. Is the id column a SERIAL?")
            exit(1)

        # 2. Get current max ID
        result = connection.execute(text("SELECT MAX(id) FROM audit_logs;"))
        max_id = result.scalar()
        print(f"Current Max ID: {max_id}")
        
        if max_id is None:
            max_id = 0
            
        # 3. Reset sequence
        # setval with is_called=true (default) means next value will be max_id + 1
        sql = text(f"SELECT setval('{seq_name}', :val)")
        connection.execute(sql, {"val": max_id})
        connection.commit()
        
        print(f"Successfully reset sequence '{seq_name}' to {max_id}. Next insert should try {max_id + 1}.")
        
except Exception as e:
    print(f"Error: {e}")
