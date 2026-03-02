# Part 2: Check predictions storage files and debug cron output
param()
Set-StrictMode -Version Latest

Import-Module (Join-Path $PSScriptRoot 'keyvault\KeyVault.psm1') -Force

$sbUrl = Get-KeyVaultSecret -Name 'NEXT_PUBLIC_SUPABASE_URL'
$sbKey = Get-KeyVaultSecret -Name 'SUPABASE_SERVICE_ROLE_KEY'

$headers = @{
  'apikey'        = $sbKey
  'Authorization' = "Bearer $sbKey"
  'Content-Type'  = 'application/json'
}

$today = '2026-03-02'

# 1. Check if predictions-2026-03-02.json exists in storage
Write-Host "`n--- CHECK PREDICTION FILE FOR $today ---" -ForegroundColor Cyan
try {
  $dlUrl = "$sbUrl/storage/v1/object/predictions/predictions-$today.json"
  $dlHeaders = @{
    'apikey'        = $sbKey
    'Authorization' = "Bearer $sbKey"
  }
  $response = Invoke-WebRequest -Uri $dlUrl -Headers $dlHeaders -Method GET -ErrorAction Stop
  $content = $response.Content
  Write-Host "  predictions-$today.json EXISTS ($($content.Length) bytes)" -ForegroundColor Green
  $json = $content | ConvertFrom-Json
  Write-Host "  Date: $($json.date), Count: $($json.count), Generated: $($json.generatedAt)"
  Write-Host "  Message: $($json.message)"
  if ($json.picks -and $json.picks.Count -gt 0) {
    Write-Host "  Picks:" -ForegroundColor Green
    foreach ($p in ($json.picks | Select-Object -First 5)) {
      Write-Host "    $($p.away_team) @ $($p.home_team) -> $($p.pick) ($($p.pick_type) $($p.confidence)%)"
    }
    if ($json.picks.Count -gt 5) { Write-Host "    ... and $($json.picks.Count - 5) more" }
  }
} catch {
  Write-Host "  predictions-$today.json NOT FOUND (cron likely did not produce picks)" -ForegroundColor Red
  Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor DarkGray
}

# 2. Check early lines file
Write-Host "`n--- CHECK EARLY LINES FILE ---" -ForegroundColor Cyan
try {
  $dlUrl = "$sbUrl/storage/v1/object/predictions/predictions-early-$today.json"
  $dlHeaders = @{
    'apikey'        = $sbKey
    'Authorization' = "Bearer $sbKey"
  }
  $response = Invoke-WebRequest -Uri $dlUrl -Headers $dlHeaders -Method GET -ErrorAction Stop
  $content = $response.Content
  Write-Host "  predictions-early-$today.json EXISTS ($($content.Length) bytes)" -ForegroundColor Green
  $json = $content | ConvertFrom-Json
  Write-Host "  Date: $($json.date), Count: $($json.count), Generated: $($json.generatedAt)"
} catch {
  Write-Host "  predictions-early-$today.json NOT FOUND" -ForegroundColor Red
}

# 3. Check picks table more broadly (maybe stored under different date)
Write-Host "`n--- PICKS TABLE (last 3 days) ---" -ForegroundColor Cyan
try {
  $threeDaysAgo = (Get-Date).AddDays(-3).ToString('yyyy-MM-dd')
  $picksUrl = "$sbUrl/rest/v1/picks?game_date=gte.$threeDaysAgo&select=game_date,count&order=game_date.desc"
  # Actually just get a grouped view
  $picksUrl2 = "$sbUrl/rest/v1/picks?game_date=gte.$threeDaysAgo&select=id,game_date,league,status,early_lines&order=game_date.desc"
  $picks = Invoke-RestMethod -Uri $picksUrl2 -Headers $headers -Method GET
  if ($picks.Count -gt 0) {
    $byDate = $picks | Group-Object game_date
    foreach ($g in $byDate) {
      $regular = ($g.Group | Where-Object { -not $_.early_lines }).Count
      $early = ($g.Group | Where-Object { $_.early_lines }).Count
      $byLeague = ($g.Group | Group-Object league | ForEach-Object { "$($_.Name):$($_.Count)" }) -join ', '
      Write-Host "  $($g.Name): $($g.Count) total ($regular regular, $early early) [$byLeague]"
    }
  } else {
    Write-Host "  No picks in last 3 days" -ForegroundColor Red
  }
} catch {
  Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Check the prediction_daily_summary table
Write-Host "`n--- DAILY SUMMARY (last 7 days) ---" -ForegroundColor Cyan
try {
  $weekAgo = (Get-Date).AddDays(-7).ToString('yyyy-MM-dd')
  $summUrl = "$sbUrl/rest/v1/prediction_daily_summary?date=gte.$weekAgo&select=date,total,correct,wrong,pending,win_rate&order=date.desc"
  $summaries = Invoke-RestMethod -Uri $summUrl -Headers $headers -Method GET
  if ($summaries.Count -gt 0) {
    foreach ($s in $summaries) {
      Write-Host "  $($s.date): $($s.total) picks, $($s.correct)W/$($s.wrong)L/$($s.pending)P, WR=$($s.win_rate)%"
    }
  } else {
    Write-Host "  No daily summaries found" -ForegroundColor DarkGray
  }
} catch {
  Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Quick Odds API check — does it return games for today?
Write-Host "`n--- ODDS API QUICK CHECK (NBA today) ---" -ForegroundColor Cyan
$oddsKey = Get-KeyVaultSecret -Name 'ODDS_API_KEY'
if ($oddsKey) {
  try {
    $oddsUrl = "https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=$oddsKey&regions=us&markets=h2h&oddsFormat=american"
    $oddsResp = Invoke-RestMethod -Uri $oddsUrl -Method GET
    $todayGames = $oddsResp | Where-Object { $_.commence_time -like "$today*" }
    Write-Host "  NBA total games from API: $($oddsResp.Count), today ($today): $($todayGames.Count)" -ForegroundColor Green
    foreach ($g in ($todayGames | Select-Object -First 5)) {
      Write-Host "    $($g.away_team) @ $($g.home_team) ($($g.commence_time))"
    }
    if ($todayGames.Count -gt 5) { Write-Host "    ... and $($todayGames.Count - 5) more" }
  } catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
  }
} else {
  Write-Host "  No ODDS_API_KEY in vault" -ForegroundColor Red
}

Write-Host "`n========== PART 2 COMPLETE ==========" -ForegroundColor Cyan
