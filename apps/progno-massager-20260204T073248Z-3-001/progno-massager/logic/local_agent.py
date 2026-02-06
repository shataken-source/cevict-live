"""
PROGNO Local Agent
==================
Handles system-level operations with mandatory approval workflow.
Implements AI Safety 2025 standards for local script execution.
"""
import os
import subprocess
from typing import Dict, Tuple, Optional
from datetime import datetime

from .supervisor import SupervisorAgent, ApprovalRequest


class LocalAgent:
    """
    The Local Agent executes system-level commands with safety controls.
    
    AI Safety 2025 Requirements:
    - All system commands require UI approval
    - No file deletion without explicit confirmation
    - Network operations are logged
    - Sandboxed execution where possible
    """
    
    # Commands that are ALWAYS blocked
    BLOCKED_COMMANDS = [
        'rm -rf', 'del /f /s', 'format', 'fdisk',
        'shutdown', 'reboot', 'init 0', 'init 6',
        'drop database', 'truncate', ':(){:|:&};:',
        'mkfs', 'dd if=/dev/zero'
    ]
    
    # Commands that require CRITICAL approval
    CRITICAL_COMMANDS = [
        'rm', 'del', 'sudo', 'chmod', 'chown',
        'pip install', 'npm install', 'apt install',
        'curl', 'wget', 'ssh', 'scp', 'rsync'
    ]
    
    def __init__(self, supervisor: SupervisorAgent = None):
        self.supervisor = supervisor or SupervisorAgent()
        self.execution_log = []
        self.blocked_attempts = []
        self._enabled = True
    
    def execute_command(self, command: str, 
                        cwd: str = None,
                        timeout: int = 30) -> Dict:
        """
        Execute a system command with full safety checks.
        
        Returns:
            Dict with success status, output, and approval details
        """
        # Check if Local Agent is enabled
        if not self._enabled:
            return {
                "success": False,
                "error": "Local Agent is disabled",
                "blocked": True
            }
        
        # Step 1: Check for blocked commands
        if self._is_blocked(command):
            self.blocked_attempts.append({
                "command": command,
                "timestamp": datetime.now().isoformat(),
                "reason": "Matches blocked pattern"
            })
            return {
                "success": False,
                "error": "Command blocked for safety reasons",
                "blocked": True
            }
        
        # Step 2: Request approval from Supervisor
        is_allowed, message, approval = self.supervisor.validate_local_command(command)
        
        if not is_allowed:
            return {
                "success": False,
                "error": message,
                "requires_approval": True,
                "approval_request": approval
            }
        
        # Step 3: Execute with timeout and capture output
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=cwd
            )
            
            # Log execution
            self.execution_log.append({
                "command": command,
                "timestamp": datetime.now().isoformat(),
                "exit_code": result.returncode,
                "approval_id": approval.request_id if approval else None
            })
            
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.returncode,
                "approval": approval
            }
            
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": f"Command timed out after {timeout}s",
                "timed_out": True
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def request_execution(self, command: str, description: str = None) -> ApprovalRequest:
        """
        Create an approval request for a command without executing.
        Use this for UI-driven approval workflows.
        """
        desc = description or f"Execute: {command[:100]}..."
        risk = self._classify_risk(command)
        
        return self.supervisor.request_approval(
            operation_type="local_command",
            description=desc,
            risk_level=risk
        )
    
    def execute_approved(self, request_id: str, command: str,
                         cwd: str = None, timeout: int = 30) -> Dict:
        """
        Execute a command that has already been approved.
        """
        if not self.supervisor.is_operation_approved(request_id):
            return {
                "success": False,
                "error": "Operation not approved or approval expired"
            }
        
        # Bypass normal approval since we verified it
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=cwd
            )
            
            self.execution_log.append({
                "command": command,
                "timestamp": datetime.now().isoformat(),
                "exit_code": result.returncode,
                "approval_id": request_id
            })
            
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.returncode
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ========================================
    # SAFE OPERATIONS (Pre-approved)
    # ========================================
    
    def list_directory(self, path: str = ".") -> Dict:
        """Safe: List directory contents."""
        return self.execute_command(f'ls -la "{path}"' if os.name != 'nt' else f'dir "{path}"')
    
    def read_file(self, path: str) -> Dict:
        """Safe: Read file contents."""
        if not os.path.exists(path):
            return {"success": False, "error": "File not found"}
        
        try:
            with open(path, 'r') as f:
                content = f.read()
            return {"success": True, "content": content}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_system_info(self) -> Dict:
        """Safe: Get basic system information."""
        import platform
        return {
            "success": True,
            "info": {
                "os": platform.system(),
                "release": platform.release(),
                "python": platform.python_version(),
                "cwd": os.getcwd()
            }
        }
    
    # ========================================
    # INTERNAL METHODS
    # ========================================
    
    def _is_blocked(self, command: str) -> bool:
        """Check if command matches any blocked patterns."""
        cmd_lower = command.lower()
        return any(blocked in cmd_lower for blocked in self.BLOCKED_COMMANDS)
    
    def _classify_risk(self, command: str) -> str:
        """Classify the risk level of a command."""
        cmd_lower = command.lower()
        
        if self._is_blocked(command):
            return "critical"
        
        if any(crit in cmd_lower for crit in self.CRITICAL_COMMANDS):
            return "high"
        
        # Medium risk: file operations, environment changes
        medium_patterns = ['cd', 'mkdir', 'touch', 'echo', 'cat', 'head', 'tail', 'grep']
        if any(p in cmd_lower for p in medium_patterns):
            return "medium"
        
        return "low"
    
    # ========================================
    # ADMIN CONTROLS
    # ========================================
    
    def enable(self):
        """Enable the Local Agent."""
        self._enabled = True
    
    def disable(self):
        """Disable the Local Agent (kill switch)."""
        self._enabled = False
    
    def get_execution_log(self) -> list:
        """Get log of all executed commands."""
        return self.execution_log
    
    def get_blocked_attempts(self) -> list:
        """Get log of blocked command attempts."""
        return self.blocked_attempts
    
    def clear_logs(self):
        """Clear all logs."""
        self.execution_log.clear()
        self.blocked_attempts.clear()

