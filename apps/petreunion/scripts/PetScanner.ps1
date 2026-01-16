# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  🐕 PETSCANNER - Centralized Pet Scraping Script                          ║
# ║  Location: C:\cevict-live\apps\petreunion\scripts\PetScanner.ps1          ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

param(
    [string]$Location = "",           # City, State, or Zip Code
    [string]$ApiUrl = "",             # API URL (local or production)
    [string]$Source = "all",          # 'petfinder', 'petharbor', 'populate', 'all'
    [int]$MaxPets = 200,              # Maximum pets to scrape
    [switch]$Production,              # Use production API
    [switch]$Quiet                    # Suppress output
)

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

# Resolve base API URL (prefers env var, then production, then local dev)
$envApiUrl = ($env:PETREUNION_URL -split ";")[0]
if (-not $envApiUrl -or [string]::IsNullOrWhiteSpace($envApiUrl)) {
    $envApiUrl = "https://petreunion.org"
}
$devDefaultUrl = "http://localhost:3007"

if (-not $ApiUrl) { $ApiUrl = $devDefaultUrl }
if ($Production) { $ApiUrl = $envApiUrl }
$ApiUrl = $ApiUrl.TrimEnd("/")

# Parse location into city/state/zip
function Parse-Location {
    param([string]$Loc)
    
    $result = @{
        city = ""
        state = ""
        zipcode = ""
    }
    
    if (-not $Loc) { return $result }
    
    # Check if it's a zip code (5 digits)
    if ($Loc -match '^\d{5}$') {
        $result.zipcode = $Loc
        return $result
    }
    
    # Check if it's "City, State" format
    if ($Loc -match '^(.+),\s*([A-Za-z]{2})$') {
        $result.city = $Matches[1].Trim()
        $result.state = $Matches[2].Trim().ToUpper()
        return $result
    }
    
    # Check if it's just a state abbreviation
    if ($Loc -match '^[A-Za-z]{2}$') {
        $result.state = $Loc.ToUpper()
        return $result
    }
    
    # Assume it's a city name
    $result.city = $Loc
    return $result
}

function Build-RequestBody {
    param(
        [string]$Key,
        [hashtable]$Location,
        [int]$MaxPets
    )

    $stateCode = if ($Location.state) { $Location.state.ToUpper() } else { "" }

    switch ($Key) {
        "petfinder" {
            $pages = [Math]::Max(1, [Math]::Ceiling($MaxPets / 100))
            $body = @{
                state   = ($stateCode ? $stateCode : "US")
                maxPets = $MaxPets
                pages   = $pages
            }
        }
        "petharbor" {
            $body = @{
                state   = ($stateCode ? $stateCode : "AL")
                maxPets = $MaxPets
            }
        }
        "populate" {
            $body = @{
                maxCities          = [Math]::Min(100, [Math]::Max(5, [Math]::Ceiling($MaxPets / 10)))
                startCity          = $Location.city
                startState         = ($stateCode ? $stateCode : $null)
                useCityExpansion   = $true
                delayBetweenCities = 1500
            }
        }
        default { $body = @{} }
    }

    # Remove null/empty values to keep payload clean
    $clean = @{}
    foreach ($k in $body.Keys) {
        if ($null -ne $body[$k] -and $body[$k] -ne "") {
            $clean[$k] = $body[$k]
        }
    }
    return $clean
}

function Extract-Counts {
    param([object]$Response)

    $found = 0
    $saved = 0

    if ($Response -and $Response.summary) {
        if ($Response.summary.petsFound) { $found += [int]$Response.summary.petsFound }
        if ($Response.summary.petsSaved) { $saved += [int]$Response.summary.petsSaved }
    }
    elseif ($Response -and ($Response.petsFound -or $Response.petsSaved)) {
        if ($Response.petsFound) { $found += [int]$Response.petsFound }
        if ($Response.petsSaved) { $saved += [int]$Response.petsSaved }
    }
    elseif ($Response -and ($Response.inserted -or $Response.skipped)) {
        $found += [int]($Response.inserted + $Response.skipped)
        $saved += [int]$Response.inserted
    }

    return @{ found = $found; saved = $saved }
}

# ═══════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════════

if (-not $Quiet) {
    Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  🐕 PETSCANNER - AI-Powered Pet Discovery                     ║" -ForegroundColor Cyan
    Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
}

# Parse location
$locationData = Parse-Location -Loc $Location

# If no location provided, prompt for one
if (-not $Location) {
    Write-Host "[INFO] No location provided." -ForegroundColor Yellow
    Write-Host "   Usage: .\PetScanner.ps1 -Location 'Houston, TX'" -ForegroundColor Gray
    Write-Host "   Usage: .\PetScanner.ps1 -Location '77001'" -ForegroundColor Gray
    Write-Host "   Usage: .\PetScanner.ps1 -Location 'CA'" -ForegroundColor Gray
    Write-Host ""
    
    $Location = Read-Host "Enter location (City, State or Zip)"
    $locationData = Parse-Location -Loc $Location
    
    if (-not $locationData.city -and -not $locationData.state -and -not $locationData.zipcode) {
        Write-Host "[ERROR] Invalid location format. Please use 'City, State' or 'Zip Code'" -ForegroundColor Red
        exit 1
    }
}

$sourceKey = $Source.ToLower()
$validSources = @("petfinder", "petharbor", "populate", "all")
if ($sourceKey -notin $validSources) {
    Write-Host "[ERROR] Invalid source: $Source" -ForegroundColor Red
    Write-Host "   Valid options: petfinder, petharbor, populate, all" -ForegroundColor Yellow
    exit 1
}

if (-not $Quiet) {
    Write-Host "[CONFIG] Scraping Configuration:" -ForegroundColor Yellow
    Write-Host "   API URL:    $ApiUrl" -ForegroundColor Gray
    Write-Host "   Location:   $Location" -ForegroundColor Gray
    if ($locationData.city) { Write-Host "   City:       $($locationData.city)" -ForegroundColor Gray }
    if ($locationData.state) { Write-Host "   State:      $($locationData.state)" -ForegroundColor Gray }
    if ($locationData.zipcode) { Write-Host "   Zip:        $($locationData.zipcode)" -ForegroundColor Gray }
    Write-Host "   Source:     $Source" -ForegroundColor Gray
    Write-Host "   Max Pets:   $MaxPets" -ForegroundColor Gray
    Write-Host ""
}

$endpointConfigs = @{
    petfinder = @{ path = "/api/petreunion/scrape-petfinder" }
    petharbor = @{ path = "/api/petreunion/scrape-petharbor" }
    populate  = @{ path = "/api/petreunion/populate-database" }
}

# Define endpoints to call based on source
switch ($sourceKey) {
    "petfinder" { $endpoints = @("petfinder") }
    "petharbor" { $endpoints = @("petharbor") }
    "populate"  { $endpoints = @("populate") }
    "all"       { $endpoints = @("petfinder", "petharbor", "populate") }
}

$totalPetsFound = 0
$totalPetsSaved = 0
$errors = @()

foreach ($endpointKey in $endpoints) {
    $config = $endpointConfigs[$endpointKey]
    $endpointPath = $config.path
    $scraperUrl = "$ApiUrl$endpointPath"
    
    if (-not $Quiet) {
        Write-Host "[SCRAPER] Calling: $endpointPath" -ForegroundColor Cyan
    }
    
    try {
        $body = Build-RequestBody -Key $endpointKey -Location $locationData -MaxPets $MaxPets
        $jsonBody = $body | ConvertTo-Json -Depth 4
        
        $response = Invoke-RestMethod -Uri $scraperUrl -Method Post -Headers @{
            "Content-Type" = "application/json"
        } -Body $jsonBody -TimeoutSec 180 -ErrorAction Stop
        
        $counts = Extract-Counts -Response $response
        $totalPetsFound += $counts.found
        $totalPetsSaved += $counts.saved
        
        if (-not $Quiet) {
            $foundMsg = if ($counts.found -ne $null) { $counts.found } else { 0 }
            $savedMsg = if ($counts.saved -ne $null) { $counts.saved } else { 0 }
            Write-Host "   ✅ Found: $foundMsg | Saved: $savedMsg" -ForegroundColor Green
        }
        
    } catch {
        $statusCode = $null
        try { $statusCode = $_.Exception.Response.StatusCode.value__ } catch { }
        $errorMsg = $_.Exception.Message
        if ($statusCode) { $errorMsg = "$errorMsg (HTTP $statusCode)" }
        $errors += "[${endpointPath}] $errorMsg"
        if (-not $Quiet) {
            Write-Host "   ❌ Error: $errorMsg" -ForegroundColor Red
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

if (-not $Quiet) {
    Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  📊 SCAN COMPLETE                                              ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Total Pets Found:  $totalPetsFound" -ForegroundColor Cyan
    Write-Host "   Total Pets Saved:  $totalPetsSaved" -ForegroundColor Cyan
    Write-Host "   Endpoints Called:  $($endpoints.Count)" -ForegroundColor Gray
    
    if ($errors.Count -gt 0) {
        Write-Host ""
        Write-Host "   ⚠️ Errors: $($errors.Count)" -ForegroundColor Yellow
        foreach ($err in $errors) {
            Write-Host "      • $err" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "[INFO] View pets at: ${ApiUrl}/petreunion" -ForegroundColor Cyan
    Write-Host "[INFO] Admin dashboard: ${ApiUrl}/admin/pet-manager`n" -ForegroundColor Cyan
}

# Return results for programmatic use
return @{
    petsFound = $totalPetsFound
    petsSaved = $totalPetsSaved
    errors    = $errors
    location  = $locationData
    endpoints = $endpoints
}

