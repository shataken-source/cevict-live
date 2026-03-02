param(
  # Where to put snapshots (a timestamped subfolder will be created inside)
  [string]$OutputRoot = "$PSScriptRoot\live-snapshots",

  # Base URL for Progno (local dev)
  [string]$PrognoBaseUrl = "http://localhost:3008",

  # Admin / CRON secret for secured Progno admin endpoints (optional but recommended)
  [string]$PrognoAdminSecret = "",

  # Path to alpha-hunter app (for Kalshi bot training/status logs)
  [string]$AlphaHunterPath = "C:\cevict-live\apps\alpha-hunter"
)

$ErrorActionPreference = 'Stop'

# ── Setup output folder ─────────────────────────────────────────────────────────
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$root = Join-Path $OutputRoot $timestamp
New-Item -ItemType Directory -Path $root -Force | Out-Null

Write-Host "Snapshot root: $root"

function Save-Json {
  param(
    [string]$Url,
    [string]$Path,
    [string]$Method = "GET",
    [object]$Body = $null,
    [hashtable]$Headers = $null
  )

  Write-Host "  -> $Url"

  try {
    $params = @{
      Uri         = $Url
      Method      = $Method
      ErrorAction = 'Stop'
    }
    if ($Headers) { $params.Headers = $Headers }
    if ($Body -ne $null) {
      $params.Body        = ($Body | ConvertTo-Json -Depth 8)
      $params.ContentType = 'application/json'
    }

    $res = Invoke-RestMethod @params
    $json = $res | ConvertTo-Json -Depth 10
    $json | Out-File -FilePath $Path -Encoding utf8
  }
  catch {
    $err = @{
      error = $_.Exception.Message
      url   = $Url
      time  = (Get-Date).ToString("o")
    }
    $err | ConvertTo-Json -Depth 4 | Out-File -FilePath $Path -Encoding utf8
  }
}

# ── 1) Progno: picks + predictions + data-collection preview ───────────────────

Write-Host "`n[1/3] Progno snapshots"

# /api/picks/today (today's full pipeline)
$today = (Get-Date).ToString('yyyy-MM-dd')
$picksPath = Join-Path $root "progno-picks-today-$today.json"
Save-Json -Url "$PrognoBaseUrl/api/picks/today?debug=1" -Path $picksPath

# /api/progno/predictions/stats (if route exists)
$predStatsPath = Join-Path $root "progno-predictions-stats.json"
Save-Json -Url "$PrognoBaseUrl/api/progno/predictions/stats" -Path $predStatsPath

# /api/cron/daily-results (yesterday results + grading summary), auth required
if ($PrognoAdminSecret) {
  $headers = @{ Authorization = "Bearer $PrognoAdminSecret" }
  $yesterday = (Get-Date).AddDays(-1).ToString('yyyy-MM-dd')
  $resultsPath = Join-Path $root "progno-daily-results-$yesterday.json"
  Save-Json -Url "$PrognoBaseUrl/api/cron/daily-results?date=$yesterday" -Path $resultsPath -Headers $headers
}

# /api/progno/admin/data-collection/preview (Claude Effect data feeds status)
if ($PrognoAdminSecret) {
  Write-Host "`n  Data-collection preview"
  $headers = @{ Authorization = "Bearer $PrognoAdminSecret" }
  $previewBody = @{
    teamName = "Kansas City Chiefs"
    stadium  = @{
      name  = "Arrowhead Stadium"
      city  = "Kansas City"
      state = "MO"
    }
    gameDate = (Get-Date).AddDays(1).ToString("yyyy-MM-ddT18:30:00Z")
    include  = @{
      phase1 = $true   # sentiment
      phase3 = $true   # IAI / line movement
      phase4 = $true   # weather / injuries
    }
  }
  $previewPath = Join-Path $root "progno-data-collection-preview.json"
  Save-Json -Url "$PrognoBaseUrl/api/progno/admin/data-collection/preview" -Path $previewPath -Method "POST" -Body $previewBody -Headers $headers
}

# ── 2) Progno: TrailerVegas internal grader sample (optional manual step) ──────
# This route needs a file upload, so we don't hit it automatically here.
# You can still use /progno/admin/trailervegas in the browser and then
# manually save the JSON summary if needed.

# ── 3) Alpha Hunter: Kalshi expert bots training/status logs ───────────────────

Write-Host "`n[2/3] Alpha Hunter Kalshi bot snapshots"

if (Test-Path $AlphaHunterPath) {
  Push-Location $AlphaHunterPath
  try {
    $trainCatLog = Join-Path $root "alpha-train-category-bots.log"
    Write-Host "  -> Training category bots (status)"
    # Train category learners on current Kalshi markets / or show stats if 'status' is passed
    npx tsx src/train-category-bots.ts status *>&1 | Out-File -FilePath $trainCatLog -Encoding utf8
  }
  catch {
    $_ | Out-File -FilePath (Join-Path $root "alpha-train-category-bots-error.log") -Encoding utf8
  }

  try {
    $academyLog = Join-Path $root "alpha-train-bot-academy.log"
    Write-Host "  -> Training Bot Academy experts"
    npx tsx src/train-bot-academy.ts *>&1 | Out-File -FilePath $academyLog -Encoding utf8
  }
  catch {
    $_ | Out-File -FilePath (Join-Path $root "alpha-train-bot-academy-error.log") -Encoding utf8
  }
  Pop-Location
}
else {
  Write-Host "  Alpha Hunter path not found: $AlphaHunterPath"
}

# ── 4) Summary ──────────────────────────────────────────────────────────────────

Write-Host "`n[3/3] Snapshot complete."
Write-Host "Files written under: $root"