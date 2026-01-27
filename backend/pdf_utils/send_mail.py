import configparser
from datetime import datetime
import shutil
import smtplib
from email.message import EmailMessage
from pathlib import Path
import sys

# import os
# from dotenv import load_dotenv
# load_dotenv()

# EMAIL_USER = os.getenv("EMAIL_USER")
# EMAIL_PASS = os.getenv("EMAIL_PASS")
# print(EMAIL_PASS)

def get_app_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent

def resource_path(rel_path: str) -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS) / rel_path
    return Path(__file__).resolve().parent / rel_path


APP_DIR = get_app_dir()
CONFIG_PATH = APP_DIR / "config.ini"

TEMPLATE = resource_path("config.template.ini")  # bundled, read-only


def ensure_config():
    """
    Returns True if mail.ini already existed,
    False if it was created from template.
    """
    
    if not CONFIG_PATH.exists():
        if not TEMPLATE.exists():
            raise FileNotFoundError(
                f"Config template not found at {TEMPLATE}"
            )
            
        shutil.copy(TEMPLATE, CONFIG_PATH)
        raise RuntimeError("Created config.ini from template. Please edit the details and save to enable mailing")
    
    return True  # already existed



def read_config():
    cfg = configparser.ConfigParser()
    cfg.read(CONFIG_PATH, encoding="utf-8")

    mail = cfg["mail"]

    send_mail = cfg.getboolean("mail", "send_mail", fallback=False)

    email = mail.get("email", "").strip()
    password = mail.get("app_password", "").strip()
    to_mail = mail.get("email_to", "").strip()
    subject = mail.get("email_subject", "Digital PF").strip()
    body = mail.get("email_body", "PF").strip()+"\n"+ datetime.now().strftime("%d/%m/%Y")


    if not email or not password or "PASTE_" in password:
        raise RuntimeError(
            "Mail config not set. Please edit config.ini"
        )

    return {
        "send_mail": send_mail,
        "smtp_host": mail.get("smtp_host"),
        "smtp_port": mail.getint("smtp_port"),
        "email": email,
        "password": password,
        "to_mail":to_mail,
        "subject":subject,
        "body": body
    }






def send_mail(
    name: str | None = None,
    UAN: str | None = None,
    attachment_path: str | None = None,
):
    

    try:
        ensure_config()
        read_config()
    except RuntimeError as e:
        print(e)
        return False

    cfg = read_config()
    
    SEND_MAIL = cfg["send_mail"]

    SMTP_HOST = cfg["smtp_host"]
    SMTP_PORT = cfg["smtp_port"]
    EMAIL_USER = cfg["email"]
    EMAIL_PASS = cfg["password"]
    EMAIL_TO = cfg["to_mail"]
    MAIL_SUB = cfg["subject"]
    MAIL_BODY = cfg["body"]


    if not EMAIL_USER or not EMAIL_PASS:
        print("Email credentials not set")
        return False
    
    if not SEND_MAIL:
        print("Mailing has been disabled. To enable, edit mail.ini and set send_mail = True")
        return False

    msg = EmailMessage()
    msg["From"] = EMAIL_USER
    msg["To"] = EMAIL_TO
    msg["Subject"] = MAIL_SUB
    
    MAIL_BODY_WITH_NAME = f"{MAIL_BODY} \n\n {name} \n {UAN}"

    msg.set_content(MAIL_BODY_WITH_NAME)

    if attachment_path:
        path = Path(attachment_path)
        with open(path, "rb") as f:
            msg.add_attachment(
                f.read(),
                maintype="application",
                subtype="pdf",
                filename=path.name,
            )

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(EMAIL_USER, EMAIL_PASS)
        server.send_message(msg)

    print("Mailed PDF: ", path.name)
