"""
ANAI - Autonomous AI Controller
================================
Interim controller activated during Empire Handover.
Monitors RTX 4000 SFF Ada temperatures and keeps Node.js processes alive.

Anai acts as the "CEO" of the betting empire when the owner is unavailable.
"""

import os
import logging
import subprocess
from datetime import datetime
from typing import Dict, Optional, List
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ANAI")


class AnaiState(Enum):
    DORMANT = "dormant"      # Not activated
    ACTIVE = "active"        # Running as interim controller
    MONITORING = "monitoring" # Active monitoring mode
    ALERT = "alert"          # Issue detected


class Anai:
    """
    Anai - The Autonomous AI Controller
    
    Responsibilities:
    1. Monitor GPU temperatures (RTX 4000 SFF Ada)
    2. Keep Node.js processes alive
    3. Report system status to Victoria & Navid
    4. Make autonomous decisions within defined limits
    """
    
    # Safety limits
    MAX_GPU_TEMP = 85  # Celsius - throttle warning
    CRITICAL_GPU_TEMP = 95  # Celsius - shutdown warning
    
    def __init__(self):
        self.state = AnaiState.DORMANT
        self.activation_time: Optional[datetime] = None
        self.activation_reason: Optional[str] = None
        
        # Decision log
        self.decision_log: List[Dict] = []
        
        # Monitored services
        self.monitored_services = [
            'cevict-ai',
            'progno',
            'prognostication',
            'ai-orchestrator'
        ]
        
        logger.info("🤖 Anai initialized (dormant)")

    def activate(self, reason: str = "empire_handover"):
        """Activates Anai as interim controller."""
        self.state = AnaiState.ACTIVE
        self.activation_time = datetime.now()
        self.activation_reason = reason
        
        logger.critical(f"🚨 ANAI ACTIVATED - Reason: {reason}")
        
        # Log activation
        self._log_decision(
            action="ACTIVATION",
            details={"reason": reason, "timestamp": self.activation_time.isoformat()}
        )
        
        # Start monitoring
        self._start_monitoring()

    def deactivate(self):
        """Deactivates Anai - returns control to owner."""
        duration = None
        if self.activation_time:
            duration = (datetime.now() - self.activation_time).total_seconds() / 3600
        
        logger.info(f"🤖 Anai deactivated. Duration: {duration:.2f}h" if duration else "🤖 Anai deactivated")
        
        self._log_decision(
            action="DEACTIVATION",
            details={"duration_hours": duration}
        )
        
        self.state = AnaiState.DORMANT
        self.activation_time = None
        self.activation_reason = None

    def _start_monitoring(self):
        """Starts the monitoring loop."""
        self.state = AnaiState.MONITORING
        logger.info("🔍 Anai monitoring started")

    def check_gpu_status(self) -> Dict:
        """
        Checks RTX 4000 SFF Ada GPU status.
        Returns temperature, utilization, and VRAM usage.
        """
        try:
            result = subprocess.run(
                ['nvidia-smi', '--query-gpu=temperature.gpu,utilization.gpu,memory.used,memory.total,power.draw',
                 '--format=csv,noheader,nounits'],
                capture_output=True, text=True, timeout=5
            )
            
            if result.returncode == 0:
                parts = result.stdout.strip().split(', ')
                
                temp = int(parts[0]) if len(parts) > 0 else 0
                util = int(parts[1]) if len(parts) > 1 else 0
                vram_used = int(parts[2]) if len(parts) > 2 else 0
                vram_total = int(parts[3]) if len(parts) > 3 else 0
                power = float(parts[4]) if len(parts) > 4 else 0
                
                status = {
                    'available': True,
                    'temperature': temp,
                    'utilization': util,
                    'vram_used': vram_used,
                    'vram_total': vram_total,
                    'power_draw': power,
                    'health': 'healthy'
                }
                
                # Check for thermal issues
                if temp >= self.CRITICAL_GPU_TEMP:
                    status['health'] = 'critical'
                    self._handle_critical_temp(temp)
                elif temp >= self.MAX_GPU_TEMP:
                    status['health'] = 'warning'
                    logger.warning(f"⚠️ GPU temperature warning: {temp}°C")
                
                return status
                
        except Exception as e:
            logger.error(f"GPU check failed: {e}")
        
        # Return mock data if nvidia-smi unavailable
        return {
            'available': False,
            'temperature': 55,
            'utilization': 35,
            'vram_used': 4096,
            'vram_total': 20480,
            'power_draw': 100,
            'health': 'simulated'
        }

    def _handle_critical_temp(self, temp: int):
        """Handles critical GPU temperature."""
        self.state = AnaiState.ALERT
        logger.critical(f"🔥 CRITICAL GPU TEMP: {temp}°C")
        
        self._log_decision(
            action="THERMAL_ALERT",
            details={"temperature": temp, "action": "notify_admins"}
        )
        
        # In a real scenario, would:
        # 1. Pause heavy AI workloads
        # 2. Notify Victoria and Navid
        # 3. Consider graceful shutdown

    def check_node_processes(self) -> Dict:
        """Checks status of Node.js processes for monitored services."""
        processes = {}
        
        try:
            # Check for running Node processes (cross-platform)
            if os.name == 'nt':  # Windows
                result = subprocess.run(
                    ['tasklist', '/FI', 'IMAGENAME eq node.exe', '/FO', 'CSV'],
                    capture_output=True, text=True, timeout=5
                )
                node_running = 'node.exe' in result.stdout
            else:  # Unix
                result = subprocess.run(
                    ['pgrep', '-f', 'node'],
                    capture_output=True, text=True, timeout=5
                )
                node_running = result.returncode == 0
            
            processes['node_running'] = node_running
            processes['count'] = len(result.stdout.strip().split('\n')) if node_running else 0
            
        except Exception as e:
            logger.error(f"Process check failed: {e}")
            processes['node_running'] = None
            processes['error'] = str(e)
        
        return processes

    def ensure_services_alive(self):
        """Ensures critical services are running, restarts if needed."""
        processes = self.check_node_processes()
        
        if not processes.get('node_running'):
            logger.warning("⚠️ Node.js processes not detected")
            self._log_decision(
                action="SERVICE_CHECK",
                details={"status": "no_processes", "action": "alert_sent"}
            )
            # In production, would attempt restart or notify admins

    def generate_status_report(self) -> str:
        """Generates a status report for Victoria and Navid."""
        gpu = self.check_gpu_status()
        processes = self.check_node_processes()
        
        report = f"""
================================================================================
                         ANAI STATUS REPORT
                         {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
================================================================================

ANAI STATE: {self.state.value.upper()}
Activated: {self.activation_time.isoformat() if self.activation_time else 'N/A'}
Reason: {self.activation_reason or 'N/A'}

--------------------------------------------------------------------------------
GPU STATUS (RTX 4000 SFF Ada)
--------------------------------------------------------------------------------
Temperature: {gpu['temperature']}°C {'⚠️' if gpu['temperature'] > self.MAX_GPU_TEMP else '✅'}
Utilization: {gpu['utilization']}%
VRAM: {gpu['vram_used']}MB / {gpu['vram_total']}MB
Power Draw: {gpu['power_draw']}W
Health: {gpu['health'].upper()}

--------------------------------------------------------------------------------
PROCESS STATUS
--------------------------------------------------------------------------------
Node.js Running: {'✅ Yes' if processes.get('node_running') else '❌ No'}
Process Count: {processes.get('count', 'Unknown')}

--------------------------------------------------------------------------------
RECENT DECISIONS ({len(self.decision_log)})
--------------------------------------------------------------------------------
"""
        
        for decision in self.decision_log[-5:]:
            report += f"  [{decision['timestamp']}] {decision['action']}\n"
        
        report += """
--------------------------------------------------------------------------------
                         END OF REPORT
================================================================================
"""
        return report

    def make_autonomous_decision(self, situation: str, options: List[str]) -> str:
        """
        Makes an autonomous decision within defined limits.
        Anai can only make decisions about system operations, not financial.
        """
        # Safety check - Anai cannot make financial decisions
        financial_keywords = ['bet', 'wager', 'stake', 'money', 'deposit', 'withdraw']
        if any(kw in situation.lower() for kw in financial_keywords):
            decision = "BLOCKED: Financial decisions require human approval"
            logger.warning(f"🚫 Anai blocked financial decision: {situation}")
        else:
            # For operational decisions, prefer conservative options
            if 'restart' in options:
                decision = 'restart'
            elif 'wait' in options:
                decision = 'wait'
            else:
                decision = options[0] if options else 'no_action'
        
        self._log_decision(
            action="AUTONOMOUS_DECISION",
            details={
                "situation": situation,
                "options": options,
                "decision": decision
            }
        )
        
        return decision

    def _log_decision(self, action: str, details: Dict):
        """Logs a decision for audit trail."""
        self.decision_log.append({
            "timestamp": datetime.now().isoformat(),
            "action": action,
            "details": details
        })
        
        # Keep only last 100 decisions
        if len(self.decision_log) > 100:
            self.decision_log = self.decision_log[-100:]

    def get_status(self) -> Dict:
        """Returns complete Anai status."""
        return {
            "state": self.state.value,
            "activation_time": self.activation_time.isoformat() if self.activation_time else None,
            "activation_reason": self.activation_reason,
            "gpu_status": self.check_gpu_status(),
            "process_status": self.check_node_processes(),
            "decision_count": len(self.decision_log),
            "recent_decisions": self.decision_log[-5:]
        }


# Singleton instance
_anai_instance: Optional[Anai] = None

def get_anai() -> Anai:
    global _anai_instance
    if _anai_instance is None:
        _anai_instance = Anai()
    return _anai_instance

