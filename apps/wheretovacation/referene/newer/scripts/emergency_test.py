import smtplib
from email.mime.text import MIMEText
import os

# --- HARDCODED CREDENTIALS (FOR EMERGENCY TEST ONLY) ---
MY_EMAIL = "YOUR_EMAIL@gmail.com"  # Replace this
MY_PASSWORD = "YOUR_16_CHARACTER_APP_PASSWORD" # Replace this
VICTORIA_SMS_GATEWAY = "2562645669@tmomail.net"  # Updated to current number (T-Mobile) 

def send_test_alert(recipient, subject, body):
    if not MY_EMAIL or not MY_PASSWORD:
        print("ALERT FAILED: Credentials missing.")
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
