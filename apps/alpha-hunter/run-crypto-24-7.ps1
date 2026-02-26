# Alpha Hunter — 24/7 Coinbase Crypto Trader Launcher
# Auto-restarts on crash with exponential backoff
# Usage: powershell -ExecutionPolicy Bypass -File run-crypto-24-7.ps1

$ErrorActionPreference = "Continue"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$logDir = Join-Path $scriptDir "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

$restartCount = 0
$maxBackoff = 300  # Max 5 minutes between restarts
$baseBackoff = 5   # Start with 5 seconds

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ALPHA HUNTER - 24/7 CRYPTO TRADER" -ForegroundColor Cyan
Write-Host "  Auto-restart enabled" -ForegroundColor Cyan
Write-Host "  Logs: $logDir" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $logFile = Join-Path $logDir "crypto-trader-$timestamp.log"
    
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Starting crypto trader (restart #$restartCount)..." -ForegroundColor Green
    
    # Run the trader, tee output to both console and log file
    npx tsx src/crypto-trainer.ts 2>&1 | Tee-Object -FilePath $logFile
    
    $exitCode = $LASTEXITCODE
    Write-Host ""
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Trader exited with code $exitCode" -ForegroundColor Yellow
    
    # If clean exit (Ctrl+C / SIGINT), don't restart
    if ($exitCode -eq 0) {
        Write-Host "Clean shutdown. Not restarting." -ForegroundColor Cyan
        break
    }
    
    $restartCount++
    
    # Exponential backoff: 5s, 10s, 20s, 40s, 80s, 160s, 300s (cap)
    $backoff = [Math]::Min($baseBackoff * [Math]::Pow(2, [Math]::Min($restartCount - 1, 6)), $maxBackoff)
    
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Restarting in $backoff seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds $backoff
    
    # Reset backoff after 10 minutes of successful running
    # (tracked by comparing restart times)
}

Write-Host "Launcher stopped." -ForegroundColor Red
