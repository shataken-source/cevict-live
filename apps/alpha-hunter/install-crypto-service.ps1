# Install Crypto Trainer as Windows Service
# Runs continuously in the background with auto-restart on failure

param(
    [switch]$Uninstall,
    [switch]$Start,
    [switch]$Stop,
    [switch]$Restart,
    [switch]$Status
)

$ServiceName = "AlphaHunterCrypto"
$DisplayName = "Alpha Hunter - Crypto Trainer"
$Description = "AI-powered crypto trading bot with local Ollama analysis"
$WorkingDir = "C:\cevict-live\apps\alpha-hunter"
$NodePath = (Get-Command node).Source
$ScriptPath = "$WorkingDir\src\crypto-trainer.ts"
$TsxPath = (Get-Command tsx -ErrorAction SilentlyContinue).Source

if (!$TsxPath) {
    Write-Host "❌ tsx not found. Installing globally..." -ForegroundColor Red
    npm install -g tsx
    $TsxPath = (Get-Command tsx).Source
}

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (!$isAdmin) {
    Write-Host "❌ This script requires administrator privileges" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Status check
if ($Status) {
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($service) {
        Write-Host "✅ Service Status: $($service.Status)" -ForegroundColor Green
        Write-Host "   Display Name: $($service.DisplayName)"
        Write-Host "   Start Type: $($service.StartType)"
        
        # Check if process is running
        $proc = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*crypto-trainer*" }
        if ($proc) {
            Write-Host "   Process ID: $($proc.Id)"
            Write-Host "   Memory: $([math]::Round($proc.WorkingSet64 / 1MB, 2)) MB"
            Write-Host "   CPU Time: $($proc.CPU.ToString('0.00'))s"
        }
    } else {
        Write-Host "❌ Service not installed" -ForegroundColor Red
    }
    exit 0
}

# Uninstall
if ($Uninstall) {
    Write-Host "🗑️ Uninstalling $DisplayName..." -ForegroundColor Yellow
    
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -eq 'Running') {
            Write-Host "   Stopping service..."
            Stop-Service -Name $ServiceName -Force
            Start-Sleep -Seconds 2
        }
        
        Write-Host "   Removing service..."
        sc.exe delete $ServiceName
        Write-Host "✅ Service uninstalled" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Service not found" -ForegroundColor Yellow
    }
    exit 0
}

# Stop
if ($Stop) {
    Write-Host "⏸️ Stopping $DisplayName..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Service stopped" -ForegroundColor Green
    exit 0
}

# Start
if ($Start) {
    Write-Host "▶️ Starting $DisplayName..." -ForegroundColor Yellow
    Start-Service -Name $ServiceName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    $service = Get-Service -Name $ServiceName
    if ($service.Status -eq 'Running') {
        Write-Host "✅ Service started" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to start service" -ForegroundColor Red
    }
    exit 0
}

# Restart
if ($Restart) {
    Write-Host "🔄 Restarting $DisplayName..." -ForegroundColor Yellow
    Restart-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    Write-Host "✅ Service restarted" -ForegroundColor Green
    exit 0
}

# Install (default action)
Write-Host "📦 Installing $DisplayName as Windows Service..." -ForegroundColor Cyan
Write-Host ""

# Check if service already exists
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "⚠️ Service already exists. Uninstalling first..." -ForegroundColor Yellow
    if ($existingService.Status -eq 'Running') {
        Stop-Service -Name $ServiceName -Force
    }
    sc.exe delete $ServiceName
    Start-Sleep -Seconds 2
}

# Create wrapper script for the service
$wrapperScript = @"
const { spawn } = require('child_process');
const path = require('path');

const workingDir = '$WorkingDir';
const scriptPath = '$ScriptPath';

console.log('🤖 Alpha Hunter Crypto Trainer Service Starting...');
console.log('   Working Directory:', workingDir);
console.log('   Script:', scriptPath);

function startTrainer() {
    const proc = spawn('$TsxPath', [scriptPath], {
        cwd: workingDir,
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
    });

    proc.on('error', (err) => {
        console.error('❌ Failed to start:', err);
        setTimeout(startTrainer, 10000); // Retry in 10s
    });

    proc.on('exit', (code) => {
        console.log('⚠️ Process exited with code:', code);
        console.log('🔄 Restarting in 10 seconds...');
        setTimeout(startTrainer, 10000); // Auto-restart
    });
}

startTrainer();
"@

$wrapperPath = "$WorkingDir\crypto-service-wrapper.js"
$wrapperScript | Out-File -FilePath $wrapperPath -Encoding UTF8

Write-Host "✅ Created service wrapper: $wrapperPath" -ForegroundColor Green

# Install using nssm (Node.js Service Manager) or sc.exe
# For simplicity, we'll use node-windows package approach
Write-Host "📦 Installing service..." -ForegroundColor Cyan

# Create the service using sc.exe
$binPath = "`"$NodePath`" `"$wrapperPath`""
sc.exe create $ServiceName binPath= $binPath start= auto DisplayName= $DisplayName

if ($LASTEXITCODE -eq 0) {
    sc.exe description $ServiceName $Description
    sc.exe failure $ServiceName reset= 86400 actions= restart/10000/restart/30000/restart/60000
    
    Write-Host "✅ Service installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Service Details:" -ForegroundColor Cyan
    Write-Host "   Name: $ServiceName"
    Write-Host "   Display: $DisplayName"
    Write-Host "   Auto-start: Yes"
    Write-Host "   Auto-restart on failure: Yes"
    Write-Host ""
    Write-Host "🎮 Management Commands:" -ForegroundColor Cyan
    Write-Host "   Start:   .\install-crypto-service.ps1 -Start"
    Write-Host "   Stop:    .\install-crypto-service.ps1 -Stop"
    Write-Host "   Restart: .\install-crypto-service.ps1 -Restart"
    Write-Host "   Status:  .\install-crypto-service.ps1 -Status"
    Write-Host "   Remove:  .\install-crypto-service.ps1 -Uninstall"
    Write-Host ""
    
    # Ask to start now
    $start = Read-Host "Start service now? (Y/n)"
    if ($start -ne 'n' -and $start -ne 'N') {
        Start-Service -Name $ServiceName
        Start-Sleep -Seconds 3
        $service = Get-Service -Name $ServiceName
        if ($service.Status -eq 'Running') {
            Write-Host "✅ Service is running!" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Service installed but not running. Check logs." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ Failed to install service" -ForegroundColor Red
    exit 1
}
