def send_email(to_email: str, subject: str, body: str):
    """
    Stub function to simulate sending notifications.
    In production, use SendGrid/SMTP.
    """
    print(f"--- [EMAIL SENT] ---")
    print(f"TO: {to_email}")
    print(f"SUBJECT: {subject}")
    print(f"BODY: {body}")
    print(f"--------------------")

def send_assignment_notification(employee_name: str, employee_email: str, device_model: str, serial: str):
    subject = f"IT Equipment Assignment: {device_model}"
    body = f"""
    Hello {employee_name},
    
    You have been assigned the following IT equipment:
    
    Model: {device_model}
    Serial: {serial}
    
    Please sign the attached 'Acta de Entrega' (PDF feature coming soon).
    
    Regards,
    IT Support
    """
    send_email(employee_email or "employee@company.com", subject, body)

def send_maintenance_alert(device_model: str, issue: str):
    subject = f"Maintenance Alert: {device_model}"
    body = f"Device {device_model} requires maintenance.\nIssue: {issue}"
    send_email("support@company.com", subject, body)
