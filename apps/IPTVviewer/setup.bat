@echo off
echo ================================
echo NextTV Viewer - Quick Setup
echo ================================
echo.

echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo Please install from: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js installed

echo.
echo Installing dependencies...
echo (This may take 2-5 minutes)
call npm install

if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ================================
echo Setup Complete!
echo ================================
echo.
echo To run on Android:
echo   1. Connect Android device or start emulator
echo   2. Run: npm run android
echo.
echo To start Metro bundler:
echo   npm start
echo.
echo See QUICK_COMMANDS.md for more info
echo.
pause
