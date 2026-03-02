# Morning health check: query Supabase for today's picks, results, and Coinbase status
param()
Set-StrictMode -Version Latest

Import-Module (Join-Path $PSScriptRoot 'keyvault\KeyVault.psm1') -Force

$sbUrl = Get-KeyVaultSecret -Name 'NEXT_PUBLIC_SUPABASE_URL'
$sbKey = Get-KeyVaultSecret -Name 'SUPABASE_SERVICE_ROLE_KEY'

if (-not $sbUrl -or -not $sbKey) {
  Write-Error "Missing Supabase URL or key in vault"
  exit 1
}

$headers = @{
  'apikey'        = $sbKey
  'Authorization' = "Bearer $sbKey"
  'Content-Type'  = 'application/json'
}

$today = (Get-Date).ToString('yyyy-MM-dd')
$yesterday = (Get-Date).AddDays(-1).ToString('yyyy-MM-dd')

Write-Host "`n========== MORNING HEALTH CHECK ($today) ==========" -ForegroundColor Cyan

# 1. Check today's picks
Write-Host "`n--- TODAY'S PICKS ($today) ---" -ForegroundColor Yellow
try {
  $picksUrl = "$sbUrl/rest/v1/picks?game_date=eq.$today&select=id,game_date,home_team,away_team,pick,pick_type,confidence,odds,status,result,league,early_lines&order=confidence.desc"
  $picks = Invoke-RestMethod -Uri $picksUrl -Headers $headers -Method GET
  if ($picks.Count -eq 0) {
    Write-Host "  NO PICKS for $today" -ForegroundColor Red
  } else {
    Write-Host "  $($picks.Count) picks found" -ForegroundColor Green
    $byLeague = $picks | Group-Object league
    foreach ($g in $byLeague) {
      Write-Host "    $($g.Name): $($g.Count) picks"
    }
    $byStatus = $picks | Group-Object status
    foreach ($g in $byStatus) {
      Write-Host "    Status '$($g.Name)': $($g.Count)"
    }
    # Show first 10
    Write-Host ""
    foreach ($p in ($picks | Select-Object -First 10)) {
      $conf = if ($p.confidence) { "$($p.confidence)%" } else { "?%" }
      $el = if ($p.early_lines) { " [EARLY]" } else { "" }
      Write-Host "    $($p.away_team) @ $($p.home_team) -> $($p.pick) ($($p.pick_type) $conf)$el [$($p.status)]"
    }
    if ($picks.Count -gt 10) { Write-Host "    ... and $($picks.Count - 10) more" }
  }
} catch {
  Write-Host "  ERROR fetching picks: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Check yesterday's results
Write-Host "`n--- YESTERDAY'S RESULTS ($yesterday) ---" -ForegroundColor Yellow
try {
  $resultsUrl = "$sbUrl/rest/v1/picks?game_date=eq.$yesterday&select=id,home_team,away_team,pick,status,result,league&order=league"
  $results = Invoke-RestMethod -Uri $resultsUrl -Headers $headers -Method GET
  if ($results.Count -eq 0) {
    Write-Host "  No picks found for $yesterday" -ForegroundColor DarkGray
  } else {
    $graded = $results | Where-Object { $_.result -ne $null }
    $wins = $results | Where-Object { $_.result -eq 'win' -or $_.status -eq 'win' }
    $losses = $results | Where-Object { $_.result -eq 'lose' -or $_.result -eq 'loss' -or $_.status -eq 'lose' }
    $pending = $results | Where-Object { $_.result -eq $null -and $_.status -eq 'pending' }
    Write-Host "  $($results.Count) total, $($wins.Count) wins, $($losses.Count) losses, $($pending.Count) pending" -ForegroundColor Green
    if ($graded.Count -gt 0) {
      $winRate = [math]::Round(($wins.Count / $graded.Count) * 100, 1)
      Write-Host "  Win rate: $winRate% (of $($graded.Count) graded)" -ForegroundColor Green
    }
  }
} catch {
  Write-Host "  ERROR fetching results: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Check early lines (tomorrow or future)
$tomorrow = (Get-Date).AddDays(1).ToString('yyyy-MM-dd')
Write-Host "`n--- EARLY LINES ($tomorrow+) ---" -ForegroundColor Yellow
try {
  $earlyUrl = "$sbUrl/rest/v1/picks?early_lines=eq.true&game_date=gte.$today&select=id,game_date,home_team,away_team,pick,confidence,league&order=game_date,confidence.desc"
  $early = Invoke-RestMethod -Uri $earlyUrl -Headers $headers -Method GET
  if ($early.Count -eq 0) {
    Write-Host "  No early lines found" -ForegroundColor DarkGray
  } else {
    Write-Host "  $($early.Count) early line picks" -ForegroundColor Green
    $byDate = $early | Group-Object game_date
    foreach ($g in $byDate) {
      Write-Host "    $($g.Name): $($g.Count) picks"
    }
  }
} catch {
  Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Check Kalshi actual bets
Write-Host "`n--- KALSHI ACTUAL BETS (recent) ---" -ForegroundColor Yellow
try {
  $kalshiUrl = "$sbUrl/rest/v1/actual_bets?select=id,ticker,side,contracts,stake_cents,result,status,created_at&order=created_at.desc&limit=10"
  $bets = Invoke-RestMethod -Uri $kalshiUrl -Headers $headers -Method GET
  if ($bets.Count -eq 0) {
    Write-Host "  No actual bets found" -ForegroundColor DarkGray
  } else {
    Write-Host "  $($bets.Count) recent bets:" -ForegroundColor Green
    foreach ($b in $bets) {
      $stake = if ($b.stake_cents) { "$([math]::Round($b.stake_cents / 100, 2))" } else { "?" }
      $dt = if ($b.created_at) { $b.created_at.Substring(0,10) } else { "?" }
      Write-Host "    $dt $($b.ticker) $($b.side) ${stake}USD [$($b.status)] result=$($b.result)"
    }
  }
} catch {
  Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Check Supabase storage for prediction files
Write-Host "`n--- PREDICTION FILES IN STORAGE ---" -ForegroundColor Yellow
try {
  $storageUrl = "$sbUrl/storage/v1/object/list/predictions"
  $storageHeaders = @{
    'apikey'        = $sbKey
    'Authorization' = "Bearer $sbKey"
    'Content-Type'  = 'application/json'
  }
  $body = '{"prefix":"","limit":20,"offset":0,"sortBy":{"column":"created_at","order":"desc"}}'
  $files = Invoke-RestMethod -Uri $storageUrl -Headers $storageHeaders -Method POST -Body $body
  if ($files.Count -eq 0) {
    Write-Host "  No prediction files in storage" -ForegroundColor DarkGray
  } else {
    foreach ($f in ($files | Select-Object -First 15)) {
      $size = if ($f.metadata -and $f.metadata.size) { "$([math]::Round($f.metadata.size / 1024, 1))KB" } else { "?" }
      $created = if ($f.created_at) { $f.created_at.Substring(0,19) } else { "?" }
      Write-Host "    $($f.name)  $size  $created"
    }
  }
} catch {
  Write-Host "  ERROR listing storage: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========== CHECK COMPLETE ==========" -ForegroundColor Cyan
