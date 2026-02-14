import time
import schedule
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
import os

# --- LOAD ENVIRONMENT VARIABLES ---
# This function manually loads secrets from .env.local
def load_env(path='.env.local'):
    if not os.path.exists(path):
        print(f"CRITICAL: .env.local not found at {path}")
        return
    with open(path, 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                os.environ[key.strip()] = value.strip().strip('"')

load_env()

# --- CONFIGURATION (Reads from Environment) ---
MY_EMAIL = os.environ.get('SMTP_EMAIL')
MY_PASSWORD = os.environ.get('SMTP_PASSWORD')
VICTORIA_SMS_GATEWAY = "2562645669@tmomail.net"  # Updated to current number (T-Mobile) 
TIMEOUT_DAYS = 7 
STATUS_FILE = "status.dat"

# This is the command the AI/Dev receives upon emergency
RECOVERY_INSTRUCTIONS = """
*** BEGIN PROJECT HANDOVER CONTEXT ***
CONTEXT: You are taking over the Cevict Platform.
CRITICAL: Supabase Backups are active. Login/Auth logic is ready.
PRIORITY: Finalize the Animated Fishy Avatar implementation.
REPOSITORY: [INSERT GITHUB LINK HERE]
*** END PROJECT HANDOVER CONTEXT ***
"""

def get_message_body():
    return f"""
Hi Victoria,
This is the automated weekly check-in for the Cevict Project. The system is functioning normally.
If you do not hear from Uncle Jay for 7 days, this system will send the full project blueprint.

--- FOR EMERGENCY FORWARDING ---
{RECOVERY_INSTRUCTIONS}
"""

def send_alert(recipient, subject, body):
    if not MY_EMAIL or not MY_PASSWORD:
        print("ALERT FAILED: SMTP credentials missing from .env.local.")
        return False
    try:
        msg = MIMEText(body, 'plain')
        msg['From'] = MY_EMAIL
        msg['To'] = recipient
        msg['Subject'] = subject

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(MY_EMAIL, MY_PASSWORD)
        server.sendmail(MY_EMAIL, recipient, msg.as_string())
        server.quit()
        print(f"Alert sent to {recipient}")
        return True
    except Exception as e:
        print(f"ALERT FAILED: {e}")
        return False

def get_status():
    if not os.path.exists(STATUS_FILE):
        return datetime.min, "NEW_SYSTEM"
    try:
        with open(STATUS_FILE, "r") as f:
            content = f.read().strip().split(':')
            if len(content) == 2 and content[0] == "ACKNOWLEDGED":
                last_ack_time = datetime.fromisoformat(content[1])
                return last_ack_time, content[0]
    except Exception:
        pass
    return datetime.min, "CORRUPTED"

def weekly_protocol():
    last_ack, status_type = get_status()
    now = datetime.now()
    
    if now - last_ack > timedelta(days=TIMEOUT_DAYS):
        print("!!! EMERGENCY TIMEOUT DETECTED !!! Triggering Broadcast.")
        # Full broadcast logic would go here
        pass 

    else:
        # Send normal weekly check-in (SMS Gateway Test)
        sms_body = "Cevict Project Status: System Active. Please run acknowledge.py by next week."
        if send_alert(VICTORIA_SMS_GATEWAY, "Weekly Status Check", sms_body):
            print("WEEKLY SMS TEST SUCCESS: Message sent to Victoria.")
        else:
            print("WEEKLY SMS TEST FAILED.")

def run_test_and_schedule():
    print("--- RUNNING IMMEDIATE ALERT TEST ---")
    
    # 1. IMMEDIATE SMS TEST
    sms_body = "TEST: Legacy Keeper Protocol - Live connectivity check initiated. System status is nominal. Reply 'ok' if received."
    if send_alert(VICTORIA_SMS_GATEWAY, "URGENT TEST ALERT", sms_body):
        print("EMAIL/SMS TEST SUCCESS: Check phone for message.")
    else:
        print("EMAIL/SMS TEST FAILED.")
    
    # 2. SCHEDULE THE WEEKLY JOB
    schedule.every().monday.at("09:00").do(weekly_protocol)
    print("--- SCHEDULER ACTIVE ---")

if __name__ == "__main__":
    run_test_and_schedule()
