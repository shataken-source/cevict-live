param(
    [string[]]$States = @("AL"),
    [switch]$Facebook,
    [switch]$Instagram,
    [switch]$TikTok,
    [switch]$PawBoost,
    [switch]$All,
    [switch]$AllStates,
    [int]$PetsPerShelter = 5,
    [int]$MaxResults = 30,
    [int]$RadiusMiles = 50,
    [string]$ApiUrl = "http://localhost:3007"
)

$ErrorActionPreference = "Stop"

if ($All) {
    $Facebook = $true
    $Instagram = $true
    $TikTok = $true
    $PawBoost = $true
}

if ($AllStates) {
    $States = @("AL","TX","CA","FL","NY","GA")
}

# Default to Facebook + PawBoost if none specified
if (-not ($Facebook -or $Instagram -or $TikTok -or $PawBoost)) {
    $Facebook = $true
    $PawBoost = $true
}

function Invoke-Json {
    param(
        [string]$Url,
        [hashtable]$Body,
        [int]$TimeoutSec = 120
    )
    $json = $Body | ConvertTo-Json -Depth 6
    return Invoke-RestMethod -Uri $Url -Method Post -Headers @{ "Content-Type" = "application/json" } -Body $json -TimeoutSec $TimeoutSec
}

Write-Host "=== PetReunion Social Media Scraper ===" -ForegroundColor Cyan
Write-Host "API: $ApiUrl"
Write-Host "States: $($States -join ', ')" 
Write-Host "Platforms: $(@($Facebook ? 'facebook' : $null, $Instagram ? 'instagram' : $null, $TikTok ? 'tiktok' : $null, $PawBoost ? 'pawboost' : $null) -ne $null -join ', ')" 
Write-Host ""

$results = @()

if ($Facebook) {
    Write-Host "[FACEBOOK] Scraping shelters..." -ForegroundColor Cyan
    $body = @{
        states = $States
        petsPerShelter = $PetsPerShelter
        mode = "simulate"   # switch to "api" with accessToken to hit Graph
        saveToDatabase = $true
    }
    try {
        $res = Invoke-Json -Url "$ApiUrl/api/petreunion/scrape-facebook-shelters" -Body $body -TimeoutSec 180
        $results += @{ platform = "facebook-shelters"; result = $res }
        Write-Host "  => Shelters processed: $($res.summary.sheltersProcessed) | Pets found: $($res.summary.petsFound) | Saved: $($res.summary.petsSaved)" -ForegroundColor Green
        if ($res.errors -and $res.errors.Count -gt 0) {
            Write-Host "  Errors:" -ForegroundColor Yellow
            $res.errors | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
        }
    } catch {
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "[MULTI] Scraping social media (simulated IG/TikTok)..." -ForegroundColor Cyan
$platforms = @()
if ($Facebook) { $platforms += "facebook" }
if ($Instagram) { $platforms += "instagram" }
if ($TikTok) { $platforms += "tiktok" }
$bodyMulti = @{
    platforms = $platforms
    location = ($States[0])
    maxResults = $MaxResults
    saveToDatabase = $true
}
try {
    $res = Invoke-Json -Url "$ApiUrl/api/petreunion/scrape-social-media" -Body $bodyMulti -TimeoutSec 180
    $results += @{ platform = "multi"; result = $res }
    Write-Host "  => Platforms: $($res.summary.platforms -join ', ') | Pets found: $($res.summary.petsFound) | Saved: $($res.summary.petsSaved)" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

if ($PawBoost) {
    Write-Host "[PAWBOOST] Scraping PawBoost..." -ForegroundColor Cyan
    $bodyPb = @{
        postalCode = $null
        state = ($States[0])
        radiusMiles = $RadiusMiles
        maxPets = $MaxResults
        saveToDatabase = $true
    }
    try {
        $res = Invoke-Json -Url "$ApiUrl/api/petreunion/scrape-pawboost" -Body $bodyPb -TimeoutSec 180
        $results += @{ platform = "pawboost"; result = $res }
        Write-Host "  => PawBoost: Pets found: $($res.summary.petsFound) | Saved: $($res.summary.petsSaved)" -ForegroundColor Green
        if ($res.summary.duplicatesSkipped -gt 0) {
            Write-Host "  => Duplicates skipped: $($res.summary.duplicatesSkipped)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
return $results
