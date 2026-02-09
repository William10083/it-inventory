from database import SessionLocal
from models import Employee

def find_ransac_employees():
    db = SessionLocal()
    try:
        employees = db.query(Employee).filter(Employee.company.ilike("%RANSAC%")).all()
        
        print(f"Found {len(employees)} employees with company 'RANSAC':")
        for emp in employees:
            print(f"- {emp.full_name} (DNI: {emp.dni}, Company: {emp.company})")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    find_ransac_employees()
