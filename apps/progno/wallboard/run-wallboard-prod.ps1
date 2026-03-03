Param(
    [string]$PrognoBaseUrl = "https://cevict-monorepo-progno-one.vercel.app"
)

Write-Host "=== CEVICT Wallboard - LIVE PROD MODE ===" -ForegroundColor Cyan
Write-Host "Using Progno base URL:" $PrognoBaseUrl -ForegroundColor Yellow

# Always run from this script's directory
Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Path)

# Point wallboard at production Progno (read-only)
$env:PROGNO_BASE_URL = $PrognoBaseUrl
$env:NODE_ENV = "production"

Write-Host "`nPROGNO_BASE_URL set. Starting wallboard on http://localhost:3434 ..." -ForegroundColor Green
Write-Host "NOTE: This does NOT start local Progno or write anything to production." -ForegroundColor DarkGray

Write-Host "`nIf this is your first time running wallboard, open a separate PowerShell and run:" -ForegroundColor DarkGray
Write-Host "  cd C:\cevict-live\apps\progno\wallboard" -ForegroundColor DarkGray
Write-Host "  npm install" -ForegroundColor DarkGray

Write-Host "`nLaunching server (Ctrl+C to stop)..." -ForegroundColor Cyan
npm start

