@echo off
REM ============================================
REM CORRECT PORT ASSIGNMENTS
REM ============================================
REM
REM Port 3000: Gateway (landing page)
REM Port 3001: CEVICT / Forge API (DO NOT USE FOR OTHER APPS!)
REM Port 3002: WhereToVacation / PetReunion
REM Port 3003: (available)
REM Port 3004: (available)
REM Port 3005: (available)
REM
REM ============================================

echo.
echo ============================================
echo KILLING EXISTING PROCESSES
echo ============================================

FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3001') DO taskkill /F /PID %%P 2>nul
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3002') DO taskkill /F /PID %%P 2>nul
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3003') DO taskkill /F /PID %%P 2>nul

echo.
echo ============================================
echo STARTING APPS
echo ============================================
echo.

REM --- CRITICAL: Start CEVICT/Forge FIRST on port 3001 ---
echo [1/3] Starting CEVICT/Forge API on port 3001...
START "CEVICT-Forge-API" cmd /k "cd /d C:\gcc\cevict-app\cevict-monorepo\apps\cevict && pnpm dev"
timeout /t 3 /nobreak >nul

REM --- Start WhereToVacation/PetReunion on port 3002 ---
echo [2/3] Starting WhereToVacation/PetReunion on port 3002...
START "WhereToVacation" cmd /k "cd /d C:\gcc\cevict-app\cevict-monorepo\apps\wheretovacation && pnpm dev"

REM --- Start Gateway on port 3000 (optional) ---
echo [3/3] Starting Gateway on port 3000...
START "Gateway" cmd /k "cd /d C:\gcc\cevict-app\cevict-monorepo\apps\gateway && pnpm dev"

echo.
echo ============================================
echo ALL APPS STARTED
echo ============================================
echo.
echo Forge UI: http://localhost:3001/auspicio/forge
echo PetReunion: http://localhost:3002/petreunion
echo Gateway: http://localhost:3000
echo.
echo Press any key to exit...
pause >nul

