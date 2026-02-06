# Daily Predictions - run at 8 AM
Set-Location "C:\cevict-live\apps\progno"

$leagues = @('nhl', 'ncaab', 'nba', 'nfl', 'ncaaf', 'mlb')
$allPredictions = New-Object System.Collections.Generic.List[PSCustomObject]

foreach ($league in $leagues) {
  Write-Host "Fetching $league games..." -ForegroundColor Yellow

  try {
    $gamesResponse = Invoke-RestMethod -Uri "http://localhost:3008/api/progno/v2?action=games&sport=$league" -Method Get

    if ($gamesResponse.success -and $gamesResponse.data) {
      Write-Host "Found $($gamesResponse.data.Count) games" -ForegroundColor Green

      foreach ($game in $gamesResponse.data) {
        Write-Host "Predicting $($game.homeTeam) vs $($game.awayTeam)" -ForegroundColor Cyan

        try {
          $predResponse = Invoke-RestMethod -Uri "http://localhost:3008/api/progno/v2?action=prediction&gameId=$($game.id)" -Method Get -TimeoutSec 30

          if ($predResponse.success -and $predResponse.data) {
            $allPredictions.Add($predResponse.data)
          }
        } catch {
          Write-Warning "Prediction error for game $($game.id): $($_.Exception.Message)"
        }
      }
    }
  } catch {
    # FIXED: Wrapped $league in $() to avoid the drive-reference error
    Write-Error "Games fetch error for $($league): $($_.Exception.Message)"
  }
}

$file = "predictions-$(Get-Date -Format 'yyyy-MM-dd').json"

# FIXED: Used ,$allPredictions to force array output in PS 5.1
,$allPredictions | ConvertTo-Json -Depth 10 | Out-File $file -Encoding utf8

# At the end, after saving file
#$topPicks = $allPredictions | Where-Object { $_.edge -ge 30 } | Sort-Object edge -Descending | Select-Object -First 5
#$body = $topPicks | Format-Table | Out-String
#Send-MailMessage -To "shataken@gmail.com" -From "progno@cevict.com" -Subject "Top Edges $(Get-Date -Format 'yyyy-MM-dd')" -Body #body -#SmtpServer "smtp.yourserver.com"

Write-Host "Saved $($allPredictions.Count) predictions to $file" -ForegroundColor Green