@echo off
TITLE PROGNO DATA MASSAGER
echo ========================================
echo    PROGNO Data Massager Starting...
echo    Powered by Cevict Flex
echo ========================================
echo.

cd /d "%~dp0"

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if streamlit is installed
python -c "import streamlit" >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
)

echo.
echo Starting PROGNO Massager on http://localhost:8501
echo.
streamlit run app.py --server.port 8501 --server.headless true

pause

