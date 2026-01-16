# PetReunion Daily Scraper Runner - Production-Hardened
# This script calls the PetReunion scraper API endpoint with production safeguards

$ErrorActionPreference = "Stop" # Changed to Stop for better Catch block behavior
$LogDir = Join-Path $PSScriptRoot "logs"
$LogFile = Join-Path $LogDir "scraper-$(Get-Date -Format 'yyyy-MM-dd').log"

# === 1. LOG HOUSEKEEPING ===
# Clean up logs older than 14 days to prevent disk space issues
if (-not (Test-Path $LogDir)) { 
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null 
}
Get-ChildItem $LogDir -Filter "scraper-*.log" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-14) } | 
    Remove-Item -ErrorAction SilentlyContinue

function Write-Log {
    param(
        [string]$Message, 
        [string]$Level = "INFO"
    )
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $LogMessage
    
    $Color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN"  { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    Write-Host $LogMessage -ForegroundColor $Color
}

Write-Log "Starting PetReunion daily scraper..." "INFO"

# === 2. URL SANITIZATION ===
# Prevent double-slash errors (https://example.com//api)
$PetReunionUrl = ($env:PETREUNION_URL -split ";")[0] # Safety: take first if multi-set
if (-not $PetReunionUrl) { 
    $PetReunionUrl = "https://petreunion.org" 
}
$PetReunionUrl = $PetReunionUrl.TrimEnd('/') # Critical: prevent //api double-slash

Write-Log "Using PetReunion URL: $PetReunionUrl" "INFO"

# === 3. TIMEOUT PROTECTION ===
# Added -TimeoutSec to prevent hanging processes
function Invoke-Scraper {
    param([string]$BaseUrl)
    
    # 5-minute timeout prevents ghost processes
    return Invoke-RestMethod `
        -Uri "$BaseUrl/api/petreunion/populate-database" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -TimeoutSec 300 `
        -Body (@{
            maxCities = 30
            delayBetweenCities = 5000
        } | ConvertTo-Json)
}

function Run-Scraper {
    param([string]$UrlToUse)
    
    try {
        $CleanUrl = $UrlToUse.TrimEnd('/')
        $response = Invoke-Scraper -BaseUrl $CleanUrl
        
        if ($response.success) {
            Write-Log "✅ Scraper completed successfully" "SUCCESS"
            if ($response.stats) {
                Write-Log "   Stats: $($response.stats | ConvertTo-Json -Compress)" "INFO"
            }
            
            # === OPTIONAL: LOG TO SUPABASE ===
            # Uncomment to track scraper runs alongside Alpha-Hunter trades
            # Log-ToSupabase -Status "success" -Stats $response.stats
            
            return $true
        }
        else {
            Write-Log "⚠️ Scraper returned: $($response.error)" "WARN"
            
            if ($response.error -like "*not yet implemented*") {
                Write-Log "   Note: Scraper logic is not yet implemented. This is expected." "INFO"
                Write-Log "   The automation is ready - scraper will run once implemented." "INFO"
            }
            return $false
        }
    }
    catch {
        $statusCode = $null
        try {
            $statusCode = $_.Exception.Response.StatusCode.value__
        }
        catch { }
        
        if ($statusCode -eq 501) {
            Write-Log "⚠️ 501 Not Implemented: Scraper logic is ready but not yet active on server." "WARN"
            return $false
        }
        elseif ($statusCode -eq 408 -or $_.Exception.Message -like "*timeout*") {
            Write-Log "❌ Scraper timed out after 5 minutes. Check server performance." "ERROR"
            return $false
        }
        else {
            Write-Log "❌ Scraper failed: $($_.Exception.Message)" "ERROR"
            if ($statusCode) {
                Write-Log "   Status Code: $statusCode" "ERROR"
            }
            return $false
        }
    }
}

# === OPTIONAL: SUPABASE LOGGING ===
# Logs scraper runs to the same Supabase instance as Alpha-Hunter
function Log-ToSupabase {
    param(
        [string]$Status,
        [object]$Stats
    )
    
    if (-not $env:SUPABASE_SERVICE_ROLE_KEY -or -not $env:NEXT_PUBLIC_SUPABASE_URL) {
        return # Skip if Supabase not configured
    }
    
    try {
        $body = @{
            timestamp = (Get-Date).ToString("o")
            service = "petreunion-scraper"
            status = $Status
            stats = $Stats
            host = $env:COMPUTERNAME
        } | ConvertTo-Json
        
        $supabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL.TrimEnd('/')
        Invoke-RestMethod `
            -Uri "$supabaseUrl/rest/v1/scraper_logs" `
            -Method POST `
            -Headers @{
                "apikey" = $env:SUPABASE_SERVICE_ROLE_KEY
                "Authorization" = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
                "Content-Type" = "application/json"
                "Prefer" = "return=minimal"
            } `
            -Body $body `
            -TimeoutSec 10 | Out-Null
        
        Write-Log "   📊 Logged to Supabase" "INFO"
    }
    catch {
        Write-Log "   ⚠️ Failed to log to Supabase (non-critical): $($_.Exception.Message)" "WARN"
    }
}

# === EXECUTION LOGIC ===
$ok = Run-Scraper -UrlToUse $PetReunionUrl

# Fallback to local if primary fails and LOCAL_PETREUNION_URL is set
if (-not $ok -and $env:LOCAL_PETREUNION_URL) {
    Write-Log "🔄 Attempting fallback to LOCAL_PETREUNION_URL..." "INFO"
    $LocalUrl = $env:LOCAL_PETREUNION_URL.TrimEnd('/')
    Run-Scraper -UrlToUse $LocalUrl | Out-Null
}

Write-Log "Daily scraper run complete." "INFO"
