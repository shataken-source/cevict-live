# ==============================================================================
# WINDOWS SERVICE INSTALLER FOR ALPHA-HUNTER 24/7 BOT
# ==============================================================================
# This script installs the bot as a Windows service that:
# - Runs 24/7 in the background
# - Auto-restarts on failure
# - Starts on system boot
# - Continues running when laptop is closed
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "     INSTALLING ALPHA-HUNTER AS WINDOWS SERVICE" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$botDir = $scriptDir

# Service name
$serviceName = "AlphaHunter247"

# Check if NSSM is installed
$nssmPath = "$env:ProgramFiles\nssm\nssm.exe"
if (-not (Test-Path $nssmPath)) {
    Write-Host "Installing NSSM (Non-Sucking Service Manager)..." -ForegroundColor Yellow
    
    # Download NSSM
    $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
    $nssmZip = "$env:TEMP\nssm.zip"
    $nssmExtract = "$env:TEMP\nssm"
    
    try {
        Write-Host "   Downloading NSSM..." -ForegroundColor Gray
        Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZip -UseBasicParsing
        
        Write-Host "   Extracting NSSM..." -ForegroundColor Gray
        Expand-Archive -Path $nssmZip -DestinationPath $nssmExtract -Force
        
        # Copy to Program Files
        $nssmDir = "$env:ProgramFiles\nssm"
        New-Item -ItemType Directory -Path $nssmDir -Force | Out-Null
        Copy-Item "$nssmExtract\nssm-2.24\win64\nssm.exe" -Destination $nssmPath -Force
        
        Write-Host "   NSSM installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "   Failed to install NSSM: $_" -ForegroundColor Red
        Write-Host "   Please download manually from https://nssm.cc/download" -ForegroundColor Yellow
        exit 1
    }
}

# Check if service already exists
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Service '$serviceName' already exists" -ForegroundColor Yellow
    $response = Read-Host "   Remove existing service? (y/n)"
    if ($response -eq 'y') {
        Write-Host "   Stopping and removing existing service..." -ForegroundColor Gray
        Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
        & $nssmPath remove $serviceName confirm
        Start-Sleep -Seconds 2
    } else {
        Write-Host "   Keeping existing service. Exiting." -ForegroundColor Yellow
        exit 0
    }
}

# Find Node.js
$nodePath = Get-Command node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $nodePath) {
    Write-Host "ERROR: Node.js not found in PATH!" -ForegroundColor Red
    Write-Host "   Please install Node.js from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found Node.js: $nodePath" -ForegroundColor Green

# Find npm
$npmPath = Get-Command npm -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $npmPath) {
    Write-Host "ERROR: npm not found in PATH!" -ForegroundColor Red
    exit 1
}

# Verify .env.local exists
$envFile = Join-Path $projectRoot ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "WARNING: .env.local not found at $envFile" -ForegroundColor Yellow
    Write-Host "   The service will start but may not have API keys configured" -ForegroundColor Yellow
}

# Find npx (used to run tsx)
$npxPath = Get-Command npx -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $npxPath) {
    Write-Host "ERROR: npx not found!" -ForegroundColor Red
    Write-Host "   npm run 24-7 requires npx/tsx" -ForegroundColor Yellow
    exit 1
}

# Install service
Write-Host ""
Write-Host "Installing Windows Service..." -ForegroundColor Yellow

# Install service - use npx tsx to run the script (same as npm run 24-7)
$tsxScript = Join-Path $botDir "src\live-trader-24-7.ts"
$tsxArgs = "tsx `"$tsxScript`""
& $nssmPath install $serviceName "$npxPath" $tsxArgs

# Configure service
Write-Host "   Configuring service settings..." -ForegroundColor Gray

# Set working directory
& $nssmPath set $serviceName AppDirectory "$botDir"

# Set description
& $nssmPath set $serviceName Description "Alpha-Hunter 24/7 Trading Bot - Autonomous profit-hunting AI agent"

# Auto-restart on failure
& $nssmPath set $serviceName AppRestartDelay 5000
& $nssmPath set $serviceName AppExit Default Restart
& $nssmPath set $serviceName AppRestartDelay 10000

# Set output files
$logDir = Join-Path $botDir "logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
& $nssmPath set $serviceName AppStdout "$logDir\service-output.log"
& $nssmPath set $serviceName AppStderr "$logDir\service-error.log"

# Set environment variables
& $nssmPath set $serviceName AppEnvironmentExtra "NODE_ENV=production"

# Set startup type to Automatic
& $nssmPath set $serviceName Start SERVICE_AUTO_START

# Set service to run even when user is logged out
& $nssmPath set $serviceName ObjectName "LocalSystem"

Write-Host "   Service configured" -ForegroundColor Green

# Start service
Write-Host ""
Write-Host "Starting service..." -ForegroundColor Yellow
Start-Service -Name $serviceName

# Wait a moment
Start-Sleep -Seconds 3

# Check status
$service = Get-Service -Name $serviceName
if ($service.Status -eq 'Running') {
    Write-Host ""
    Write-Host "SERVICE INSTALLED AND RUNNING!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service Details:" -ForegroundColor Cyan
    Write-Host "   Name: $serviceName" -ForegroundColor White
    Write-Host "   Status: $($service.Status)" -ForegroundColor White
    Write-Host "   Logs: $logDir\service-output.log" -ForegroundColor White
    Write-Host "   Errors: $logDir\service-error.log" -ForegroundColor White
    Write-Host ""
    Write-Host "Management Commands:" -ForegroundColor Cyan
    Write-Host "   Stop:   Stop-Service -Name $serviceName" -ForegroundColor Gray
    Write-Host "   Start:  Start-Service -Name $serviceName" -ForegroundColor Gray
    Write-Host "   Status: Get-Service -Name $serviceName" -ForegroundColor Gray
    Write-Host "   Remove: nssm remove $serviceName confirm" -ForegroundColor Gray
    Write-Host ""
    Write-Host "The bot will now:" -ForegroundColor Green
    Write-Host "   - Run 24/7 in the background" -ForegroundColor White
    Write-Host "   - Auto-restart on failure" -ForegroundColor White
    Write-Host "   - Start automatically on boot" -ForegroundColor White
    Write-Host "   - Continue running when laptop is closed" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Service installed but not running. Status: $($service.Status)" -ForegroundColor Yellow
    Write-Host "   Check logs at: $logDir\service-error.log" -ForegroundColor Yellow
}

Write-Host ""
