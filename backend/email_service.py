import os
import smtplib
import base64
import hashlib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from cryptography.fernet import Fernet

SMTP_SERVER = "smtp.office365.com"
SMTP_PORT = 587

# Derive a stable Fernet key from SECRET_KEY
def _get_fernet() -> Fernet:
    secret = os.getenv("SECRET_KEY", "supersecretkey_change_me_in_production")
    # SHA-256 → 32 bytes → url-safe base64 = valid Fernet key
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return Fernet(key)

def encrypt_password(plain: str) -> str:
    return _get_fernet().encrypt(plain.encode()).decode()

def decrypt_password(enc: str) -> str:
    return _get_fernet().decrypt(enc.encode()).decode()

def send_email(
    smtp_email: str,
    smtp_password_enc: str,
    to_email: str,
    subject: str,
    body_html: str,
    cc_email: str = None,
) -> None:
    """Send an HTML email using the user's stored SMTP credentials (Office 365)."""
    password = decrypt_password(smtp_password_enc)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = smtp_email
    msg["To"] = to_email
    if cc_email:
        msg["Cc"] = cc_email

    msg.attach(MIMEText(body_html, "html", "utf-8"))

    recipients = [to_email] + ([cc_email] if cc_email else [])

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=15) as server:
        server.ehlo()
        server.starttls()
        server.login(smtp_email, password)
        server.sendmail(smtp_email, recipients, msg.as_string())
