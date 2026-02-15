@echo off
REM DevOps Agent Launcher
REM Double-click to start the DevOps Agent in the system tray.

cd /d "%~dp0"

python -c "import PyQt6" 2>nul
if errorlevel 1 (
    echo Installing PyQt6...
    pip install -r requirements.txt
)

start /B pythonw devops_agent.py
