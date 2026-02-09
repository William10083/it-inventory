from database import SessionLocal
from models import Employee

def update_null_companies():
    db = SessionLocal()
    try:
        # Fetch employees with NULL or empty company
        employees = db.query(Employee).filter(
            (Employee.company == None) | (Employee.company == '')
        ).all()
        
        count = len(employees)
        print(f"Found {count} employees to update.")
        
        if count > 0:
            for emp in employees:
                emp.company = "TRANSTOTAL AGENCIA MARITIMA S.A."
            
            db.commit()
            print(f"Successfully updated {count} employees to 'TRANSTOTAL AGENCIA MARITIMA S.A.'.")
        else:
            print("No employees needed updating.")
            
    except Exception as e:
        print(f"Error updating employees: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_null_companies()
