# PROGNO Data Massager - PowerShell Launcher
# Run with: .\launch_massager.ps1

$Host.UI.RawUI.WindowTitle = "PROGNO Data Massager"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   PROGNO Data Massager Starting..." -ForegroundColor Green
Write-Host "   Powered by Cevict Flex" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check/Install dependencies
$streamlitCheck = python -c "import streamlit" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

Write-Host ""
Write-Host "Starting PROGNO Massager..." -ForegroundColor Green
Write-Host "Open your browser to: http://localhost:8501" -ForegroundColor Cyan
Write-Host ""

# Run Streamlit
streamlit run app.py --server.port 8501

Read-Host "Press Enter to exit"

