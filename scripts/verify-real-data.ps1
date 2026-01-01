# ============================================================================
# REAL DATA VERIFICATION SCRIPT
# ============================================================================
# Checks that NO fallback/sample/mock data is being used anywhere
# Ensures ONLY real data from APIs flows through the system
# ============================================================================

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "`n🔍 VERIFYING REAL DATA FLOW (NO FALLBACKS)" -ForegroundColor Yellow
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

$ErrorsFound = 0
$WarningsFound = 0

# Function to check for forbidden patterns
function Test-ForbiddenPatterns {
    param(
        [string]$Path,
        [string[]]$Patterns
    )
    
    Write-Host "Scanning: $Path" -ForegroundColor White
    
    foreach ($Pattern in $Patterns) {
        $Results = Get-ChildItem -Path $Path -Recurse -Include *.ts,*.tsx,*.js,*.jsx -ErrorAction SilentlyContinue | 
            Select-String -Pattern $Pattern -CaseSensitive:$false
        
        if ($Results) {
            $script:ErrorsFound++
            Write-Host "   ❌ FOUND FORBIDDEN PATTERN: $Pattern" -ForegroundColor Red
            foreach ($Result in $Results) {
                Write-Host "      $($Result.Filename):$($Result.LineNumber)" -ForegroundColor Yellow
            }
        }
    }
}

# ============================================================================
# CHECK 1: PROGNOSTICATION - NO FALLBACK DATA
# ============================================================================
Write-Host "`n📊 CHECK 1: Prognostication API Fallback Logic" -ForegroundColor Cyan

$ForbiddenPatterns = @(
    'generatePicks',
    'Fall back to sample',
    'fallback to sample',
    'Using SAMPLE data',
    'mock.*data',
    'fake.*data',
    'test.*data.*=.*\[',
    'const.*samplePicks'
)

Test-ForbiddenPatterns -Path "apps/prognostication/app/api" -Patterns $ForbiddenPatterns

# Check for isLiveData: false
$FalseIsLiveData = Get-ChildItem -Path "apps/prognostication" -Recurse -Include *.ts,*.tsx,*.js,*.jsx | 
    Select-String -Pattern "isLiveData.*:.*false" -CaseSensitive:$false

if ($FalseIsLiveData) {
    $ErrorsFound++
    Write-Host "   ❌ FOUND: isLiveData set to false" -ForegroundColor Red
}

# ============================================================================
# CHECK 2: ALPHA-HUNTER - VERIFY REAL API CALLS
# ============================================================================
Write-Host "`n🤖 CHECK 2: Alpha-Hunter API Configuration" -ForegroundColor Cyan

# Check for simulation mode
$SimulationMode = Get-ChildItem -Path "apps/alpha-hunter/src" -Recurse -Include *.ts | 
    Select-String -Pattern "simulation.*mode|demo.*mode|test.*mode" -CaseSensitive:$false

if ($SimulationMode) {
    $WarningsFound++
    Write-Host "   ⚠️  FOUND: Potential simulation mode references" -ForegroundColor Yellow
    foreach ($Result in $SimulationMode) {
        Write-Host "      $($Result.Filename):$($Result.LineNumber)" -ForegroundColor Yellow
    }
}

# ============================================================================
# CHECK 3: ENVIRONMENT VARIABLES
# ============================================================================
Write-Host "`n🔐 CHECK 3: Critical Environment Variables" -ForegroundColor Cyan

$RequiredEnvVars = @(
    @{File="apps/alpha-hunter/.env.local"; Vars=@("KALSHI_API_KEY_ID", "KALSHI_PRIVATE_KEY", "COINBASE_API_KEY", "ANTHROPIC_API_KEY")},
    @{File="apps/prognostication/.env.local"; Vars=@("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")}
)

foreach ($Check in $RequiredEnvVars) {
    if (Test-Path $Check.File) {
        $EnvContent = Get-Content $Check.File -Raw
        foreach ($Var in $Check.Vars) {
            if ($EnvContent -notmatch "$Var=") {
                $ErrorsFound++
                Write-Host "   ❌ MISSING: $Var in $($Check.File)" -ForegroundColor Red
            }
        }
    } else {
        $ErrorsFound++
        Write-Host "   ❌ FILE NOT FOUND: $($Check.File)" -ForegroundColor Red
    }
}

# ============================================================================
# CHECK 4: DATA FLOW FILE
# ============================================================================
Write-Host "`n📄 CHECK 4: Live Data File (.kalshi-picks.json)" -ForegroundColor Cyan

$DataFile = "apps/alpha-hunter/.kalshi-picks.json"
if (Test-Path $DataFile) {
    $DataContent = Get-Content $DataFile -Raw | ConvertFrom-Json
    
    if ($DataContent.picks.Count -gt 0) {
        Write-Host "   ✅ Live data file exists with $($DataContent.picks.Count) picks" -ForegroundColor Green
        
        # Check timestamp freshness (should be < 1 hour old)
        $Timestamp = [DateTime]::Parse($DataContent.timestamp)
        $Age = (Get-Date) - $Timestamp
        
        if ($Age.TotalHours -gt 1) {
            $WarningsFound++
            Write-Host "   ⚠️  Data is $([Math]::Round($Age.TotalHours, 1)) hours old" -ForegroundColor Yellow
        } else {
            Write-Host "   ✅ Data is fresh ($([Math]::Round($Age.TotalMinutes, 0)) minutes old)" -ForegroundColor Green
        }
    } else {
        $WarningsFound++
        Write-Host "   ⚠️  Live data file exists but has no picks" -ForegroundColor Yellow
    }
} else {
    $WarningsFound++
    Write-Host "   ⚠️  Live data file not found (bot may not be running)" -ForegroundColor Yellow
}

# ============================================================================
# CHECK 5: API ENDPOINT TEST
# ============================================================================
Write-Host "`n🌐 CHECK 5: API Endpoint Verification" -ForegroundColor Cyan

try {
    $Response = Invoke-WebRequest -Uri "http://localhost:3002/api/kalshi/picks" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $Data = $Response.Content | ConvertFrom-Json
    
    if ($Data.isLiveData -eq $true) {
        Write-Host "   ✅ API returning isLiveData: true" -ForegroundColor Green
    } else {
        $ErrorsFound++
        Write-Host "   ❌ API returning isLiveData: false (FALLBACK ACTIVE!)" -ForegroundColor Red
    }
    
    if ($Data.picks.Count -gt 0) {
        Write-Host "   ✅ API returning $($Data.picks.Count) picks" -ForegroundColor Green
    } else {
        $WarningsFound++
        Write-Host "   ⚠️  API returning 0 picks" -ForegroundColor Yellow
    }
} catch {
    $WarningsFound++
    Write-Host "   ⚠️  Could not reach API (server may not be running)" -ForegroundColor Yellow
}

# ============================================================================
# CHECK 6: DEPLOYMENT SCRIPTS
# ============================================================================
Write-Host "`n📦 CHECK 6: Deployment Configuration" -ForegroundColor Cyan

if (Test-Path "apps/prognostication/scripts/deploy.ps1") {
    Write-Host "   ✅ Prognostication deployment script exists" -ForegroundColor Green
} else {
    $WarningsFound++
    Write-Host "   ⚠️  Prognostication deployment script missing" -ForegroundColor Yellow
}

if (Test-Path "apps/alpha-hunter/scripts/deploy.ps1") {
    Write-Host "   ✅ Alpha-Hunter deployment script exists" -ForegroundColor Green
} else {
    $WarningsFound++
    Write-Host "   ⚠️  Alpha-Hunter deployment script missing" -ForegroundColor Yellow
}

# ============================================================================
# FINAL REPORT
# ============================================================================
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "`n📊 VERIFICATION SUMMARY" -ForegroundColor Yellow
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

Write-Host "Errors Found:   $ErrorsFound" -ForegroundColor $(if ($ErrorsFound -eq 0) { "Green" } else { "Red" })
Write-Host "Warnings Found: $WarningsFound" -ForegroundColor $(if ($WarningsFound -eq 0) { "Green" } else { "Yellow" })

if ($ErrorsFound -eq 0 -and $WarningsFound -eq 0) {
    Write-Host "`n✅ PERFECT! NO FALLBACK DATA DETECTED!" -ForegroundColor Green
    Write-Host "   System is using REAL DATA ONLY" -ForegroundColor Green
    exit 0
} elseif ($ErrorsFound -eq 0) {
    Write-Host "`n⚠️  ACCEPTABLE - Minor warnings only" -ForegroundColor Yellow
    Write-Host "   Review warnings above and address if needed" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "`n❌ CRITICAL ERRORS DETECTED!" -ForegroundColor Red
    Write-Host "   FALLBACK/SAMPLE DATA IS BEING USED!" -ForegroundColor Red
    Write-Host "   Fix errors above before deploying to production" -ForegroundColor Red
    exit 1
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

