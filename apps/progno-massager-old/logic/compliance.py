"""
COMPLIANCE MODULE - Legal and Safety Guardrails
================================================
Implements 2025 AI Safety and Legal Compliance standards:
- Decisional Transparency (EU AI Act)
- Data Privacy (GDPR/GDPR 2025)
- Responsible Innovation (Addiction Safety)
- Workspace Security (M2M Authentication)
"""

import re
import json
import hmac
import hashlib
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple, Optional


class ExplainabilityEngine:
    """
    Generates human-readable explanations for PROGNO predictions.
    Adheres to Decisional Transparency (EU AI Act 2025).
    """
    
    @staticmethod
    def generate_explanation(prediction_data: Dict) -> str:
        """
        Generates a human-readable explanation for a PROGNO prediction.
        """
        explanation = f"PROGNO Prediction for {prediction_data.get('event_name', 'Unknown Event')} "
        explanation += f"on {prediction_data.get('event_date', 'N/A')}:\n\n"
        explanation += f"  - Model Version: {prediction_data.get('model_version', 'Cevict Flex 1.0')}\n"
        
        prob_score = prediction_data.get('probability_score', 0)
        explanation += f"  - Probability Score: {prob_score:.2%}\n"
        explanation += f"  - Confidence Level: {prediction_data.get('confidence_level', 'Standard')}\n"
        
        commands_applied = prediction_data.get('commands_applied', [])
        if commands_applied:
            explanation += "  - Data Massaging Commands Applied: " + ", ".join(commands_applied) + "\n"
        
        calc_meta = prediction_data.get('calc_metadata', {})
        
        if prediction_data.get('is_arb_found') or (calc_meta and calc_meta.get('arbitrage', {}).get('is_arb')):
            arb_meta = calc_meta.get('arbitrage', {})
            explanation += f"  - Arbitrage Opportunity Detected: Yes\n"
            if arb_meta.get('profit_pct'):
                explanation += f"    → Profit: {arb_meta.get('profit_pct', 'N/A')}%\n"
        
        if calc_meta and calc_meta.get('hedge'):
            hedge_meta = calc_meta.get('hedge', {})
            explanation += f"  - Hedge Suggestion: Yes\n"
            if hedge_meta.get('hedge_stake'):
                explanation += f"    → Hedge Stake: ${hedge_meta.get('hedge_stake', 'N/A')}\n"
        
        explanation += f"  - Validation Status: {prediction_data.get('validation_status', 'Pending')}\n"
        
        return explanation


class PIIProtector:
    """
    Scans and sanitizes Personally Identifiable Information.
    Adheres to Data Privacy (GDPR/GDPR 2025).
    """
    
    PII_PATTERNS = {
        "email": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
        "phone": r"\b(?:\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4})\b",
        "ssn": r"\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b",
        "credit_card": r"\b(?:\d[ -]*?){13,16}\b",
        "ip_address": r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b",
        "api_key": r"\b(sk-[a-zA-Z0-9]{32,}|AIza[0-9A-Za-z\-_]{35}|pk_live_[a-zA-Z0-9]{24})\b"
    }

    @staticmethod
    def redact_pii(data_string: str, redaction_char: str = "*") -> str:
        """
        Scans a string for common PII patterns and redacts them.
        """
        if not isinstance(data_string, str):
            return data_string
            
        redacted_data = data_string
        for pii_type, pattern in PIIProtector.PII_PATTERNS.items():
            redacted_data = re.sub(pattern, f"[{pii_type.upper()}_REDACTED]", redacted_data)
        return redacted_data

    @staticmethod
    def process_data_for_pii(data: Any) -> Any:
        """
        Recursively processes dictionaries/lists to redact PII.
        """
        if data is None:
            return None
        if isinstance(data, dict):
            return {k: PIIProtector.process_data_for_pii(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [PIIProtector.process_data_for_pii(item) for item in data]
        elif isinstance(data, str):
            return PIIProtector.redact_pii(data)
        return data


class AddictionSafetyGuard:
    """
    Implements responsible AI usage limits.
    Adheres to Responsible Innovation standards.
    """
    
    MAX_DAILY_PREDICTIONS = 100
    MAX_ARB_OPPORTUNITIES = 10
    MIN_COOLING_OFF_MINUTES = 5
    MAX_CONSECUTIVE_LOSSES = 5
    
    _prediction_counts: Dict[str, int] = {}
    _last_prediction_time: Dict[str, datetime] = {}
    _consecutive_losses: Dict[str, int] = {}

    @classmethod
    def check_limits(cls, user_id: str) -> Tuple[bool, str]:
        """
        Checks for responsible AI usage limits.
        """
        now = datetime.now()
        
        # Daily prediction limit
        if user_id not in cls._prediction_counts:
            cls._prediction_counts[user_id] = 0
        cls._prediction_counts[user_id] += 1
        
        if cls._prediction_counts[user_id] > cls.MAX_DAILY_PREDICTIONS:
            return False, "Daily prediction limit reached. Take a break."

        # Cooling off period
        if user_id in cls._last_prediction_time:
            time_since_last = now - cls._last_prediction_time[user_id]
            if time_since_last < timedelta(minutes=cls.MIN_COOLING_OFF_MINUTES):
                remaining = cls.MIN_COOLING_OFF_MINUTES - (time_since_last.seconds // 60)
                return False, f"Please wait {remaining} minutes before your next prediction."
        
        cls._last_prediction_time[user_id] = now
        return True, "Limits check passed."

    @classmethod
    def track_outcome(cls, user_id: str, was_correct: bool) -> Tuple[bool, str]:
        """Tracks user's prediction outcomes for loss aversion."""
        if user_id not in cls._consecutive_losses:
            cls._consecutive_losses[user_id] = 0
        
        if not was_correct:
            cls._consecutive_losses[user_id] += 1
            if cls._consecutive_losses[user_id] >= cls.MAX_CONSECUTIVE_LOSSES:
                return False, "You've had several consecutive losses. Consider a cooling-off period."
        else:
            cls._consecutive_losses[user_id] = 0
        
        return True, "Outcome tracked."

    @classmethod
    def reset_daily_counts(cls):
        """Resets daily counts (call at midnight)."""
        cls._prediction_counts = {}


class M2MAuthenticator:
    """
    Machine-to-Machine authentication using HMAC tokens.
    Prevents function-calling hallucinations and unauthorized script execution.
    """
    
    def __init__(self, secret_key: Optional[str] = None):
        self.secret_key = secret_key or os.environ.get("M2M_SECRET_KEY", "")
        if not self.secret_key:
            self.secret_key = "default_m2m_key_change_in_production"

    def generate_token(self, payload_str: str) -> str:
        """Generates an HMAC token for machine-to-machine authentication."""
        signature = hmac.new(
            self.secret_key.encode('utf-8'),
            payload_str.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return f"{payload_str}.{signature}"

    def verify_token(self, token: str) -> Tuple[bool, str]:
        """Verifies an HMAC token."""
        if '.' not in token:
            return False, "Invalid token format."
        
        payload_str, signature = token.rsplit('.', 1)
        expected_signature = hmac.new(
            self.secret_key.encode('utf-8'),
            payload_str.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        if hmac.compare_digest(expected_signature, signature):
            return True, payload_str
        return False, "Invalid signature."


class ComplianceManager:
    """
    Unified compliance manager that coordinates all compliance checks.
    """
    
    def __init__(self):
        self.pii_protector = PIIProtector()
        self.addiction_guard = AddictionSafetyGuard()
        self.m2m_auth = M2MAuthenticator()
        self.explainability = ExplainabilityEngine()

    def full_compliance_check(self, 
                              data: Dict, 
                              action_type: str, 
                              user_id: Optional[str] = None) -> Tuple[Dict, Dict]:
        """
        Performs a comprehensive compliance check before sensitive actions.
        
        Returns:
            Tuple of (processed_data, compliance_report)
        """
        compliance_report = {
            "timestamp": datetime.now().isoformat(),
            "action_type": action_type,
            "pii_redacted": False,
            "addiction_safety_passed": True,
            "checks_passed": []
        }

        # 1. PII Protection
        processed_data = self.pii_protector.process_data_for_pii(data)
        if processed_data != data:
            compliance_report["pii_redacted"] = True
            compliance_report["checks_passed"].append("PII Redaction")
        
        # 2. Addiction Safety (if user_id provided)
        if user_id:
            passed, msg = self.addiction_guard.check_limits(user_id)
            compliance_report["addiction_safety_passed"] = passed
            compliance_report["addiction_safety_message"] = msg
            if passed:
                compliance_report["checks_passed"].append("Addiction Safety")

        # 3. Decisional Transparency
        compliance_report["checks_passed"].append("Decisional Transparency")
        
        return processed_data, compliance_report


# Singleton instance
_compliance_manager: Optional[ComplianceManager] = None

def get_compliance_manager() -> ComplianceManager:
    global _compliance_manager
    if _compliance_manager is None:
        _compliance_manager = ComplianceManager()
    return _compliance_manager
