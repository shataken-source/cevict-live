# Raw games + scores snapshot (v2 games API). Run after games finish to get scores.
# Output: results-YYYY-MM-DD.json with League, GameId, HomeTeam, AwayTeam, HomeScore, AwayScore, Winner, Completed.
# NOTE: This is NOT the same as the daily-results cron (which grades predictions and writes { date, results: GradedPick[], summary }).
Set-Location "C:\cevict-live\apps\progno"

$leagues = @('nhl', 'ncaab', 'nba', 'nfl', 'ncaaf', 'mlb')
$results = @()

foreach ($league in $leagues) {
  try {
    $gamesResponse = Invoke-RestMethod -Uri "http://localhost:3008/api/progno/v2?action=games&sport=$league" -Method Get

    if ($gamesResponse.success) {
      foreach ($game in $gamesResponse.data) {
        $scoreInfo = $game.scoreInfo
        
        # Access properties safely
        $homeScore = if ($scoreInfo) { $scoreInfo.homeScore } else { $null }
        $awayScore = if ($scoreInfo) { $scoreInfo.awayScore } else { $null }
        
        # FIXED: Use -and instead of &&. 
        # Removed "&& $false" which was forcing the value to False.
        $completed = if ($scoreInfo) { $scoreInfo.completed } else { $false }

        $winner = 'Unknown'
        if ($null -ne $homeScore -and $null -ne $awayScore) {
          if ([int]$homeScore -gt [int]$awayScore) { $winner = $game.homeTeam }
          elseif ([int]$awayScore -gt [int]$homeScore) { $winner = $game.awayTeam }
          else { $winner = 'Tie' }
        }

        $results += [PSCustomObject]@{
          League     = $league
          GameId     = $game.id
          HomeTeam   = $game.homeTeam
          AwayTeam   = $game.awayTeam
          HomeScore  = $homeScore
          AwayScore  = $awayScore
          Winner     = $winner
          Completed  = $completed
          Timestamp  = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
      }
    }
  } catch {
    Write-Warning "Error fetching $league results: $($_.Exception.Message)"
  }
}

$file = "results-$(Get-Date -Format 'yyyy-MM-dd').json"
# Ensure results is an array even if 1 item, then convert
$results | ConvertTo-Json -Depth 10 | Out-File $file -Encoding utf8

Write-Host "Saved $($results.Count) results to $file" -ForegroundColor Green
