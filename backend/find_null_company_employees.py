from database import SessionLocal
from models import Employee

def find_null_company_employees():
    db = SessionLocal()
    try:
        # Search for employees with NULL or empty company
        employees = db.query(Employee).filter(
            (Employee.company == None) | (Employee.company == '')
        ).all()
        
        print(f"Found {len(employees)} employees with no company assigned:")
        print("-" * 50)
        for emp in employees:
            status = "Active" if emp.is_active else "Inactive"
            print(f"- {emp.full_name} (DNI: {emp.dni}, Status: {status})")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    find_null_company_employees()
