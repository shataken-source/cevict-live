@echo off
REM Simple Scheduled Task Setup for Crypto Trainer
REM Run this as Administrator

echo [SETUP] Creating Crypto Trainer Scheduled Task
echo.

REM Check for admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script requires administrator privileges
    echo Right-click and select "Run as Administrator"
    pause
    exit /b 1
)

REM Remove existing task
schtasks /query /tn "AlphaHunter-CryptoTrainer" >nul 2>&1
if %errorLevel% equ 0 (
    echo [WARNING] Removing existing task...
    schtasks /delete /tn "AlphaHunter-CryptoTrainer" /f
)

REM Create hourly task
echo [SCHEDULE] Creating hourly schedule...
schtasks /create /tn "AlphaHunter-CryptoTrainer" /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"cd C:\cevict-live\apps\alpha-hunter; npm run train\"" /sc hourly /ru "%USERNAME%" /rl highest /f

if %errorLevel% equ 0 (
    echo.
    echo [SUCCESS] Scheduled task created!
    echo.
    echo [INFO] Task Details:
    echo    Name: AlphaHunter-CryptoTrainer
    echo    Schedule: Every hour
    echo    Working Dir: C:\cevict-live\apps\alpha-hunter
    echo.
    echo [INFO] Management Commands:
    echo    View:   schtasks /query /tn "AlphaHunter-CryptoTrainer" /v
    echo    Run:    schtasks /run /tn "AlphaHunter-CryptoTrainer"
    echo    Delete: schtasks /delete /tn "AlphaHunter-CryptoTrainer" /f
    echo    GUI:    taskschd.msc
    echo.
    
    set /p run="Run task now for testing? (Y/n): "
    if /i not "%run%"=="n" (
        echo [START] Starting task...
        schtasks /run /tn "AlphaHunter-CryptoTrainer"
        echo [SUCCESS] Task started!
    )
) else (
    echo [ERROR] Failed to create scheduled task
)

echo.
pause
