# ============================================================
#  Accu-Solar BMS Bridge Setup Script
#  ECO-Worthy 12V 280Ah LiFePO4 → MQTT → Accu-Solar
#
#  Usage:
#    .\setup-bms-bridge.ps1              # Full setup + scan
#    .\setup-bms-bridge.ps1 -Scan        # Just scan for BLE devices
#    .\setup-bms-bridge.ps1 -Run         # Just run the bridge
#    .\setup-bms-bridge.ps1 -Install     # Just install dependencies
#
#  After scan, set your BMS address:
#    $env:BMS_ADDRESS = "AA:BB:CC:DD:EE:FF"
#    .\setup-bms-bridge.ps1 -Run
# ============================================================

param(
    [switch]$Scan,
    [switch]$Run,
    [switch]$Install,
    [string]$BmsAddress = $env:BMS_ADDRESS,
    [string]$MqttBroker = ($env:MQTT_BROKER ?? "localhost"),
    [string]$MqttPort = ($env:MQTT_PORT ?? "1883")
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BridgeScript = Join-Path $ScriptDir "eco_worthy_bridge.py"

function Write-Header {
    Write-Host ""
    Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  Accu-Solar BMS Bridge" -ForegroundColor Cyan
    Write-Host "  ECO-Worthy 12V 280Ah → MQTT" -ForegroundColor Cyan
    Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

function Test-Python {
    try {
        $ver = python --version 2>&1
        Write-Host "✓ Python found: $ver" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "✗ Python not found. Install from https://python.org" -ForegroundColor Red
        return $false
    }
}

function Install-Deps {
    Write-Host "── Installing Python dependencies..." -ForegroundColor Cyan
    python -m pip install --upgrade pip -q
    python -m pip install bleak paho-mqtt
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dependencies installed." -ForegroundColor Green
    }
    else {
        Write-Host "✗ Install failed. Check Python version (3.8+ required)." -ForegroundColor Red
        exit 1
    }
}

function Test-Mosquitto {
    Write-Host ""
    Write-Host "── Checking Mosquitto MQTT broker..." -ForegroundColor Cyan
    $svc = Get-Service -Name "mosquitto" -ErrorAction SilentlyContinue
    if ($svc) {
        if ($svc.Status -eq "Running") {
            Write-Host "✓ Mosquitto is running on port $MqttPort" -ForegroundColor Green
        }
        else {
            Write-Host "  Mosquitto installed but not running — starting it..." -ForegroundColor Yellow
            Start-Service mosquitto
            Write-Host "✓ Mosquitto started." -ForegroundColor Green
        }
    }
    else {
        Write-Host "  Mosquitto not found." -ForegroundColor Yellow
        Write-Host "  Install options:" -ForegroundColor Yellow
        Write-Host "    winget install mosquitto" -ForegroundColor White
        Write-Host "    OR: https://mosquitto.org/download/" -ForegroundColor White
        Write-Host ""
        $install = Read-Host "  Install Mosquitto now via winget? (y/n)"
        if ($install -eq "y") {
            winget install mosquitto
            Start-Sleep 3
            Start-Service mosquitto -ErrorAction SilentlyContinue
            Write-Host "✓ Mosquitto installed and started." -ForegroundColor Green
        }
        else {
            Write-Host "  Skipping Mosquitto. Make sure your broker is running at ${MqttBroker}:${MqttPort}" -ForegroundColor Yellow
        }
    }
}

function Test-Firewall {
    Write-Host ""
    Write-Host "── Checking Windows Firewall for port $MqttPort..." -ForegroundColor Cyan
    $rule = Get-NetFirewallRule -DisplayName "Mosquitto MQTT" -ErrorAction SilentlyContinue
    if ($rule) {
        Write-Host "✓ Firewall rule exists for MQTT." -ForegroundColor Green
    }
    else {
        Write-Host "  No firewall rule found — adding inbound rule for port $MqttPort..." -ForegroundColor Yellow
        try {
            New-NetFirewallRule -DisplayName "Mosquitto MQTT" `
                -Direction Inbound -Protocol TCP -LocalPort $MqttPort `
                -Action Allow -ErrorAction Stop | Out-Null
            Write-Host "✓ Firewall rule added (port $MqttPort inbound)." -ForegroundColor Green
        }
        catch {
            Write-Host "  Could not add firewall rule automatically. Run as Administrator or add manually." -ForegroundColor Yellow
        }
    }
}

function Invoke-Scan {
    Write-Host ""
    Write-Host "── Scanning for BLE devices (10 seconds)..." -ForegroundColor Cyan
    Write-Host "   Look for: JBD, xiaoxiang, ECO, BMS, or unnamed devices" -ForegroundColor Gray
    Write-Host ""
    python $BridgeScript scan
    Write-Host ""
    Write-Host "── Copy the AA:BB:CC:DD:EE:FF address of your battery BMS." -ForegroundColor Yellow
    Write-Host "   Then run:" -ForegroundColor Yellow
    Write-Host '   $env:BMS_ADDRESS = "AA:BB:CC:DD:EE:FF"' -ForegroundColor White
    Write-Host '   .\setup-bms-bridge.ps1 -Run' -ForegroundColor White
}

function Invoke-Bridge {
    if (-not $BmsAddress) {
        Write-Host "✗ BMS_ADDRESS not set." -ForegroundColor Red
        Write-Host '  Set it first: $env:BMS_ADDRESS = "AA:BB:CC:DD:EE:FF"' -ForegroundColor Yellow
        Write-Host "  Or run scan:  .\setup-bms-bridge.ps1 -Scan" -ForegroundColor Yellow
        exit 1
    }

    Write-Host ""
    Write-Host "── Starting BMS Bridge..." -ForegroundColor Cyan
    Write-Host "   BMS Address : $BmsAddress" -ForegroundColor White
    Write-Host "   MQTT Broker : $MqttBroker : $MqttPort" -ForegroundColor White
    Write-Host "   Poll Interval: 5s" -ForegroundColor White
    Write-Host ""
    Write-Host "   In Accu-Solar → Controls → AmpinVT MQTT" -ForegroundColor Gray
    Write-Host "   Broker: $MqttBroker   Port: $MqttPort" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Press Ctrl+C to stop." -ForegroundColor Gray
    Write-Host ""

    $env:BMS_ADDRESS = $BmsAddress
    $env:MQTT_BROKER = $MqttBroker
    $env:MQTT_PORT = $MqttPort

    python $BridgeScript
}

function Show-AccuSolarInstructions {
    Write-Host ""
    Write-Host "── Accu-Solar Connection" -ForegroundColor Cyan
    Write-Host "   1. Open Accu-Solar at http://localhost:3208" -ForegroundColor White
    Write-Host "   2. Go to Controls tab" -ForegroundColor White
    Write-Host "   3. Select 'AmpinVT MQTT'" -ForegroundColor White
    Write-Host "   4. Broker: $MqttBroker   Port: $MqttPort" -ForegroundColor White
    Write-Host "   5. Click Save" -ForegroundColor White
    Write-Host "   6. Live battery data will appear in all tabs" -ForegroundColor White
    Write-Host ""
}

# ── Main ──────────────────────────────────────────────────────────────────────
Write-Header

if (-not (Test-Python)) { exit 1 }

if ($Install) {
    Install-Deps
    exit 0
}

if ($Scan) {
    Install-Deps
    Invoke-Scan
    exit 0
}

if ($Run) {
    Invoke-Bridge
    exit 0
}

# Full setup (no flags = run everything)
Write-Host "Running full setup..." -ForegroundColor Cyan

Install-Deps
Test-Mosquitto
Test-Firewall

Write-Host ""
Write-Host "── Bridge script: $BridgeScript" -ForegroundColor Cyan

if (-not $BmsAddress) {
    Write-Host ""
    Write-Host "── No BMS address set. Running BLE scan first..." -ForegroundColor Yellow
    Invoke-Scan
}
else {
    Show-AccuSolarInstructions
    $start = Read-Host "Start bridge now? (y/n)"
    if ($start -eq "y") {
        Invoke-Bridge
    }
}
