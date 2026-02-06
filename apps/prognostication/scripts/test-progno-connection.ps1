# Test Progno Connection Script
# Tests the connection between Prognostication and Progno

param(
    [string] $PrognoUrl = "http://localhost:3008",
    [switch] $Verbose
)

Set-StrictMode -Version Latest

Write-Host "=== Testing Progno Connection ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $healthUrl = "$PrognoUrl/api/progno/v2?action=health"
    Write-Host "  GET $healthUrl" -ForegroundColor Gray
    $healthResponse = Invoke-RestMethod -Uri $healthUrl -Method Get -ErrorAction Stop
    if ($healthResponse.success) {
        Write-Host "  ✅ Health check passed" -ForegroundColor Green
        if ($Verbose) {
            Write-Host "  Status: $($healthResponse.data.status)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ❌ Health check failed: $($healthResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: API Info
Write-Host "Test 2: API Info" -ForegroundColor Yellow
try {
    $infoUrl = "$PrognoUrl/api/progno/v2?action=info"
    Write-Host "  GET $infoUrl" -ForegroundColor Gray
    $infoResponse = Invoke-RestMethod -Uri $infoUrl -Method Get -ErrorAction Stop
    if ($infoResponse.success) {
        Write-Host "  ✅ API info retrieved" -ForegroundColor Green
        if ($Verbose) {
            Write-Host "  Version: $($infoResponse.data.version)" -ForegroundColor Gray
            Write-Host "  Name: $($infoResponse.data.name)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ❌ API info failed: $($infoResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ API info failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Predictions Endpoint
Write-Host "Test 3: Predictions Endpoint" -ForegroundColor Yellow
try {
    $predictionsUrl = "$PrognoUrl/api/progno/v2?action=predictions&limit=5"
    Write-Host "  GET $predictionsUrl" -ForegroundColor Gray
    $predictionsResponse = Invoke-RestMethod -Uri $predictionsUrl -Method Get -ErrorAction Stop
    if ($predictionsResponse.success) {
        $count = $predictionsResponse.data.Count
        Write-Host "  ✅ Predictions retrieved: $count predictions" -ForegroundColor Green
        if ($Verbose -and $count -gt 0) {
            $first = $predictionsResponse.data[0]
            Write-Host "  First prediction: $($first.homeTeam) vs $($first.awayTeam)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ❌ Predictions failed: $($predictionsResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Predictions failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Sports Game Endpoint (used by prognostication)
Write-Host "Test 4: Sports Game Endpoint" -ForegroundColor Yellow
try {
    $gameUrl = "$PrognoUrl/api/progno/sports/game"
    $gameBody = @{
        league = "NFL"
        homeTeam = "Kansas City Chiefs"
        awayTeam = "Buffalo Bills"
        odds = @{
            home = -150
            away = +130
        }
        date = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
    } | ConvertTo-Json -Depth 10
    
    Write-Host "  POST $gameUrl" -ForegroundColor Gray
    $gameResponse = Invoke-RestMethod -Uri $gameUrl -Method Post -Body $gameBody -ContentType "application/json" -ErrorAction Stop
    if ($gameResponse.success) {
        Write-Host "  ✅ Game prediction generated" -ForegroundColor Green
        if ($Verbose) {
            Write-Host "  Predicted winner: $($gameResponse.prediction.predictedWinner)" -ForegroundColor Gray
            Write-Host "  Confidence: $([math]::Round($gameResponse.prediction.confidence * 100, 1))%" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ❌ Game prediction failed: $($gameResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Game prediction failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 5: Simulation Endpoint (used by prognostication)
Write-Host "Test 5: Simulation Endpoint" -ForegroundColor Yellow
try {
    $simUrl = "$PrognoUrl/api/progno/v2?action=simulate"
    $simBody = @{
        gameId = "test-game-123"
        iterations = 1000
    } | ConvertTo-Json
    
    Write-Host "  POST $simUrl" -ForegroundColor Gray
    $simResponse = Invoke-RestMethod -Uri $simUrl -Method Post -Body $simBody -ContentType "application/json" -ErrorAction Stop
    if ($simResponse.success) {
        Write-Host "  ✅ Simulation completed" -ForegroundColor Green
        if ($Verbose) {
            Write-Host "  Seed: $($simResponse.data.seed)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ⚠️  Simulation returned error (may be expected for test game): $($simResponse.error)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Simulation failed (may be expected): $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test from Prognostication side:" -ForegroundColor Yellow
Write-Host "  1. Set PROGNO_BASE_URL=$PrognoUrl in prognostication .env.local" -ForegroundColor Gray
Write-Host "  2. Start prognostication: cd apps/prognostication && npm run dev" -ForegroundColor Gray
Write-Host "  3. Visit http://localhost:3005/picks" -ForegroundColor Gray
