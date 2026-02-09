
from sqlalchemy import create_engine, inspect
import os
from dotenv import load_dotenv

# Load env vars
load_dotenv()

DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'it_inventory')

# Handle case where empty password in env might be treated nicely or poorly
if not DB_PASSWORD:
    # Try empty string or None depending on what works for your local setup usually
    password_part = ""
else:
    password_part = f":{DB_PASSWORD}"

SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}{password_part}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

print(f"Connecting to: {SQLALCHEMY_DATABASE_URL.replace(DB_PASSWORD, '***') if DB_PASSWORD else SQLALCHEMY_DATABASE_URL}")

try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    inspector = inspect(engine)

    if inspector.has_table("audit_logs"):
        print("\nColumns in 'audit_logs':")
        for column in inspector.get_columns("audit_logs"):
            print(f"- {column['name']} ({column['type']})")
    else:
        print("\nTable 'audit_logs' DOES NOT EXIST.")

except Exception as e:
    print(f"\nError: {e}")
