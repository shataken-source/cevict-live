# Quick Test Script - Tests both apps if running
# Run this after starting both services

param(
    [switch] $StartServices = $false
)

Set-StrictMode -Version Latest

Write-Host "=== Quick Integration Test ===" -ForegroundColor Cyan
Write-Host ""

# Check if services are running
$prognoRunning = Test-NetConnection -ComputerName localhost -Port 3008 -InformationLevel Quiet -WarningAction SilentlyContinue
$prognosticationRunning = Test-NetConnection -ComputerName localhost -Port 3005 -InformationLevel Quiet -WarningAction SilentlyContinue

if (-not $prognoRunning) {
    Write-Host "❌ Progno is not running on port 3008" -ForegroundColor Red
    Write-Host "   Start it with: cd apps\progno && npm run dev" -ForegroundColor Yellow
    Write-Host ""
}

if (-not $prognosticationRunning) {
    Write-Host "❌ Prognostication is not running on port 3005" -ForegroundColor Red
    Write-Host "   Start it with: cd apps\prognostication && npm run dev" -ForegroundColor Yellow
    Write-Host ""
}

if (-not $prognoRunning -or -not $prognosticationRunning) {
    Write-Host "⚠️  Cannot run tests - services not running" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To start both services:" -ForegroundColor Cyan
    Write-Host "  Terminal 1: cd apps\progno && npm run dev" -ForegroundColor White
    Write-Host "  Terminal 2: cd apps\prognostication && npm run dev" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Both services are running" -ForegroundColor Green
Write-Host ""

# Test 1: Progno Health
Write-Host "Test 1: Progno Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3008/api/progno/v2?action=health" -Method Get -ErrorAction Stop
    if ($response.success) {
        Write-Host "  ✅ PASSED - Progno is healthy" -ForegroundColor Green
    } else {
        Write-Host "  ❌ FAILED - Progno returned error" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Prognostication Picks
Write-Host "Test 2: Prognostication Picks Endpoint" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3005/api/picks/today" -Method Get -ErrorAction Stop
    if ($response.success) {
        Write-Host "  ✅ PASSED - Picks endpoint working" -ForegroundColor Green
        Write-Host "  Source: $($response.source)" -ForegroundColor Gray
        Write-Host "  Total picks: $($response.total)" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ FAILED - Picks endpoint returned error" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Integration (Prognostication → Progno)
Write-Host "Test 3: Integration Test (Prognostication calling Progno)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3005/api/picks/today" -Method Get -ErrorAction Stop
    if ($response.source -eq 'progno') {
        Write-Host "  ✅ PASSED - Prognostication successfully connected to Progno" -ForegroundColor Green
        Write-Host "  Picks received: $($response.total)" -ForegroundColor Gray
    } elseif ($response.source -eq 'unavailable') {
        Write-Host "  ⚠️  WARNING - Progno connection not configured or unavailable" -ForegroundColor Yellow
        Write-Host "  Check PROGNO_BASE_URL in prognostication .env.local" -ForegroundColor Gray
    } else {
        Write-Host "  ⚠️  WARNING - Using fallback source: $($response.source)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "For detailed tests, run:" -ForegroundColor Yellow
Write-Host "  .\scripts\test-integration.ps1 -Verbose" -ForegroundColor White
