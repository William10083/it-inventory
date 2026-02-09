import pandas as pd
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import database, models
import io
from datetime import datetime

router = APIRouter()

def model_to_dict(models_list):
    data = []
    for m in models_list:
        d = m.__dict__.copy()
        if "_sa_instance_state" in d:
            del d["_sa_instance_state"]
        data.append(d)
    return data

@router.get("/export/excel")
def export_inventory_xlsx(db: Session = Depends(database.get_db)):
    # 1. Fetch Data
    devices = db.query(models.Device).all()
    employees = db.query(models.Employee).all()
    assignments = db.query(models.Assignment).all()
    maintenance = db.query(models.MaintenanceLog).all()

    # 2. Create DataFrames
    df_devices = pd.DataFrame(model_to_dict(devices))
    df_employees = pd.DataFrame(model_to_dict(employees))
    df_assignments = pd.DataFrame(model_to_dict(assignments))
    df_maintenance = pd.DataFrame(model_to_dict(maintenance))

    # 3. Write to Excel
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        if not df_devices.empty:
            df_devices.to_excel(writer, sheet_name='Devices', index=False)
        else:
            pd.DataFrame({'info': ['No devices']}).to_excel(writer, sheet_name='Devices')
            
        if not df_employees.empty:
            df_employees.to_excel(writer, sheet_name='Employees', index=False)
            
        if not df_assignments.empty:
            df_assignments.to_excel(writer, sheet_name='Assignments', index=False)
            
        if not df_maintenance.empty:
            df_maintenance.to_excel(writer, sheet_name='Maintenance', index=False)
            
    output.seek(0)
    
    headers = {
        'Content-Disposition': 'attachment; filename="inventory_export.xlsx"'
    }
    return StreamingResponse(
        output, 
        headers=headers, 
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

@router.get("/export/sales/excel")
def export_sales_xlsx(db: Session = Depends(database.get_db)):
    """
    Export all sales data to Excel with detailed information about each sale,
    including buyer info, devices sold, and prices.
    """
    from sqlalchemy.orm import joinedload
    
    # Fetch all sales with their items
    sales = db.query(models.Sale).options(
        joinedload(models.Sale.items),
        joinedload(models.Sale.sold_devices)
    ).all()
    
    # Prepare data for export
    sales_data = []
    
    for sale in sales:
        # Get devices info from sale_items (permanent record)
        devices_list = []
        total_devices = 0
        
        if sale.items:
            for item in sale.items:
                device_info = f"{item.device_type} {item.device_description}"
                if item.serial_number:
                    device_info += f" (S/N: {item.serial_number})"
                devices_list.append(device_info)
                total_devices += 1
        
        # Combine devices into a single string
        devices_str = " | ".join(devices_list) if devices_list else "N/A"
        
        sales_data.append({
            'ID Venta': sale.id,
            'Fecha de Venta': sale.sale_date.strftime('%d/%m/%Y %H:%M') if sale.sale_date else '',
            'Comprador': sale.buyer_name,
            'DNI': sale.buyer_dni,
            'Email': sale.buyer_email or '',
            'Teléfono': sale.buyer_phone or '',
            'Dirección': sale.buyer_address or '',
            'Cantidad de Dispositivos': total_devices,
            'Dispositivos Vendidos': devices_str,
            'Precio Total': sale.sale_price or 0,
            'Método de Pago': sale.payment_method or '',
            'Notas': sale.notes or '',
            'Tiene Acta': 'Sí' if sale.acta_path else 'No',
            'Creado Por': sale.created_by_user_id or '',
            'Fecha de Creación': sale.created_at.strftime('%d/%m/%Y %H:%M') if sale.created_at else ''
        })
    
    # Create DataFrame
    df_sales = pd.DataFrame(sales_data)
    
    # Create detailed items sheet
    items_data = []
    for sale in sales:
        if sale.items:
            for item in sale.items:
                items_data.append({
                    'ID Venta': sale.id,
                    'Fecha Venta': sale.sale_date.strftime('%d/%m/%Y') if sale.sale_date else '',
                    'Comprador': sale.buyer_name,
                    'Tipo Dispositivo': item.device_type,
                    'Descripción': item.device_description,
                    'Número de Serie': item.serial_number or 'N/A',
                    'Precio': item.price
                })
    
    df_items = pd.DataFrame(items_data)
    
    # Write to Excel
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        if not df_sales.empty:
            df_sales.to_excel(writer, sheet_name='Ventas', index=False)
            
            # Auto-adjust column widths
            worksheet = writer.sheets['Ventas']
            for idx, col in enumerate(df_sales.columns):
                max_length = max(
                    df_sales[col].astype(str).apply(len).max(),
                    len(col)
                )
                worksheet.column_dimensions[chr(65 + idx)].width = min(max_length + 2, 50)
        else:
            pd.DataFrame({'info': ['No hay ventas registradas']}).to_excel(writer, sheet_name='Ventas')
        
        if not df_items.empty:
            df_items.to_excel(writer, sheet_name='Detalle Items', index=False)
            
            # Auto-adjust column widths
            worksheet = writer.sheets['Detalle Items']
            for idx, col in enumerate(df_items.columns):
                max_length = max(
                    df_items[col].astype(str).apply(len).max(),
                    len(col)
                )
                worksheet.column_dimensions[chr(65 + idx)].width = min(max_length + 2, 50)
    
    output.seek(0)
    
    # Generate filename with current date
    today = datetime.now().strftime('%Y%m%d')
    filename = f"ventas_export_{today}.xlsx"
    
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    
    return StreamingResponse(
        output,
        headers=headers,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
