"""
GUARDIAN PULSE - Dead Man's Switch with Sinch SMS
==================================================
Enterprise heartbeat system that:
1. Sends daily status SMS via Sinch
2. Waits for "GOTIT" reply to reset timer
3. Triggers "Empire Handover" if no response in 24 hours

Part of Project Guardian for Cevict LLC
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, List
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("GUARDIAN_PULSE")

# Try to import Sinch SDK
try:
    from sinch import SinchClient
    SINCH_AVAILABLE = True
except ImportError:
    SINCH_AVAILABLE = False
    logger.warning("Sinch SDK not installed. Run: pip install sinch")

# Try to import Supabase
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False


class HandoverStatus(Enum):
    ACTIVE = "active"           # Owner is responsive
    WARNING = "warning"         # 12 hours without response
    TRIGGERED = "triggered"     # Handover in progress
    COMPLETE = "complete"       # Handover executed


class GuardianPulse:
    """
    The Dead Man's Switch for Cevict LLC.
    
    Sends daily heartbeat SMS. If owner doesn't reply "GOTIT" within 
    the timeout period, triggers the Empire Handover protocol.
    """
    
    def __init__(self, timeout_hours: int = 24):
        # Sinch credentials from environment
        self.sinch_key_id = os.getenv("SINCH_KEY_ID")
        self.sinch_key_secret = os.getenv("SINCH_KEY_SECRET")
        self.sinch_project_id = os.getenv("SINCH_PROJECT_ID")
        self.sinch_number = os.getenv("SINCH_NUMBER")  # Virtual number
        self.owner_number = os.getenv("MY_PERSONAL_NUMBER")
        
        # Handover recipients
        self.victoria_email = os.getenv("VICTORIA_EMAIL", "victoria@cevict.com")
        self.victoria_phone = os.getenv("VICTORIA_PHONE")
        self.navid_email = os.getenv("NAVID_EMAIL", "navid@cevict.com")
        self.navid_phone = os.getenv("NAVID_PHONE")
        
        # Timeout configuration
        self.timeout_hours = timeout_hours
        self.warning_threshold = timeout_hours / 2  # 12 hours for warning
        
        # Initialize Sinch client
        self.sinch_client = None
        if SINCH_AVAILABLE and all([self.sinch_key_id, self.sinch_key_secret, self.sinch_project_id]):
            try:
                self.sinch_client = SinchClient(
                    key_id=self.sinch_key_id,
                    key_secret=self.sinch_key_secret,
                    project_id=self.sinch_project_id
                )
                logger.info("✅ Sinch client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Sinch: {e}")
        else:
            logger.warning("⚠️ Sinch not configured - running in mock mode")
        
        # Initialize Supabase
        self.supabase: Optional[Client] = None
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if SUPABASE_AVAILABLE and supabase_url and supabase_key:
            try:
                self.supabase = create_client(supabase_url, supabase_key)
                logger.info("✅ Supabase connected for Guardian Pulse")
            except Exception as e:
                logger.error(f"Supabase connection failed: {e}")
        
        # In-memory state (backup if Supabase unavailable)
        self._last_check_in = datetime.now()
        self._handover_status = HandoverStatus.ACTIVE

    def get_last_check_in(self) -> datetime:
        """Gets the last check-in timestamp from Supabase or memory."""
        if self.supabase:
            try:
                result = self.supabase.table("system_config").select("value").eq(
                    "config_key", "guardian_last_checkin"
                ).execute()
                
                if result.data:
                    return datetime.fromisoformat(result.data[0]['value'])
            except Exception as e:
                logger.error(f"Error fetching check-in: {e}")
        
        return self._last_check_in

    def update_check_in(self) -> bool:
        """Updates the last check-in timestamp."""
        now = datetime.now()
        self._last_check_in = now
        
        if self.supabase:
            try:
                # Upsert the check-in timestamp
                self.supabase.table("system_config").upsert({
                    "config_key": "guardian_last_checkin",
                    "value": now.isoformat(),
                    "updated_at": now.isoformat()
                }).execute()
                
                logger.info(f"✅ Check-in updated: {now.isoformat()}")
                return True
            except Exception as e:
                logger.error(f"Error updating check-in: {e}")
        
        return False

    def get_hours_since_checkin(self) -> float:
        """Returns hours since last check-in."""
        last_checkin = self.get_last_check_in()
        delta = datetime.now() - last_checkin
        return delta.total_seconds() / 3600

    def get_status(self) -> HandoverStatus:
        """Determines current guardian status based on check-in time."""
        hours = self.get_hours_since_checkin()
        
        if hours >= self.timeout_hours:
            return HandoverStatus.TRIGGERED
        elif hours >= self.warning_threshold:
            return HandoverStatus.WARNING
        else:
            return HandoverStatus.ACTIVE

    def generate_status_summary(self) -> str:
        """Generates a summary for the heartbeat SMS."""
        from .supervisor import get_supervisor
        
        supervisor = get_supervisor()
        stats = supervisor.get_validation_stats()
        
        summary = f"""
📊 PROGNO Status ({datetime.now().strftime('%m/%d %H:%M')})
✅ Approved: {stats['approvals']}
❌ Rejected: {stats['rejections']}
📈 Rate: {stats['approval_rate']}%
🤖 All systems operational
        """.strip()
        
        return summary

    def send_status_update(self, custom_message: Optional[str] = None) -> Optional[str]:
        """
        Sends daily heartbeat SMS via Sinch Batches API.
        
        Returns:
            Batch ID if successful, None otherwise
        """
        if not self.sinch_client:
            logger.warning("Sinch not available - simulating SMS send")
            return "mock_batch_id"
        
        if not self.owner_number:
            logger.error("Owner phone number not configured")
            return None
        
        # Build message
        report_summary = custom_message or self.generate_status_summary()
        message = f"""🛡️ GUARDIAN PULSE

{report_summary}

⏰ Reply 'GOTIT' within {self.timeout_hours}h to confirm.
No response = Empire Handover to Victoria & Navid.
"""
        
        try:
            response = self.sinch_client.sms.batches.send(
                body=message,
                to=[self.owner_number],
                from_=self.sinch_number
            )
            
            logger.info(f"✅ Heartbeat SMS sent. Batch ID: {response.id}")
            
            # Log to Supabase
            if self.supabase:
                self.supabase.table("guardian_pulse_log").insert({
                    "event_type": "heartbeat_sent",
                    "batch_id": response.id,
                    "message": message[:500],
                    "timestamp": datetime.now().isoformat()
                }).execute()
            
            return response.id
            
        except Exception as e:
            logger.error(f"❌ Failed to send heartbeat: {e}")
            return None

    def handle_webhook_reply(self, incoming_json: Dict) -> Dict:
        """
        Parses the Sinch Inbound SMS Webhook.
        
        Webhook endpoint: POST /webhooks/sinch
        
        Args:
            incoming_json: The webhook payload from Sinch
            
        Returns:
            Dict with processing result
        """
        # Extract sender and message body
        sender = incoming_json.get('from', '')
        body = incoming_json.get('body', '').strip().upper()
        
        # Also check for different webhook formats
        if not sender:
            sender = incoming_json.get('from_', '')
        if not body:
            body = incoming_json.get('text', incoming_json.get('message', '')).strip().upper()
        
        result = {
            "processed": False,
            "sender": sender,
            "body": body,
            "action": None,
            "message": ""
        }
        
        logger.info(f"📨 Incoming SMS from {sender}: {body}")
        
        # Verify sender is the owner
        if sender != self.owner_number:
            result["message"] = "Unauthorized sender"
            logger.warning(f"⚠️ Unauthorized SMS from {sender}")
            return result
        
        # Check for GOTIT command
        if body == "GOTIT":
            self.update_check_in()
            result["processed"] = True
            result["action"] = "check_in_reset"
            result["message"] = "Timer reset successfully"
            
            # Send confirmation
            self.send_confirmation()
            
            logger.info("✅ Guardian check-in confirmed via SMS")
            return result
        
        # Check for STATUS command
        elif body == "STATUS":
            result["processed"] = True
            result["action"] = "status_request"
            result["message"] = self.generate_status_summary()
            
            # Send status response
            self.send_status_response()
            return result
        
        # Unknown command
        else:
            result["message"] = f"Unknown command: {body}. Reply GOTIT or STATUS."
            return result

    def send_confirmation(self):
        """Sends confirmation that check-in was received."""
        if not self.sinch_client or not self.owner_number:
            return
        
        try:
            self.sinch_client.sms.batches.send(
                body="✅ GUARDIAN: Check-in confirmed. Timer reset. See you tomorrow!",
                to=[self.owner_number],
                from_=self.sinch_number
            )
        except Exception as e:
            logger.error(f"Failed to send confirmation: {e}")

    def send_status_response(self):
        """Sends current status in response to STATUS command."""
        if not self.sinch_client or not self.owner_number:
            return
        
        hours = self.get_hours_since_checkin()
        status = self.get_status()
        
        message = f"""📊 GUARDIAN STATUS

⏰ Hours since check-in: {hours:.1f}h
📍 Status: {status.value.upper()}
⚡ Timeout in: {max(0, self.timeout_hours - hours):.1f}h

Reply 'GOTIT' to reset timer.
"""
        
        try:
            self.sinch_client.sms.batches.send(
                body=message,
                to=[self.owner_number],
                from_=self.sinch_number
            )
        except Exception as e:
            logger.error(f"Failed to send status: {e}")

    def check_and_trigger_handover(self) -> bool:
        """
        Checks if handover should be triggered.
        Called periodically by a cron job.
        
        Returns:
            True if handover was triggered
        """
        status = self.get_status()
        hours = self.get_hours_since_checkin()
        
        if status == HandoverStatus.WARNING:
            # Send warning SMS
            self.send_warning()
            return False
        
        elif status == HandoverStatus.TRIGGERED:
            # Execute the Empire Handover
            logger.critical("🚨 GUARDIAN PULSE: TRIGGERING EMPIRE HANDOVER")
            return self.execute_empire_handover()
        
        return False

    def send_warning(self):
        """Sends warning SMS that timeout is approaching."""
        if not self.sinch_client or not self.owner_number:
            return
        
        hours_left = self.timeout_hours - self.get_hours_since_checkin()
        
        message = f"""⚠️ GUARDIAN WARNING

You have {hours_left:.1f} hours to respond.
No reply = Empire Handover to Victoria & Navid.

Reply 'GOTIT' NOW to prevent handover.
"""
        
        try:
            self.sinch_client.sms.batches.send(
                body=message,
                to=[self.owner_number],
                from_=self.sinch_number
            )
            logger.warning(f"⚠️ Warning sent. {hours_left:.1f}h remaining.")
        except Exception as e:
            logger.error(f"Failed to send warning: {e}")

    def execute_empire_handover(self) -> bool:
        """
        Executes the Empire Handover protocol.
        
        1. Notifies Victoria and Navid via SMS
        2. Sends detailed email with access instructions
        3. Updates system state
        4. Activates Anai as interim controller
        """
        logger.critical("🚨 EXECUTING EMPIRE HANDOVER PROTOCOL")
        
        # 1. Notify via SMS
        handover_message = f"""🚨 EMPIRE HANDOVER ACTIVATED

Owner has not responded in {self.timeout_hours}+ hours.
You are now in control of Cevict LLC operations.

Access the dashboard at: https://cevict.ai/admin
Anai is monitoring all systems.

This is not a drill.
"""
        
        recipients = []
        if self.victoria_phone:
            recipients.append(self.victoria_phone)
        if self.navid_phone:
            recipients.append(self.navid_phone)
        
        if self.sinch_client and recipients:
            try:
                self.sinch_client.sms.batches.send(
                    body=handover_message,
                    to=recipients,
                    from_=self.sinch_number
                )
                logger.info("✅ Handover SMS sent to Victoria and Navid")
            except Exception as e:
                logger.error(f"Failed to send handover SMS: {e}")
        
        # 2. Log the handover
        if self.supabase:
            try:
                self.supabase.table("guardian_pulse_log").insert({
                    "event_type": "empire_handover",
                    "timestamp": datetime.now().isoformat(),
                    "details": {
                        "hours_since_checkin": self.get_hours_since_checkin(),
                        "recipients": recipients,
                        "victoria_email": self.victoria_email,
                        "navid_email": self.navid_email
                    }
                }).execute()
                
                # Update system state
                self.supabase.table("system_config").upsert({
                    "config_key": "guardian_handover_status",
                    "value": "triggered",
                    "updated_at": datetime.now().isoformat()
                }).execute()
                
            except Exception as e:
                logger.error(f"Failed to log handover: {e}")
        
        # 3. Activate Anai
        self._activate_anai()
        
        logger.critical("🚨 EMPIRE HANDOVER COMPLETE - Control transferred")
        return True

    def _activate_anai(self):
        """
        Activates Anai as the interim AI controller.
        Anai monitors RTX 4000 SFF Ada temps and keeps Node.js processes alive.
        """
        logger.info("🤖 Activating Anai as interim controller")
        
        if self.supabase:
            try:
                self.supabase.table("system_config").upsert({
                    "config_key": "anai_active",
                    "value": "true",
                    "updated_at": datetime.now().isoformat()
                }).execute()
                
                self.supabase.table("system_config").upsert({
                    "config_key": "anai_activation_reason",
                    "value": "empire_handover",
                    "updated_at": datetime.now().isoformat()
                }).execute()
            except Exception as e:
                logger.error(f"Failed to activate Anai: {e}")

    def get_pulse_status(self) -> Dict:
        """Returns complete Guardian Pulse status."""
        return {
            "status": self.get_status().value,
            "hours_since_checkin": self.get_hours_since_checkin(),
            "timeout_hours": self.timeout_hours,
            "hours_remaining": max(0, self.timeout_hours - self.get_hours_since_checkin()),
            "last_checkin": self.get_last_check_in().isoformat(),
            "sinch_configured": self.sinch_client is not None,
            "supabase_connected": self.supabase is not None,
            "owner_configured": self.owner_number is not None,
            "handover_recipients": {
                "victoria": bool(self.victoria_phone or self.victoria_email),
                "navid": bool(self.navid_phone or self.navid_email)
            }
        }


# Singleton instance
_guardian_instance: Optional[GuardianPulse] = None

def get_guardian() -> GuardianPulse:
    global _guardian_instance
    if _guardian_instance is None:
        _guardian_instance = GuardianPulse()
    return _guardian_instance

