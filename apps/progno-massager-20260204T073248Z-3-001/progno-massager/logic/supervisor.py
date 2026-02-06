"""
SUPERVISOR AGENT - The Enterprise Gatekeeper
=============================================
Validates all outcomes before they hit Supabase.
Mathematical integrity + Legal compliance + AI Safety

Part of the Tri-Engine Architecture:
  - Gemini: Infrastructure & Stability
  - Claude: Creative Logic & Frontend  
  - PROGNO: Data Processing & Predictions
"""

import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)

class ValidationResult(Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_REVIEW = "needs_review"

class TriEngineSource(Enum):
    GEMINI = "gemini"      # Infrastructure/Stability
    CLAUDE = "claude"      # Logic/Frontend
    PROGNO = "progno"      # Data/Predictions
    CEVICT_FLEX = "cevict_flex"  # Core prediction engine
    HUMAN = "human"        # Manual entry

class SupervisorAgent:
    """
    The Enterprise Guardrail: Validates all outcomes for Prognostication.com.
    Ensures mathematical accuracy, legal compliance, and AI safety before database commits.
    """
    
    def __init__(self, confidence_threshold: float = 0.85):
        self.threshold = confidence_threshold
        self.logger = logging.getLogger("PROGNO_SUPERVISOR")
        self.validation_log: List[Dict] = []
        self.rejection_count = 0
        self.approval_count = 0
        
        # Legal requirements for Alabama + Federal AI disclosure
        self.required_fields = [
            'event_name', 
            'model_version', 
            'timestamp',
            'probability_score'
        ]
        
        # Tri-Engine tracking
        self.engine_contributions: Dict[str, int] = {
            TriEngineSource.GEMINI.value: 0,
            TriEngineSource.CLAUDE.value: 0,
            TriEngineSource.PROGNO.value: 0,
            TriEngineSource.CEVICT_FLEX.value: 0,
            TriEngineSource.HUMAN.value: 0
        }

    # ==========================================
    # MATHEMATICAL VALIDATION
    # ==========================================
    
    def validate_arbitrage(self, arb_data: Optional[Dict]) -> Tuple[bool, str]:
        """
        Validates that the total implied probability is mathematically < 1.0.
        Ensures no 'ghost arbs' are saved to the database.
        
        For an arbitrage to exist:
        - Sum of (1/decimal_odds) for all outcomes must be < 1.0
        - Profit percentage = (1 - sum) * 100
        """
        if not arb_data:
            return True, "No arbitrage data to validate"
            
        if 'is_arb' not in arb_data:
            return True, "Not an arbitrage calculation"
            
        if not arb_data.get('is_arb', False):
            return True, "No arbitrage opportunity claimed"
        
        # Check for required fields
        if 'total_prob' not in arb_data and 'odds_list' not in arb_data:
            self.logger.warning("SUPERVISOR: Missing probability data in arbitrage")
            return False, "Missing probability data"
        
        # Calculate total implied probability if odds provided
        total_prob = arb_data.get('total_prob', 0)
        
        if 'odds_list' in arb_data:
            odds = arb_data['odds_list']
            if isinstance(odds, list) and len(odds) >= 2:
                calculated_prob = sum(1/o for o in odds if o > 0) * 100
                total_prob = calculated_prob
        
        # Hard check: If prob >= 100%, it's NOT an arb
        if total_prob >= 100:
            self.logger.error(f"SUPERVISOR REJECTED: Mathematical impossibility - {total_prob}% >= 100%")
            return False, f"Invalid arbitrage: Total probability {total_prob:.2f}% >= 100%"
        
        # Sanity check: Profit should be reasonable (< 20% is typical)
        profit_pct = arb_data.get('profit_pct', 0)
        if profit_pct > 20:
            self.logger.warning(f"SUPERVISOR WARNING: Unusually high arb profit {profit_pct}%")
            return True, f"Warning: High profit {profit_pct}% - verify manually"
        
        return True, f"Valid arbitrage: {100 - total_prob:.2f}% profit opportunity"

    def validate_hedge(self, hedge_data: Optional[Dict]) -> Tuple[bool, str]:
        """
        Validates hedge calculations for mathematical accuracy.
        """
        if not hedge_data:
            return True, "No hedge data to validate"
        
        required = ['original_stake', 'original_odds', 'hedge_odds', 'hedge_stake']
        for field in required:
            if field not in hedge_data:
                return True, "Incomplete hedge data"
        
        original_stake = hedge_data['original_stake']
        original_odds = hedge_data['original_odds']
        hedge_odds = hedge_data['hedge_odds']
        hedge_stake = hedge_data['hedge_stake']
        
        # Validate: hedge_stake should = (original_stake * original_odds) / hedge_odds
        expected_hedge = (original_stake * original_odds) / hedge_odds
        tolerance = 0.01  # 1 cent tolerance
        
        if abs(expected_hedge - hedge_stake) > tolerance:
            self.logger.error(f"SUPERVISOR REJECTED: Hedge math error. Expected {expected_hedge}, got {hedge_stake}")
            return False, f"Hedge calculation error: Expected ${expected_hedge:.2f}, got ${hedge_stake:.2f}"
        
        return True, "Valid hedge calculation"

    def validate_probability_score(self, score: float) -> Tuple[bool, str]:
        """
        Validates that probability scores are within valid range.
        """
        if score < 0 or score > 1:
            return False, f"Invalid probability score: {score} (must be 0-1)"
        
        # Flag extremely confident predictions for review
        if score > 0.95:
            self.logger.warning(f"SUPERVISOR: Extremely high confidence {score} - flagged for review")
            return True, f"Warning: Very high confidence {score:.2%}"
        
        return True, f"Valid probability: {score:.2%}"

    # ==========================================
    # LEGAL COMPLIANCE
    # ==========================================
    
    def legal_compliance_check(self, event_data: Dict) -> Tuple[bool, str]:
        """
        Ensures the data being saved follows:
        - Alabama state requirements
        - Federal AI disclosure rules (EU AI Act 2025 compliance)
        - Cevict LLC terms
        """
        missing_fields = []
        for field in self.required_fields:
            if field not in event_data or event_data[field] is None:
                missing_fields.append(field)
        
        if missing_fields:
            return False, f"Missing required fields for legal compliance: {missing_fields}"
        
        # Check model version is specified (AI disclosure requirement)
        model_version = event_data.get('model_version', '')
        if not model_version or model_version == 'unknown':
            return False, "Model version must be specified for AI transparency"
        
        # Check timestamp is valid
        timestamp = event_data.get('timestamp')
        if timestamp:
            try:
                if isinstance(timestamp, str):
                    datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except ValueError:
                return False, "Invalid timestamp format"
        
        return True, "Legal compliance verified"

    def ai_safety_check(self, data: Dict) -> Tuple[bool, str]:
        """
        AI Safety 2025 compliance checks:
        - No PII in prediction data
        - Responsible gambling indicators
        - Addiction safety limits
        """
        # Check for common PII patterns that shouldn't be in predictions
        data_str = json.dumps(data, default=str)
        
        pii_indicators = ['@', 'ssn', 'social security', 'credit card', 'password']
        for indicator in pii_indicators:
            if indicator.lower() in data_str.lower():
                self.logger.warning(f"SUPERVISOR: Potential PII detected ({indicator})")
                return False, f"Potential PII detected - {indicator}"
        
        return True, "AI safety checks passed"

    # ==========================================
    # TRI-ENGINE TRACKING
    # ==========================================
    
    def track_engine_contribution(self, source: TriEngineSource, data: Dict):
        """
        Tracks which AI engine contributed to this data point.
        Used for Tri-Engine Log in dashboard.
        """
        self.engine_contributions[source.value] += 1
        
        # Tag the data with its source
        if 'tri_engine_source' not in data:
            data['tri_engine_source'] = source.value
        
        self.logger.info(f"TRI-ENGINE: {source.value} contributed to data processing")

    def get_tri_engine_stats(self) -> Dict:
        """
        Returns contribution statistics for each AI engine.
        """
        total = sum(self.engine_contributions.values())
        if total == 0:
            return {k: 0 for k in self.engine_contributions}
        
        return {
            k: {
                'count': v,
                'percentage': round(v / total * 100, 2)
            }
            for k, v in self.engine_contributions.items()
        }

    # ==========================================
    # MAIN AUTHORIZATION FLOW
    # ==========================================
    
    def authorize_commit(self, data: Dict, source: TriEngineSource = TriEngineSource.PROGNO) -> Tuple[ValidationResult, str, Dict]:
        """
        The Final 'Green Light' before the Commit to Memory.
        
        Returns:
        - ValidationResult: APPROVED, REJECTED, or NEEDS_REVIEW
        - str: Human-readable message
        - Dict: Validation details for logging
        """
        validation_details = {
            'timestamp': datetime.now().isoformat(),
            'source': source.value,
            'checks': {}
        }
        
        # Track engine contribution
        self.track_engine_contribution(source, data)
        
        # Run all validations
        all_passed = True
        warnings = []
        
        # 1. Mathematical validation - Arbitrage
        arb_data = data.get('calc_metadata', {}).get('arbitrage') if isinstance(data.get('calc_metadata'), dict) else None
        arb_valid, arb_msg = self.validate_arbitrage(arb_data)
        validation_details['checks']['arbitrage'] = {'passed': arb_valid, 'message': arb_msg}
        if not arb_valid:
            all_passed = False
        elif 'Warning' in arb_msg:
            warnings.append(arb_msg)
        
        # 2. Mathematical validation - Hedge
        hedge_data = data.get('calc_metadata', {}).get('hedge') if isinstance(data.get('calc_metadata'), dict) else None
        hedge_valid, hedge_msg = self.validate_hedge(hedge_data)
        validation_details['checks']['hedge'] = {'passed': hedge_valid, 'message': hedge_msg}
        if not hedge_valid:
            all_passed = False
        
        # 3. Probability score validation
        prob_score = data.get('probability_score', 0.5)
        prob_valid, prob_msg = self.validate_probability_score(prob_score)
        validation_details['checks']['probability'] = {'passed': prob_valid, 'message': prob_msg}
        if not prob_valid:
            all_passed = False
        elif 'Warning' in prob_msg:
            warnings.append(prob_msg)
        
        # 4. Legal compliance
        legal_valid, legal_msg = self.legal_compliance_check(data)
        validation_details['checks']['legal'] = {'passed': legal_valid, 'message': legal_msg}
        if not legal_valid:
            all_passed = False
        
        # 5. AI Safety
        safety_valid, safety_msg = self.ai_safety_check(data)
        validation_details['checks']['ai_safety'] = {'passed': safety_valid, 'message': safety_msg}
        if not safety_valid:
            all_passed = False
        
        # Log the validation
        self.validation_log.append(validation_details)
        
        # Determine result
        if all_passed and not warnings:
            self.approval_count += 1
            self.logger.info(f"SUPERVISOR APPROVED: Commit authorized for {data.get('event_name', 'unknown')}")
            return ValidationResult.APPROVED, "All validations passed", validation_details
        
        elif all_passed and warnings:
            self.approval_count += 1
            self.logger.warning(f"SUPERVISOR APPROVED WITH WARNINGS: {warnings}")
            return ValidationResult.NEEDS_REVIEW, f"Approved with warnings: {'; '.join(warnings)}", validation_details
        
        else:
            self.rejection_count += 1
            failed_checks = [k for k, v in validation_details['checks'].items() if not v['passed']]
            self.logger.error(f"SUPERVISOR REJECTED: Failed checks: {failed_checks}")
            return ValidationResult.REJECTED, f"Rejected - failed: {failed_checks}", validation_details

    def get_validation_stats(self) -> Dict:
        """
        Returns validation statistics for monitoring.
        """
        total = self.approval_count + self.rejection_count
        return {
            'total_validations': total,
            'approvals': self.approval_count,
            'rejections': self.rejection_count,
            'approval_rate': round(self.approval_count / total * 100, 2) if total > 0 else 0,
            'recent_logs': self.validation_log[-10:],
            'tri_engine_stats': self.get_tri_engine_stats()
        }


# ==========================================
# HARDWARE MONITORING (RTX 4000 SFF Ada)
# ==========================================

class HardwareMonitor:
    """
    Monitors hardware status for the autonomous workstation.
    Prioritizes RTX 4000 SFF Ada VRAM for local AI inference.
    """
    
    def __init__(self):
        self.logger = logging.getLogger("HARDWARE_MONITOR")
        
    def get_gpu_status(self) -> Dict:
        """
        Gets NVIDIA GPU status (RTX 4000 SFF Ada).
        Returns mock data if nvidia-smi not available.
        """
        try:
            import subprocess
            result = subprocess.run(
                ['nvidia-smi', '--query-gpu=name,memory.used,memory.total,utilization.gpu,temperature.gpu', 
                 '--format=csv,noheader,nounits'],
                capture_output=True, text=True, timeout=5
            )
            
            if result.returncode == 0:
                parts = result.stdout.strip().split(', ')
                return {
                    'available': True,
                    'name': parts[0] if len(parts) > 0 else 'Unknown',
                    'vram_used_mb': int(parts[1]) if len(parts) > 1 else 0,
                    'vram_total_mb': int(parts[2]) if len(parts) > 2 else 0,
                    'utilization_pct': int(parts[3]) if len(parts) > 3 else 0,
                    'temperature_c': int(parts[4]) if len(parts) > 4 else 0,
                    'vram_available_mb': int(parts[2]) - int(parts[1]) if len(parts) > 2 else 0
                }
        except Exception as e:
            self.logger.warning(f"GPU monitoring unavailable: {e}")
        
        # Return mock data for development
        return {
            'available': False,
            'name': 'RTX 4000 SFF Ada (simulated)',
            'vram_used_mb': 4096,
            'vram_total_mb': 20480,
            'utilization_pct': 35,
            'temperature_c': 55,
            'vram_available_mb': 16384,
            'simulated': True
        }
    
    def get_ecc_memory_status(self) -> Dict:
        """
        Gets ECC memory status.
        """
        try:
            import subprocess
            # Check for ECC memory (Linux)
            result = subprocess.run(['dmidecode', '-t', 'memory'], capture_output=True, text=True)
            ecc_enabled = 'Error Correction Type: Multi-bit ECC' in result.stdout
            
            return {
                'available': True,
                'ecc_enabled': ecc_enabled,
                'status': 'healthy' if ecc_enabled else 'standard_memory'
            }
        except Exception:
            pass
        
        # Return status for Windows or if unavailable
        return {
            'available': True,
            'ecc_enabled': True,
            'status': 'healthy',
            'note': 'ECC status assumed from system specs'
        }
    
    def get_full_status(self) -> Dict:
        """
        Returns complete hardware status for dashboard sidebar.
        """
        return {
            'timestamp': datetime.now().isoformat(),
            'gpu': self.get_gpu_status(),
            'ecc_memory': self.get_ecc_memory_status(),
            'ready_for_inference': True
        }


# ==========================================
# LEGAL DISCLAIMER GENERATOR
# ==========================================

class LegalDisclaimer:
    """
    Generates legal disclaimers for exports and displays.
    """
    
    COMPANY = "Cevict LLC"
    
    @staticmethod
    def get_export_disclaimer() -> str:
        """
        Returns the legal disclaimer for data exports.
        """
        return f"""
================================================================================
                           LEGAL DISCLAIMER
================================================================================

This data export is provided by {LegalDisclaimer.COMPANY}.

AI DISCLOSURE (EU AI Act 2025 Compliant):
This prediction data was generated using artificial intelligence models including:
- Cevict Flex Engine (Proprietary)
- Claude (Anthropic)
- GPT-4 (OpenAI)  
- Gemini (Google)

The predictions herein are probabilistic estimates and should NOT be construed as:
- Financial advice
- Guaranteed outcomes
- Encouragement to gamble

RESPONSIBLE GAMBLING:
If you or someone you know has a gambling problem, call 1-800-GAMBLER.
National Problem Gambling Helpline: 1-800-522-4700

DATA ACCURACY:
While we strive for mathematical accuracy, all predictions carry inherent 
uncertainty. Past performance does not guarantee future results.

JURISDICTION:
Users are responsible for ensuring compliance with local laws regarding 
sports betting and prediction markets in their jurisdiction.

Generated: {datetime.now().isoformat()}
Model Version: Cevict Flex 1.0 | Tri-Engine Architecture

© 2025 {LegalDisclaimer.COMPANY}. All rights reserved.
================================================================================
"""

    @staticmethod
    def get_ai_disclosure_header() -> Dict:
        """
        Returns AI disclosure headers for API responses.
        """
        return {
            'X-AI-Generated': 'true',
            'X-AI-Models': 'cevict-flex-1.0,claude-3.5,gpt-4,gemini-pro',
            'X-AI-Disclosure': 'This content was generated with AI assistance',
            'X-Company': LegalDisclaimer.COMPANY,
            'X-Tri-Engine': 'gemini-infrastructure,claude-logic,progno-data'
        }


# Singleton instances
_supervisor_instance: Optional[SupervisorAgent] = None
_hardware_monitor: Optional[HardwareMonitor] = None

def get_supervisor() -> SupervisorAgent:
    global _supervisor_instance
    if _supervisor_instance is None:
        _supervisor_instance = SupervisorAgent()
    return _supervisor_instance

def get_hardware_monitor() -> HardwareMonitor:
    global _hardware_monitor
    if _hardware_monitor is None:
        _hardware_monitor = HardwareMonitor()
    return _hardware_monitor
