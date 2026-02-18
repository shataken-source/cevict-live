Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

Import-Module 'C:\cevict-live\scripts\keyvault\KeyVault.psm1' -Force
$cronSecret = Get-KeyVaultSecret -Name 'CRON_SECRET'

if ([string]::IsNullOrEmpty($cronSecret)) {
  Write-Error "CRON_SECRET not found in vault"; exit 1
}

$baseUrl = 'http://localhost:3008/api/cron/daily-results'
$results  = [System.Collections.Generic.List[string]]::new()

for ($d = 1; $d -le 17; $d++) {
  $date = '2026-02-' + ('{0:D2}' -f $d)
  $url  = "$baseUrl`?date=$date"

  Write-Host "[$date] Calling $url ..." -ForegroundColor Cyan

  try {
    $raw = curl.exe -s --max-time 120 -H "Authorization: Bearer $cronSecret" $url
    $obj = $raw | ConvertFrom-Json -ErrorAction SilentlyContinue

    if ($null -eq $obj) {
      $line = "$date -> RAW: $($raw.Substring(0, [Math]::Min(200, $raw.Length)))"
    } else {
      $wins    = if ($obj.summary.correct)  { $obj.summary.correct }  else { 0 }
      $total   = if ($obj.summary.total)    { $obj.summary.total }    else { 0 }
      $pending = if ($obj.summary.pending)  { $obj.summary.pending }  else { 0 }
      $losses  = $total - $wins - $pending
      $outcomes = if ($obj.gameOutcomesStored -gt 0) { " | outcomes_stored=$($obj.gameOutcomesStored)" } else { '' }
      $db       = if ($obj.dbInserted -gt 0)          { " | db_picks=$($obj.dbInserted)" }               else { '' }
      $line = "$date -> picks=$total W=$wins L=$losses P=$pending$db$outcomes"
    }
  } catch {
    $line = "$date -> ERROR: $($_.Exception.Message)"
  }

  Write-Host $line -ForegroundColor $(if ($line -match 'ERROR') { 'Red' } else { 'Green' })
  $results.Add($line)

  # Small pause to respect API rate limits between days
  Start-Sleep -Milliseconds 2000
}

Write-Host "`n===== FEBRUARY BACKFILL COMPLETE =====" -ForegroundColor Yellow
$results | ForEach-Object { Write-Host $_ }

# Write summary file
$summaryPath = 'C:\cevict-live\apps\progno\backfill-february-results.txt'
$results | Set-Content -Path $summaryPath -Encoding UTF8
Write-Host "`nSummary saved to: $summaryPath" -ForegroundColor Yellow
