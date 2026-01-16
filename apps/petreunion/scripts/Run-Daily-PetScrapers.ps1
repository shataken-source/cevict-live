param(
    [string]$ApiUrl = "http://localhost:3007",
    [string[]]$States = @("AL"),
    [int]$RadiusMiles = 50,
    [int]$MaxResults = 30
)

$ErrorActionPreference = "Stop"

function Invoke-Json {
    param(
        [string]$Url,
        [hashtable]$Body,
        [int]$TimeoutSec = 180
    )
    $json = $Body | ConvertTo-Json -Depth 6
    return Invoke-RestMethod -Uri $Url -Method Post -Headers @{ "Content-Type" = "application/json" } -Body $json -TimeoutSec $TimeoutSec
}

Write-Host "=== Daily Pet Scrapers + Matcher ===" -ForegroundColor Cyan
Write-Host "API: $ApiUrl"
Write-Host "States: $($States -join ', ')" 
Write-Host ""

# 1) PawBoost (live)
try {
    $pbBody = @{
        state = ($States[0])
        radiusMiles = $RadiusMiles
        maxPets = $MaxResults
        mode = "live"
        saveToDatabase = $true
    }
    $pbRes = Invoke-Json -Url "$ApiUrl/api/petreunion/scrape-pawboost" -Body $pbBody
    Write-Host "[PawBoost] Pets found: $($pbRes.summary.petsFound) | Saved: $($pbRes.summary.petsSaved)" -ForegroundColor Green
} catch {
    Write-Host "[PawBoost] ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 2) Social media (simulated IG/TikTok; Facebook is off)
try {
    $smBody = @{
        platforms = @("instagram","tiktok")
        location = ($States[0])
        maxResults = $MaxResults
        saveToDatabase = $true
    }
    $smRes = Invoke-Json -Url "$ApiUrl/api/petreunion/scrape-social-media" -Body $smBody
    Write-Host "[Social] Pets found: $($smRes.summary.petsFound) | Saved: $($smRes.summary.petsSaved)" -ForegroundColor Green
} catch {
    Write-Host "[Social] ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 3) Matcher (found vs lost)
try {
    $mRes = Invoke-RestMethod -Uri "$ApiUrl/api/petreunion/run-matcher" -Method Post -Headers @{ "Content-Type" = "application/json" } -TimeoutSec 180
    Write-Host "[Matcher] Candidates: $($mRes.summary.candidates) | Returned: $($mRes.summary.topReturned)" -ForegroundColor Green
} catch {
    Write-Host "[Matcher] ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
