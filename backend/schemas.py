from pydantic import BaseModel
from typing import Optional, List, TypeVar, Generic
from datetime import date, datetime
from models import DeviceStatus, DeviceType

# Generic type for paginated responses
T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response schema"""
    items: List[T]
    total: int
    skip: int
    limit: int
    pages: int
    
    class Config:
        from_attributes = True

# Device Schemas

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "user"
    is_active: bool = True

    class Config:
        from_attributes = True

class UserInDB(User):
    hashed_password: str

class UserLogin(BaseModel):
    username: str
    password: str


class DeviceBase(BaseModel):
    serial_number: Optional[str] = None
    barcode: Optional[str] = None
    device_type: DeviceType
    brand: str
    model: str
    hostname: Optional[str] = None
    inventory_code: Optional[str] = None
    specifications: Optional[str] = None
    purchase_date: Optional[date] = None
    location: Optional[str] = "Callao"  # Device location/sede
    
    # Mobile Fields
    imei: Optional[str] = None
    phone_number: Optional[str] = None
    carrier: Optional[str] = None
    
    # Mobile Charger Fields
    mobile_charger_brand: Optional[str] = None
    mobile_charger_model: Optional[str] = None
    mobile_charger_serial: Optional[str] = None
    
    # Laptop Charger Fields
    laptop_charger_brand: Optional[str] = None
    laptop_charger_model: Optional[str] = None
    laptop_charger_serial: Optional[str] = None
    
    # Delivery type: NUEVO, INGRESO, or REEMPLAZO
    delivery_type: Optional[str] = "NUEVO"

    status: DeviceStatus = DeviceStatus.AVAILABLE

class DeviceCreate(DeviceBase):
    pass

class DeviceUpdate(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    barcode: Optional[str] = None
    hostname: Optional[str] = None
    inventory_code: Optional[str] = None
    specifications: Optional[str] = None
    status: Optional[DeviceStatus] = None
    location: Optional[str] = None  # Allow updating device location
    # Mobile fields
    imei: Optional[str] = None
    phone_number: Optional[str] = None
    carrier: Optional[str] = None
    mobile_charger_brand: Optional[str] = None
    mobile_charger_model: Optional[str] = None
    mobile_charger_serial: Optional[str] = None
    # Laptop charger fields
    laptop_charger_brand: Optional[str] = None
    laptop_charger_model: Optional[str] = None
    laptop_charger_serial: Optional[str] = None
    delivery_type: Optional[str] = None

class Device(DeviceBase):
    id: int
    current_assignment_id: Optional[int] = None

    class Config:
        from_attributes = True

# Employee Schemas
class EmployeeBase(BaseModel):
    full_name: str
    email: str
    department: Optional[str] = None
    dni: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    location: Optional[str] = "Callao"  # Office location/sede
    expected_laptop_count: Optional[int] = 1
    is_active: bool = True

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    dni: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    location: Optional[str] = None
    expected_laptop_count: Optional[int] = None
    is_active: Optional[bool] = None

class Employee(EmployeeBase):
    id: int

    class Config:
        from_attributes = True

# Assignment Schemas
class AssignmentBase(BaseModel):
    device_id: int
    employee_id: int
    notes: Optional[str] = None

class AssignmentCreate(AssignmentBase):
    pass

class Assignment(AssignmentBase):
    id: int
    assigned_date: datetime
    returned_date: Optional[datetime] = None
    pdf_acta_path: Optional[str] = None
    
    device: Device
    employee: Employee

    class Config:
        from_attributes = True

# Break circular dependency for Device -> Assignment history
class AssignmentHistory(BaseModel):
    id: int
    assigned_date: datetime
    returned_date: Optional[datetime] = None
    employee: Employee
    notes: Optional[str] = None
    pdf_acta_path: Optional[str] = None
    
    class Config:
        from_attributes = True

# Assignment view nested in Employee (shows Device info, no redundant Employee info)
class AssignmentWithDevice(BaseModel):
    id: int
    assigned_date: datetime
    returned_date: Optional[datetime] = None
    device: Device
    notes: Optional[str] = None
    pdf_acta_path: Optional[str] = None

    class Config:
        from_attributes = True

class DeviceDetail(Device):
    assignments: List[AssignmentHistory] = []

class EmployeeDetail(Employee):
    assignments: List[AssignmentWithDevice] = []

class ChargerInfo(BaseModel):
    brand: str = "HP"
    model: str = "TPN-DA15"
    serial: str = "-"

class AssignmentBatchCreate(BaseModel):
    employee_id: int
    device_ids: List[int]
    notes: Optional[str] = None
    charger_info: Optional[ChargerInfo] = None

# Maintenance Schemas
class MaintenanceLogBase(BaseModel):
    description: str
    cost: Optional[int] = 0
    vendor: Optional[str] = None
    status: Optional[str] = "open"

class MaintenanceLogCreate(MaintenanceLogBase):
    device_id: int

class MaintenanceLogUpdate(BaseModel):
    status: Optional[str] = None
    description: Optional[str] = None
    cost: Optional[int] = None
    vendor: Optional[str] = None

class MaintenanceLog(MaintenanceLogBase):
    id: int
    device_id: int
    date: datetime
    
    class Config:
        from_attributes = True

# Software Schemas
class SoftwareLicenseBase(BaseModel):
    name: str
    key: Optional[str] = None
    seats_total: int = 1
    cost_per_seat: Optional[int] = 0
    expiration_date: Optional[date] = None
    vendor: Optional[str] = None

class SoftwareLicenseCreate(SoftwareLicenseBase):
    pass

class SoftwareLicense(SoftwareLicenseBase):
    id: int
    assignments_count: int = 0 # Computed property
    
    class Config:
        from_attributes = True

class LicenseAssignmentCreate(BaseModel):
    license_id: int
    employee_id: int

class LicenseAssignment(BaseModel):
    id: int
    license_id: int
    employee_id: int
    assigned_date: datetime
    employee: Employee

    class Config:
        from_attributes = True

# Termination Schemas
class TerminationBase(BaseModel):
    employee_id: int
    termination_date: Optional[datetime] = None
    reason: Optional[str] = None
    observations: Optional[str] = None

class TerminationCreate(TerminationBase):
    pass

class Termination(TerminationBase):
    id: int
    created_at: datetime
    created_by_user_id: Optional[int] = None
    computer_acta_path: Optional[str] = None
    mobile_acta_path: Optional[str] = None
    
    class Config:
        from_attributes = True

class TerminationDetail(Termination):
    employee: Employee
    equipment_returned_count: int = 0

# Schema for returned device information
class ReturnedDeviceInfo(BaseModel):
    type: str
    brand: str
    model: str
    serial_number: str
    hostname: str
    inventory_code: Optional[str] = None
    imei: Optional[str] = None
    phone_number: Optional[str] = None
    
class TerminationWithActas(Termination):
    employee: Employee
    computer_acta_available: bool = False
    mobile_acta_available: bool = False
    computer_acta_path: Optional[str] = None  # Path to uploaded signed computer acta
    mobile_acta_path: Optional[str] = None    # Path to uploaded signed mobile acta
    equipment_returned_count: int = 0
    returned_devices: List[ReturnedDeviceInfo] = []

# Audit Log Schemas
class AuditLogBase(BaseModel):
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    details: Optional[str] = None

class AuditLog(AuditLogBase):
    id: int
    user_id: Optional[int] = None
    timestamp: datetime
    is_revertible: bool = True
    reverted_at: Optional[datetime] = None
    reverted_by_user_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class AuditLogWithUser(AuditLog):
    """Audit log with user information"""
    user_username: Optional[str] = None
    user_fullname: Optional[str] = None
    reverted_by_username: Optional[str] = None

class AuditLogDetail(AuditLog):
    """Audit log with full snapshot data"""
    snapshot_before: Optional[dict] = None
    snapshot_after: Optional[dict] = None
    user_username: Optional[str] = None
    user_fullname: Optional[str] = None
    reverted_by_username: Optional[str] = None


# Document Template Schemas
class TemplateVariable(BaseModel):
    name: str  # Variable placeholder name (e.g., 'employee_name')
    label: str  # User-friendly label (e.g., 'Nombre del Empleado')
    type: str  # 'text', 'date', 'number', 'table'
    sample_value: Optional[str] = None  # Sample value for preview

class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    template_type: str  # 'acta_entrega', 'acta_devolucion', etc.
    variables: Optional[str] = None  # JSON string

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    template_type: Optional[str] = None
    is_active: Optional[bool] = None
    variables: Optional[str] = None

class TemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    template_type: str
    file_path: str
    variables: Optional[str]
    is_active: bool
    is_default: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# Sale Item Schemas
class SaleItemCreate(BaseModel):
    device_id: int
    price: int

class SaleItem(BaseModel):
    id: int
    sale_id: int
    device_id: Optional[int] = None
    device_type: str
    device_description: str
    serial_number: Optional[str] = None
    price: int
    
    class Config:
        from_attributes = True

# Sale Schemas
class SaleCreate(BaseModel):
    buyer_name: str
    buyer_dni: str
    buyer_email: Optional[str] = None
    buyer_phone: Optional[str] = None
    buyer_address: Optional[str] = None
    sale_price: Optional[int] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    device_ids: List[int]  # List of device IDs being sold (legacy)
    items: Optional[List[SaleItemCreate]] = []  # New: itemized list with prices

class Sale(BaseModel):
    id: int
    sale_date: datetime
    buyer_name: str
    buyer_dni: str
    buyer_email: Optional[str] = None
    buyer_phone: Optional[str] = None
    buyer_address: Optional[str] = None
    sale_price: Optional[int] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    acta_path: Optional[str] = None
    created_by_user_id: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class SaleDetail(Sale):
    sold_devices: List[DeviceDetail] = []
    items: List[SaleItem] = []  # New: itemized list
    
    class Config:
        from_attributes = True

# Decommission Schemas
class DecommissionCreate(BaseModel):
    device_id: int
    reason: str
    observations: Optional[str] = None
    fabrication_year: Optional[int] = None
    purchase_reason: Optional[str] = None
    device_image_path: Optional[str] = None
    serial_image_path: Optional[str] = None

class DecommissionUpdate(BaseModel):
    reason: Optional[str] = None
    observations: Optional[str] = None
    fabrication_year: Optional[int] = None
    purchase_reason: Optional[str] = None
    device_image_path: Optional[str] = None
    serial_image_path: Optional[str] = None

class DecommissionResponse(BaseModel):
    id: int
    device_id: int
    decommission_date: datetime
    reason: str
    observations: Optional[str] = None
    acta_path: Optional[str] = None
    fabrication_year: Optional[int] = None
    purchase_reason: Optional[str] = None
    device_image_path: Optional[str] = None
    serial_image_path: Optional[str] = None
    created_by_user_id: int
    
    device: Device
    
    class Config:
        from_attributes = True

# Form Template Schemas
class FormTemplateBase(BaseModel):
    name: str
    type: Optional[str] = "DECOMMISSION"
    content: str # JSON string

class FormTemplateCreate(FormTemplateBase):
    pass

class FormTemplateResponse(FormTemplateBase):
    id: int
    is_active: bool
    created_at: datetime
    created_by_user_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# Custom Software Schemas (for Image Builder)
class CustomSoftwareBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "Custom"
    install_args: str = "/S"

class CustomSoftwareCreate(CustomSoftwareBase):
    filename: str
    file_path: str

class CustomSoftware(CustomSoftwareBase):
    id: int
    filename: str
    file_path: str
    created_at: datetime
    uploaded_by_user_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# Software Profile Schemas (for Image Builder department presets)
class SoftwareProfileBase(BaseModel):
    name: str
    department: str
    description: Optional[str] = None
    software_ids: str  # JSON array as string

class SoftwareProfileCreate(SoftwareProfileBase):
    pass

class SoftwareProfileUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    software_ids: Optional[str] = None

class SoftwareProfile(SoftwareProfileBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by_user_id: Optional[int] = None
    
    class Config:
        from_attributes = True
