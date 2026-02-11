<#
.SYNOPSIS
  Tests the Launchpad + Command Center, Monitor, and Praxis changes (merge, KeyVault, prod/test flag, landings, Terms/Privacy).

.DESCRIPTION
  - File checks: Launchpad .env.local (KeyVault "Updated" line), env.manifest (USE_PROD_SUPABASE), vault secrets ref; Monitor terms/privacy; Praxis landing.
  - HTTP checks (optional): Launchpad Command Center health API, Monitor landing/status/terms/privacy, Praxis landing. Start dev servers first if you want live checks.

.PARAMETER LaunchpadBase
  Base URL for Launchpad (default http://localhost:3000). Set to $null or empty to skip HTTP.

.PARAMETER MonitorBase
  Base URL for Monitor (default http://localhost:3010). Set to $null to skip.

.PARAMETER PraxisBase
  Base URL for Praxis (default http://localhost:3002). Set to $null to skip.

.PARAMETER SkipHttp
  Only run file checks, no HTTP.

  If Praxis (or another app) runs on 3000, pass -LaunchpadBase '' to skip Launchpad HTTP and -PraxisBase 'http://localhost:3000' so Praxis is tested on the right port.

.EXAMPLE
  .\Test-LaunchpadMonitorPraxisChanges.ps1
  .\Test-LaunchpadMonitorPraxisChanges.ps1 -SkipHttp
  .\Test-LaunchpadMonitorPraxisChanges.ps1 -LaunchpadBase '' -PraxisBase http://localhost:3000
#>

param(
  [string] $LaunchpadBase = 'http://localhost:3001',
  [string] $MonitorBase   = 'http://localhost:3010',
  [string] $PraxisBase    = 'http://localhost:3002',
  [switch] $SkipHttp
)

$ErrorActionPreference = 'Stop'
$script:Pass = 0
$script:Fail = 0
$root = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

function Test-File {
  param([string] $Name, [string] $Path, [string] $Contains = $null)
  $full = Join-Path $root $Path
  if (-not (Test-Path -LiteralPath $full)) {
    $script:Fail++; Write-Host "  FAIL $Name (missing: $Path)" -ForegroundColor Red
    return
  }
  if ($Contains) {
    $content = Get-Content -LiteralPath $full -Raw -ErrorAction SilentlyContinue
    if ($content -and $content -match [regex]::Escape($Contains)) {
      $script:Pass++; Write-Host "  OK   $Name" -ForegroundColor Green
    } else {
      $script:Fail++; Write-Host "  FAIL $Name (expected to contain: $Contains)" -ForegroundColor Red
    }
  } else {
    $script:Pass++; Write-Host "  OK   $Name" -ForegroundColor Green
  }
}

function Test-Endpoint {
  param([string] $Name, [string] $Method, [string] $Url, [int[]] $AcceptStatus = @(200), [int] $TimeoutSec = 10)
  try {
    $r = Invoke-WebRequest -Uri $Url -Method $Method -UseBasicParsing -TimeoutSec $TimeoutSec
    $ok = $r.StatusCode -in $AcceptStatus
    if ($ok) {
      $script:Pass++; Write-Host "  OK   $Name" -ForegroundColor Green
    } else {
      $script:Fail++; Write-Host "  FAIL $Name (status $($r.StatusCode))" -ForegroundColor Red
    }
  } catch {
    $script:Fail++
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "  FAIL $Name ($code / $($_.Exception.Message))" -ForegroundColor Red
  }
}

Write-Host "`n--- Launchpad / Monitor / Praxis changes (file + optional HTTP) ---`n" -ForegroundColor Cyan

# --- File checks ---
Write-Host "[ File checks ]" -ForegroundColor Cyan
Test-File -Name "Launchpad env.manifest USE_PROD_SUPABASE" -Path "apps\launchpad\env.manifest.json" -Contains "USE_PROD_SUPABASE"
Test-File -Name "Launchpad lib/supabase.ts useProd"         -Path "apps\launchpad\lib\supabase.ts" -Contains "USE_PROD_SUPABASE"
Test-File -Name "Launchpad Command Center health API"       -Path "apps\launchpad\app\api\command-center\health\route.ts"
Test-File -Name "Launchpad Command Center page"            -Path "apps\launchpad\app\command-center\page.tsx"
$envLocal = Join-Path $root "apps\launchpad\.env.local"
if (Test-Path -LiteralPath $envLocal) {
  Test-File -Name "Launchpad .env.local has Updated comment" -Path "apps\launchpad\.env.local" -Contains "# Updated:"
} else {
  $script:Fail++; Write-Host "  FAIL Launchpad .env.local missing (run sync-env.ps1 -AppPath .\apps\launchpad)" -ForegroundColor Red
}
Test-File -Name "Vault launchpad-prod-test-keys.txt"        -Path "vault\secrets\launchpad-prod-test-keys.txt"
Test-File -Name "Monitor landing page"                      -Path "apps\monitor\app\landing\page.tsx"
Test-File -Name "Monitor Terms page"                        -Path "apps\monitor\app\terms\page.tsx"
Test-File -Name "Monitor Privacy page"                      -Path "apps\monitor\app\privacy\page.tsx"
Test-File -Name "Monitor command-center redirect"          -Path "apps\monitor\app\command-center\page.tsx" -Contains "Command Center has moved"
Test-File -Name "Praxis landing page"                       -Path "apps\praxis\src\app\landing\page.tsx"
Test-File -Name "KeyVault sync writes Updated timestamp"    -Path "scripts\keyvault\KeyVault.psm1" -Contains "# Updated:"

# --- HTTP checks (optional) ---
if (-not $SkipHttp) {
  if ($LaunchpadBase) {
    Write-Host "`n[ Launchpad ] $LaunchpadBase" -ForegroundColor Cyan
    $healthUrl = [uri]::EscapeDataString("$LaunchpadBase/api/health")
    Test-Endpoint -Name "Launchpad GET /api/health" -Method GET -Url "$LaunchpadBase/api/health" -AcceptStatus 200,503
    # Heartbeat: Command Center fetches url=... and returns status; allow 20s (proxy has 5s internal timeout)
    Test-Endpoint -Name "Command Center GET /api/command-center/health?url=..." -Method GET -Url "$LaunchpadBase/api/command-center/health?url=$healthUrl" -AcceptStatus 200 -TimeoutSec 20
    Test-Endpoint -Name "Launchpad GET /command-center" -Method GET -Url "$LaunchpadBase/command-center" -AcceptStatus 200
  }
  if ($MonitorBase) {
    Write-Host "`n[ Monitor ] $MonitorBase" -ForegroundColor Cyan
    Test-Endpoint -Name "Monitor GET /landing" -Method GET -Url "$MonitorBase/landing" -AcceptStatus 200
    Test-Endpoint -Name "Monitor GET /status"  -Method GET -Url "$MonitorBase/status" -AcceptStatus 200
    Test-Endpoint -Name "Monitor GET /terms"   -Method GET -Url "$MonitorBase/terms" -AcceptStatus 200
    Test-Endpoint -Name "Monitor GET /privacy" -Method GET -Url "$MonitorBase/privacy" -AcceptStatus 200
  }
  if ($PraxisBase) {
    Write-Host "`n[ Praxis ] $PraxisBase" -ForegroundColor Cyan
    Test-Endpoint -Name "Praxis GET /landing" -Method GET -Url "$PraxisBase/landing" -AcceptStatus 200
  }
}

Write-Host "`n--- Summary ---" -ForegroundColor Cyan
Write-Host "Passed: $script:Pass  Failed: $script:Fail"
if ($script:Fail -gt 0) { exit 1 }
exit 0
