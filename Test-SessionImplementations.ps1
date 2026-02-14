<#
.SYNOPSIS
  Smoke tests for session implementations: Progno, GCC, PetReunion, Alpha Hunter.

.DESCRIPTION
  Runs HTTP checks on API endpoints and a direct tsx test for Alpha Hunter learning-loop.
  Start dev servers first: Progno 3008, GCC 3000, PetReunion 3006.

.PARAMETER PrognoBase
  Base URL for Progno (default http://localhost:3008).

.PARAMETER GccBase
  Base URL for Gulf Coast Charters (default http://localhost:3000).

.PARAMETER PetReunionBase
  Base URL for PetReunion (default http://localhost:3006).

.PARAMETER CronSecret
  Optional. Bearer token for cron routes (sync-shelters, capture-odds).

.PARAMETER SkipAlphaHunter
  Skip Alpha Hunter learning-loop test (requires Supabase env in alpha-hunter).

.EXAMPLE
  .\Test-SessionImplementations.ps1
  .\Test-SessionImplementations.ps1 -CronSecret $env:CRON_SECRET
#>

param(
  [string] $PrognoBase     = 'http://localhost:3008',
  [string] $GccBase        = 'http://localhost:3000',
  [string] $PetReunionBase = 'http://localhost:3006',
  [string] $CronSecret     = '',
  [switch] $SkipAlphaHunter
)

$ErrorActionPreference = 'Stop'
$script:Pass = 0
$script:Fail = 0

function Test-Endpoint {
  param(
    [string] $Name,
    [string] $Method,
    [string] $Url,
    [hashtable] $Headers = @{},
    [string] $Body = $null,
    [int[]] $AcceptStatus = @(200),
    [scriptblock] $Assert = $null
  )
  try {
    $params = @{
      Uri             = $Url
      Method          = $Method
      UseBasicParsing = $true
      Headers         = $Headers
      TimeoutSec      = 15
    }
    if ($Body) { $params.Body = $Body; $params.ContentType = 'application/json' }
    $r = Invoke-WebRequest @params
    $ok = $r.StatusCode -in $AcceptStatus
    if ($Assert) {
      $json = $r.Content | ConvertFrom-Json
      $ok = $ok -and (& $Assert $json)
    }
    if ($ok) {
      $script:Pass++; Write-Host "  OK   $Name" -ForegroundColor Green
    } else {
      $script:Fail++; Write-Host "  FAIL $Name (status $($r.StatusCode))" -ForegroundColor Red
    }
  } catch {
    $script:Fail++
    $status = $_.Exception.Response.StatusCode.value__
    Write-Host "  FAIL $Name ($status / $($_.Exception.Message))" -ForegroundColor Red
  }
}

function Test-AlphaHunter {
  $root = if ($PSScriptRoot) { $PSScriptRoot } else { Get-Location }
  $alpha = Join-Path $root 'apps\alpha-hunter'
  if (-not (Test-Path $alpha)) {
    Write-Host "  SKIP Alpha Hunter (app not found)" -ForegroundColor Yellow
    return
  }
  Push-Location $alpha
  try {
    $out = & npx tsx scripts/test-learning-loop.ts 2>&1
    if ($LASTEXITCODE -eq 0) {
      $script:Pass++; Write-Host "  OK   Alpha Hunter learning-loop" -ForegroundColor Green
    } else {
      $script:Fail++; Write-Host "  FAIL Alpha Hunter learning-loop" -ForegroundColor Red
      if ($out) { Write-Host $out }
    }
  } catch {
    $script:Fail++; Write-Host "  FAIL Alpha Hunter learning-loop" -ForegroundColor Red
    Write-Host $_.Exception.Message
  } finally {
    Pop-Location
  }
}

Write-Host "`n--- Session implementation smoke tests ---`n" -ForegroundColor Cyan

# --- Progno ---
Write-Host "[ Progno ] $PrognoBase" -ForegroundColor Cyan
Test-Endpoint -Name "Progno GET /api/progno/portfolio?userId=test" -Method GET -Url "$PrognoBase/api/progno/portfolio?userId=test" -Assert { param($j) $j.success -eq $true }
Test-Endpoint -Name "Progno GET /api/progno/live-odds/alerts" -Method GET -Url "$PrognoBase/api/progno/live-odds/alerts" -Assert { param($j) $j.success -eq $true }
Test-Endpoint -Name "Progno GET /api/progno/portfolio/leaderboard" -Method GET -Url "$PrognoBase/api/progno/portfolio/leaderboard" -Assert { param($j) $j.success -eq $true }
if ($CronSecret) {
  $h = @{ Authorization = "Bearer $CronSecret" }
  Test-Endpoint -Name "Progno GET /api/cron/capture-odds" -Method GET -Url "$PrognoBase/api/cron/capture-odds" -Headers $h -AcceptStatus 200,201
} else {
  Write-Host "  SKIP Progno /api/cron/capture-odds (no -CronSecret)" -ForegroundColor Yellow
}

# --- GCC ---
Write-Host "`n[ GCC ] $GccBase" -ForegroundColor Cyan
Test-Endpoint -Name "GCC GET /api/gcc/packages?customerId=test" -Method GET -Url "$GccBase/api/gcc/packages?customerId=test" -Assert { param($j) $j.success -eq $true }
Test-Endpoint -Name "GCC POST /api/gcc/packages (expect 400)" -Method POST -Url "$GccBase/api/gcc/packages" -Body '{}' -AcceptStatus 400
Test-Endpoint -Name "GCC POST /api/gcc/packages/recommend (expect 400)" -Method POST -Url "$GccBase/api/gcc/packages/recommend" -Body '{}' -AcceptStatus 400

# --- PetReunion ---
Write-Host "`n[ PetReunion ] $PetReunionBase" -ForegroundColor Cyan
if ($CronSecret) {
  $h = @{ Authorization = "Bearer $CronSecret" }
  Test-Endpoint -Name "PetReunion GET /api/cron/sync-shelters" -Method GET -Url "$PetReunionBase/api/cron/sync-shelters" -Headers $h -Assert { param($j) $j.success -eq $true }
} else {
  Test-Endpoint -Name "PetReunion GET /api/cron/sync-shelters (expect 401)" -Method GET -Url "$PetReunionBase/api/cron/sync-shelters" -AcceptStatus 401
}

# --- Alpha Hunter (direct tsx) ---
Write-Host "`n[ Alpha Hunter ]" -ForegroundColor Cyan
if ($SkipAlphaHunter) {
  Write-Host "  SKIP Alpha Hunter (SkipAlphaHunter)" -ForegroundColor Yellow
} else {
  Test-AlphaHunter
}

# --- Summary ---
Write-Host "`n--- Summary ---" -ForegroundColor Cyan
Write-Host "Passed: $script:Pass  Failed: $script:Fail"
if ($script:Fail -gt 0) { exit 1 }
exit 0
