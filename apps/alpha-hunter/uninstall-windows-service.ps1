# ==============================================================================
# UNINSTALL WINDOWS SERVICE FOR ALPHA-HUNTER
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🗑️  UNINSTALLING ALPHA-HUNTER WINDOWS SERVICE          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: This script must be run as Administrator!" -ForegroundColor Red
    exit 1
}

$serviceName = "AlphaHunter247"
$nssmPath = "$env:ProgramFiles\nssm\nssm.exe"

# Check if service exists
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Host "ℹ️  Service '$serviceName' not found. Nothing to remove." -ForegroundColor Yellow
    exit 0
}

Write-Host "⚠️  This will stop and remove the service '$serviceName'" -ForegroundColor Yellow
$response = Read-Host "   Continue? (y/n)"
if ($response -ne 'y') {
    Write-Host "   Cancelled." -ForegroundColor Gray
    exit 0
}

# Stop service
Write-Host "`n🛑 Stopping service..." -ForegroundColor Yellow
Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Remove service
Write-Host "🗑️  Removing service..." -ForegroundColor Yellow
if (Test-Path $nssmPath) {
    & $nssmPath remove $serviceName confirm
} else {
    sc.exe delete $serviceName
}

Start-Sleep -Seconds 2

# Verify removal
$checkService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if (-not $checkService) {
    Write-Host "`n✅ Service removed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Service may still exist. Try manually removing it." -ForegroundColor Yellow
}

Write-Host "`n"

