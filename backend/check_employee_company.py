from database import SessionLocal
from models import Employee

def check_diana_lazaro():
    db = SessionLocal()
    try:
        # Search for Diana Lazaro
        employees = db.query(Employee).filter(Employee.full_name.ilike("%Diana Lazaro%")).all()
        
        if not employees:
            print("No employee found matching 'Diana Lazaro'.")
        else:
            for emp in employees:
                print(f"Employee: {emp.full_name}")
                print(f"Company: '{emp.company}'")
                print(f"DNI: {emp.dni}")
                print(f"Location: {emp.location}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_diana_lazaro()
