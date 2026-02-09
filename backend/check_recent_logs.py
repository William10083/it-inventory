
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String, DateTime
import os
import datetime
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
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    action = Column(String)
    timestamp = Column(DateTime)

db = SessionLocal()

print("Checking for recent logs...")
recent_logs = db.query(AuditLog).order_by(desc(AuditLog.timestamp)).limit(5).all()

for log in recent_logs:
    print(f"ID: {log.id}, Action: {log.action}, Timestamp: {log.timestamp}")

# Check specifically for logs after Feb 1st 2026
start_date = datetime.datetime(2026, 2, 1)
count = db.query(AuditLog).filter(AuditLog.timestamp >= start_date).count()
print(f"\nLogs since 2026-02-01: {count}")

db.close()
