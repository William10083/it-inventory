from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Date, Enum
from sqlalchemy.orm import relationship
from database import Base
import datetime
import enum

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String)
    role = Column(String, default="user") # admin, user, viewer
    is_active = Column(Boolean, default=True)

class DeviceStatus(str, enum.Enum):
    AVAILABLE = "available"
    ASSIGNED = "assigned"
    MAINTENANCE = "maintenance"
    RETIRED = "retired"
    SOLD = "sold"

class DeviceType(str, enum.Enum):
    LAPTOP = "laptop"
    MONITOR = "monitor"
    KEYBOARD = "keyboard"
    MOUSE = "mouse"
    STAND = "stand"
    BACKPACK = "mochila"
    MOBILE = "celular"
    CHARGER = "charger"
    CHIP = "chip"
    KEYBOARD_MOUSE_KIT = "kit teclado/mouse"
    HEADPHONES = "auriculares"

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    department = Column(String, nullable=True)
    dni = Column(String, unique=True, nullable=True)
    company = Column(String, nullable=True)
    position = Column(String, nullable=True) # Added position/puesto
    location = Column(String, default="Callao", nullable=True)  # Office location/sede
    expected_laptop_count = Column(Integer, default=1) # How many laptops this employee should have
    is_active = Column(Boolean, default=True)
    
    # Termination fields
    termination_date = Column(DateTime, nullable=True)
    termination_reason = Column(String, nullable=True)
    
    # Soft delete fields
    deleted_at = Column(DateTime, nullable=True)
    deleted_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    assignments = relationship("Assignment", back_populates="employee")
    terminations = relationship("Termination", back_populates="employee")

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(String, unique=True, index=True)
    barcode = Column(String, unique=True, index=True)  # Can be same as serial or custom asset tag
    device_type = Column(String)  # Stored as string, validated via Pydantic or Enum
    brand = Column(String)
    model = Column(String)
    hostname = Column(String, nullable=True) # Added Hostname
    inventory_code = Column(String, nullable=True) # Inventory/Asset code (e.g. INV-MON-001)
    specifications = Column(String, nullable=True) # e.g. "Ram 16GB, i7" for laptops
    purchase_date = Column(Date, nullable=True)
    
    # Mobile Specific Fields
    imei = Column(String, unique=True, nullable=True, index=True)
    phone_number = Column(String, nullable=True)
    carrier = Column(String, nullable=True) # e.g. "Telcel", "Movistar"
    
    # Mobile Charger Fields (stored as part of mobile device, not separate)
    mobile_charger_brand = Column(String, nullable=True)
    mobile_charger_model = Column(String, nullable=True)
    mobile_charger_serial = Column(String, nullable=True)
    
    # Laptop Charger Fields (stored as part of laptop device, not separate)
    laptop_charger_brand = Column(String, nullable=True)
    laptop_charger_model = Column(String, nullable=True)
    laptop_charger_serial = Column(String, nullable=True)
    
    # Delivery type: NUEVO, INGRESO, or REEMPLAZO
    delivery_type = Column(String, default="NUEVO", nullable=True)

    status = Column(String, default=DeviceStatus.AVAILABLE)
    location = Column(String, default="Callao", nullable=True)  # Device location/sede
    
    # Soft delete fields
    deleted_at = Column(DateTime, nullable=True)
    deleted_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Sale relationship
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=True)
    
    # Current assignment (quick lookup, though history is in Assignment table)
    # This is optional normalization, but useful for performance
    # current_assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=True)

    assignments = relationship("Assignment", back_populates="device", foreign_keys="Assignment.device_id")
    maintenance_logs = relationship("MaintenanceLog", back_populates="device")
    sale = relationship("Sale", back_populates="sold_devices")
    decommissions = relationship("Decommission", back_populates="device")

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"))
    assigned_date = Column(DateTime, default=datetime.datetime.utcnow)
    returned_date = Column(DateTime, nullable=True)
    notes = Column(String, nullable=True)  # Notes when assigning
    pdf_acta_path = Column(String, nullable=True)  # Path to assignment acta
    
    # Return/Termination fields
    return_observations = Column(String, nullable=True)  # Observations when equipment is returned
    return_acta_computer_path = Column(String, nullable=True)  # Path to computer return acta
    return_acta_mobile_path = Column(String, nullable=True)  # Path to mobile return acta
    termination_id = Column(Integer, ForeignKey("terminations.id"), nullable=True)  # Link to termination if applicable

    device = relationship("Device", back_populates="assignments", foreign_keys=[device_id])
    employee = relationship("Employee", back_populates="assignments")
    termination = relationship("Termination", back_populates="returned_assignments")

class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"))
    date = Column(DateTime, default=datetime.datetime.utcnow)
    description = Column(String) # Issue reported or work done
    cost = Column(Integer, default=0) # Storing as simple integer/float
    vendor = Column(String, nullable=True) # e.g. "Apple Store", "Local Repair"
    status = Column(String, default="open") # open, closed, pending
    
    device = relationship("Device", back_populates="maintenance_logs")

class SoftwareLicense(Base):
    __tablename__ = "software_licenses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True) # e.g. "Office 365 Business"
    key = Column(String, nullable=True) # License Key
    seats_total = Column(Integer, default=1)
    cost_per_seat = Column(Integer, default=0)
    expiration_date = Column(Date, nullable=True)
    vendor = Column(String, nullable=True) # e.g. "Microsoft"
    
    assignments = relationship("LicenseAssignment", back_populates="license")

class LicenseAssignment(Base):
    __tablename__ = "license_assignments"

    id = Column(Integer, primary_key=True, index=True)
    license_id = Column(Integer, ForeignKey("software_licenses.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"))
    assigned_date = Column(DateTime, default=datetime.datetime.utcnow)
    
    license = relationship("SoftwareLicense", back_populates="assignments")
    employee = relationship("Employee")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Nullable for system actions or if user deleted
    action = Column(String) # e.g. "DEVICE_ASSIGNED", "LICENSE_CREATED"
    details = Column(String, nullable=True) # JSON string or text
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Enhanced audit fields for undo/revert functionality
    entity_type = Column(String, nullable=True) # "device", "employee", "assignment"
    entity_id = Column(Integer, nullable=True) # ID of the affected entity
    snapshot_before = Column(String, nullable=True) # JSON string of state before change
    snapshot_after = Column(String, nullable=True) # JSON string of state after change
    is_revertible = Column(Boolean, default=True) # Can this action be undone?
    reverted_at = Column(DateTime, nullable=True) # When was this action reverted
    reverted_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Who reverted it

    user = relationship("User", foreign_keys=[user_id])
    reverted_by = relationship("User", foreign_keys=[reverted_by_user_id])

class Termination(Base):
    __tablename__ = "terminations"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    termination_date = Column(DateTime, default=datetime.datetime.utcnow)
    reason = Column(String, nullable=True)  # Reason for termination
    observations = Column(String, nullable=True)  # General observations about the termination
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # PDF paths for signed actas
    computer_acta_path = Column(String, nullable=True)  # Path to computer return acta
    mobile_acta_path = Column(String, nullable=True)    # Path to mobile return acta
    
    # Relationships
    employee = relationship("Employee", back_populates="terminations")
    returned_assignments = relationship("Assignment", back_populates="termination")
    created_by = relationship("User")

# Document Template Model for dynamic acta generation
class DocumentTemplate(Base):
    __tablename__ = 'document_templates'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String)
    template_type = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    variables = Column(String)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    creator = relationship('User', foreign_keys=[created_by])

class Sale(Base):
    __tablename__ = "sales"
    
    id = Column(Integer, primary_key=True, index=True)
    sale_date = Column(DateTime, default=datetime.datetime.utcnow)
    buyer_name = Column(String, nullable=False)
    buyer_dni = Column(String, nullable=False)
    buyer_email = Column(String, nullable=True)
    buyer_phone = Column(String, nullable=True)
    buyer_address = Column(String, nullable=True)
    sale_price = Column(Integer, nullable=True)  # Total price in local currency
    payment_method = Column(String, nullable=True)  # Efectivo, Transferencia, etc.
    notes = Column(String, nullable=True)
    acta_path = Column(String, nullable=True)  # Path to uploaded signed acta
    created_by_user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    sold_devices = relationship("Device", back_populates="sale")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by_user_id])


class SaleItem(Base):
    __tablename__ = "sale_items"
    
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)  # Nullable in case device is deleted
    
    # Denormalized fields to preserve information even if device is deleted
    device_type = Column(String, nullable=False)  # "laptop", "monitor", etc.
    device_description = Column(String, nullable=False)  # "HP Laptop 15-dy2xxx"
    serial_number = Column(String, nullable=True)  # Preserve serial number
    price = Column(Integer, nullable=False)  # Sale price for this device
    
    # Relationships
    sale = relationship("Sale", back_populates="items")
    device = relationship("Device")


class Decommission(Base):
    __tablename__ = "decommissions"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"))
    decommission_date = Column(DateTime, default=datetime.datetime.utcnow)
    reason = Column(String, nullable=False) # e.g. "Obsoleto", "Dañado", "Robo"
    observations = Column(String, nullable=True)
    acta_path = Column(String, nullable=True) # Path to generated PDF
    
    # New fields for enhanced decommission tracking
    fabrication_year = Column(Integer, nullable=True) # Year of manufacture
    purchase_reason = Column(String, nullable=True) # Reason for original purchase
    device_image_path = Column(String, nullable=True) # Path to device photo
    serial_image_path = Column(String, nullable=True) # Path to serial number photo
    
    created_by_user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    device = relationship("Device", back_populates="decommissions")
    created_by = relationship("User", foreign_keys=[created_by_user_id])

class FormTemplate(Base):
    """
    Templates for form fields (recurring texts), distinct from DocumentTemplate (files).
    Used for saving sets of values like "Reason", "Observations", etc.
    """
    __tablename__ = "form_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True) # e.g. "Robo Estándar"
    type = Column(String, default="DECOMMISSION") # DECOMMISSION, OTHER
    content = Column(String) # JSON string storing the field values
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)


class CustomSoftware(Base):
    """
    Custom software installers uploaded by users for Image Builder.
    Stores metadata about .exe/.msi files for provisioning scripts.
    """
    __tablename__ = "custom_software"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)  # e.g., "Adobe Photoshop 2024"
    description = Column(String, nullable=True)  # Brief description
    category = Column(String, default="Custom")  # Category for grouping
    filename = Column(String)  # Original filename (e.g., "photoshop_setup.exe")
    file_path = Column(String)  # Server storage path (e.g., "uploads/installers/abc123.exe")
    install_args = Column(String, default="/S")  # Silent install arguments
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    uploaded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_user_id])


class SoftwareProfile(Base):
    """
    Predefined software profiles for departments (e.g., Development, Sales, Design).
    Stores collections of software IDs for quick selection in Image Builder.
    """
    __tablename__ = "software_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)  # e.g., "Desarrollo Frontend"
    department = Column(String, index=True)  # e.g., "Development", "Sales"
    description = Column(String, nullable=True)  # Brief description
    software_ids = Column(String)  # JSON array of software IDs (Winget + custom)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_user_id])

