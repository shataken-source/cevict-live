# Part 3: Better Supabase + Odds API diagnostics
param()
Set-StrictMode -Version Latest

Import-Module (Join-Path $PSScriptRoot 'keyvault\KeyVault.psm1') -Force

$sbUrl = Get-KeyVaultSecret -Name 'NEXT_PUBLIC_SUPABASE_URL'
$sbKey = Get-KeyVaultSecret -Name 'SUPABASE_SERVICE_ROLE_KEY'

$headers = @{
  'apikey'        = $sbKey
  'Authorization' = "Bearer $sbKey"
}

$today = '2026-03-02'

# 1. Check picks table broadly
Write-Host "`n--- PICKS TABLE (all dates, last 20) ---" -ForegroundColor Cyan
try {
  $url = "$sbUrl/rest/v1/picks?select=id,game_date,league,status,early_lines,created_at&order=created_at.desc&limit=20"
  $resp = Invoke-WebRequest -Uri $url -Headers $headers -Method GET
  $picks = $resp.Content | ConvertFrom-Json
  if ($picks.Count -gt 0) {
    foreach ($p in $picks) {
      $el = if ($p.early_lines) { " [EARLY]" } else { "" }
      Write-Host "  $($p.game_date) $($p.league) [$($p.status)]$el created=$($p.created_at)"
    }
  }
  else {
    Write-Host "  No picks found at all" -ForegroundColor Red
  }
}
catch {
  Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Check prediction_daily_summary
Write-Host "`n--- DAILY SUMMARY TABLE ---" -ForegroundColor Cyan
try {
  $url = "$sbUrl/rest/v1/prediction_daily_summary?select=*&order=date.desc&limit=10"
  $resp = Invoke-WebRequest -Uri $url -Headers $headers -Method GET
  $sums = $resp.Content | ConvertFrom-Json
  if ($sums.Count -gt 0) {
    foreach ($s in $sums) {
      Write-Host "  $($s.date): total=$($s.total) correct=$($s.correct) wrong=$($s.wrong) pending=$($s.pending) wr=$($s.win_rate)%"
    }
  }
  else {
    Write-Host "  No summaries" -ForegroundColor DarkGray
  }
}
catch {
  Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Odds API — check NBA games
Write-Host "`n--- ODDS API: NBA GAMES ---" -ForegroundColor Cyan
$oddsKey = Get-KeyVaultSecret -Name 'ODDS_API_KEY'
$oddsKey2 = Get-KeyVaultSecret -Name 'ODDS_API_KEY_2'
Write-Host "  ODDS_API_KEY length: $( if ($oddsKey) { $oddsKey.Length } else { 'MISSING' } )"
Write-Host "  ODDS_API_KEY_2 length: $( if ($oddsKey2) { $oddsKey2.Length } else { 'MISSING' } )"

if ($oddsKey) {
  try {
    $oddsUrl = "https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=$oddsKey" + "&regions=us&markets=h2h&oddsFormat=american"
    $resp = Invoke-WebRequest -Uri $oddsUrl -Method GET
    $remaining = $resp.Headers['x-requests-remaining']
    $used = $resp.Headers['x-requests-used']
    Write-Host "  API quota: used=$used remaining=$remaining" -ForegroundColor Yellow
    $games = $resp.Content | ConvertFrom-Json
    Write-Host "  Total NBA games returned: $($games.Count)" -ForegroundColor Green
    foreach ($g in $games) {
      $ct = $g.commence_time
      $isToday = $ct -like "$today*"
      $marker = if ($isToday) { ' *** TODAY' } else { '' }
      Write-Host ('    ' + $g.away_team + ' vs ' + $g.home_team + ' ' + $ct + $marker)
    }
  }
  catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  ERROR ($statusCode): $($_.Exception.Message)" -ForegroundColor Red
    if ($statusCode -eq 401) {
      Write-Host "  Key may be expired/invalid. Try ODDS_API_KEY_2." -ForegroundColor Red
    }
  }
}
else {
  Write-Host "  No ODDS_API_KEY — cannot check" -ForegroundColor Red
}

# 4. Check NHL games too
Write-Host "`n--- ODDS API: NHL GAMES ---" -ForegroundColor Cyan
if ($oddsKey) {
  try {
    $oddsUrl = "https://api.the-odds-api.com/v4/sports/icehockey_nhl/odds/?apiKey=$oddsKey" + "&regions=us&markets=h2h&oddsFormat=american"
    $resp = Invoke-WebRequest -Uri $oddsUrl -Method GET
    $games = $resp.Content | ConvertFrom-Json
    Write-Host "  Total NHL games: $($games.Count)" -ForegroundColor Green
    foreach ($g in $games) {
      $ct = $g.commence_time
      $isToday = $ct -like "$today*"
      $marker = if ($isToday) { ' *** TODAY' } else { '' }
      Write-Host ('    ' + $g.away_team + ' vs ' + $g.home_team + ' ' + $ct + $marker)
    }
  }
  catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
  }
}

# 5. Check NCAAB games
Write-Host "`n--- ODDS API: NCAAB GAMES (first 10) ---" -ForegroundColor Cyan
if ($oddsKey) {
  try {
    $oddsUrl = "https://api.the-odds-api.com/v4/sports/basketball_ncaab/odds/?apiKey=$oddsKey" + "&regions=us&markets=h2h&oddsFormat=american"
    $resp = Invoke-WebRequest -Uri $oddsUrl -Method GET
    $games = $resp.Content | ConvertFrom-Json
    $todayNcaab = @($games | Where-Object { $_.commence_time -like "$today*" })
    Write-Host "  Total NCAAB games: $($games.Count), today: $($todayNcaab.Count)" -ForegroundColor Green
    foreach ($g in ($todayNcaab | Select-Object -First 10)) {
      Write-Host ('    ' + $g.away_team + ' vs ' + $g.home_team + ' ' + $g.commence_time)
    }
    if ($todayNcaab.Count -gt 10) { Write-Host "    ... and $($todayNcaab.Count - 10) more" }
  }
  catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
  }
}

# 6. Check Vercel deployment for progno
Write-Host "`n--- VERCEL STATUS CHECK ---" -ForegroundColor Cyan
$vercelToken = Get-KeyVaultSecret -Name 'VERCEL_TOKEN'
if ($vercelToken) {
  try {
    $vHeaders = @{ 'Authorization' = "Bearer $vercelToken" }
    $deplUrl = "https://api.vercel.com/v6/deployments?limit=3&projectId=prj_YkBvkVUhZ8bJJAFJ2pYlVOhNVlNP"
    $resp = Invoke-WebRequest -Uri $deplUrl -Headers $vHeaders -Method GET
    $depls = ($resp.Content | ConvertFrom-Json).deployments
    Write-Host "  Recent progno deployments:" -ForegroundColor Green
    foreach ($d in $depls) {
      $created = [DateTimeOffset]::FromUnixTimeMilliseconds($d.created).ToString('yyyy-MM-dd HH:mm:ss')
      Write-Host "    $created state=$($d.state) ready=$($d.readyState) url=$($d.url)"
    }
  }
  catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
  }
}
else {
  Write-Host "  No VERCEL_TOKEN in vault — skip deployment check" -ForegroundColor DarkGray
}

Write-Host "`n========== PART 3 COMPLETE ==========" -ForegroundColor Cyan
