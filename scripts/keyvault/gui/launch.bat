@echo off
REM KeyVault GUI Launcher
REM Double-click this to start the KeyVault Manager in the system tray.

cd /d "%~dp0"

REM Check if PyQt6 is installed
python -c "import PyQt6" 2>nul
if errorlevel 1 (
    echo Installing PyQt6...
    pip install -r requirements.txt
)

start /B pythonw keyvault_gui.py
