import smtplib
from email.mime.text import MIMEText
import os

# --- LOAD ENVIRONMENT VARIABLES (FORCE CURRENT DIRECTORY) ---
def load_env(path='.env.local'): # Looks for .env.local in current directory
    if not os.path.exists(path):
        print(f"CRITICAL: .env.local not found at {path}")
        # FALLBACK: Check one directory up (monorepo root)
        path = '../.env.local' 
        if not os.path.exists(path):
            print("CRITICAL: .env.local not found in fallback location.")
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

def send_test_alert(recipient, subject, body):
    if not MY_EMAIL or not MY_PASSWORD:
        print("ALERT FAILED: SMTP credentials missing from environment.")
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
        print(f"ALERT SUCCESS: Message sent to {recipient}")
        return True
    except Exception as e:
        print(f"ALERT FAILED (SMTP ERROR): {e}")
        return False

# --- RUN IMMEDIATE TEST ---
print("--- RUNNING CRITICAL SMS TEST ---")
sms_body = "CRITICAL TEST: Legacy Keeper communication confirmed ACTIVE. Reply 'ok' now."
send_test_alert(VICTORIA_SMS_GATEWAY, "URGENT LEGACY TEST", sms_body)
