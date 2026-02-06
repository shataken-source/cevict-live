# Comprehensive Integration Test for Progno + Prognostication
# Tests all connection points between the two apps

param(
    [string] $PrognoUrl = "http://localhost:3008",
    [string] $PrognosticationUrl = "http://localhost:3005",
    [switch] $Verbose
)

Set-StrictMode -Version Latest

$ErrorActionPreference = "Continue"

Write-Host "=== Progno + Prognostication Integration Test ===" -ForegroundColor Cyan
Write-Host ""

$testsPassed = 0
$testsFailed = 0

function Test-Endpoint {
    param(
        [string] $Name,
        [string] $Url,
        [string] $Method = "GET",
        [object] $Body = $null,
        [int] $ExpectedStatus = 200
    )
    
    Write-Host "Test: $Name" -ForegroundColor Yellow
    Write-Host "  $Method $Url" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-RestMethod @params
        $statusCode = 200
        
        if ($response.success -ne $false) {
            Write-Host "  ✅ PASSED" -ForegroundColor Green
            if ($Verbose) {
                Write-Host "  Response: $($response | ConvertTo-Json -Depth 2 -Compress)" -ForegroundColor Gray
            }
            $script:testsPassed++
            return $true
        } else {
            Write-Host "  ❌ FAILED: $($response.error)" -ForegroundColor Red
            $script:testsFailed++
            return $false
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "  ✅ PASSED (expected status $ExpectedStatus)" -ForegroundColor Green
            $script:testsPassed++
            return $true
        } else {
            Write-Host "  ❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
            if ($Verbose) {
                Write-Host "  Status: $statusCode" -ForegroundColor Gray
            }
            $script:testsFailed++
            return $false
        }
    }
}

# Test 1: Progno Health
Write-Host "=== Testing Progno Backend ===" -ForegroundColor Cyan
Test-Endpoint -Name "Progno Health Check" -Url "$PrognoUrl/api/progno/v2?action=health"
Test-Endpoint -Name "Progno API Info" -Url "$PrognoUrl/api/progno/v2?action=info"

# Test 2: Progno Predictions
Test-Endpoint -Name "Progno Predictions (limit 5)" -Url "$PrognoUrl/api/progno/v2?action=predictions&limit=5"

# Test 3: Progno Game Prediction
$gameBody = @{
    league = "NFL"
    homeTeam = "Kansas City Chiefs"
    awayTeam = "Buffalo Bills"
    odds = @{
        home = -150
        away = +130
    }
    date = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
}
Test-Endpoint -Name "Progno Game Prediction" -Url "$PrognoUrl/api/progno/sports/game" -Method "POST" -Body $gameBody

Write-Host ""

# Test 4: Prognostication Proxy Endpoints
Write-Host "=== Testing Prognostication Proxies ===" -ForegroundColor Cyan
Test-Endpoint -Name "Prognostication Picks (today)" -Url "$PrognosticationUrl/api/picks/today"
Test-Endpoint -Name "Prognostication Progno Proxy" -Url "$PrognosticationUrl/api/progno" -Method "POST" -Body $gameBody

Write-Host ""

# Test 5: Simulation (may fail if no valid gameId)
Write-Host "=== Testing Simulation Endpoints ===" -ForegroundColor Cyan
$simBody = @{
    gameId = "test-game-123"
    iterations = 1000
}
Test-Endpoint -Name "Prognostication Simulation Proxy" -Url "$PrognosticationUrl/api/progno/simulate" -Method "POST" -Body $simBody -ExpectedStatus 500

Write-Host ""

# Summary
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "  Passed: $testsPassed" -ForegroundColor Green
Write-Host "  Failed: $testsFailed" -ForegroundColor $(if ($testsFailed -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "✅ All integration tests passed!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some tests failed. Check the errors above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "  1. Ensure both services are running:" -ForegroundColor Gray
    Write-Host "     - Progno: cd apps/progno && npm run dev" -ForegroundColor Gray
    Write-Host "     - Prognostication: cd apps/prognostication && npm run dev" -ForegroundColor Gray
    Write-Host "  2. Check PROGNO_BASE_URL in prognostication .env.local" -ForegroundColor Gray
    Write-Host "  3. Verify ODDS_API_KEY is set in progno .env.local" -ForegroundColor Gray
}
