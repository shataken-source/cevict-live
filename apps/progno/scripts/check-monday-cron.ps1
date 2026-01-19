# Check Monday Cron Job Status
# This script checks if the Monday cron job has run and shows its status

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Monday Cron Job Status Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check schedule
Write-Host "📅 Schedule:" -ForegroundColor Yellow
Write-Host "  - Runs every Monday at 2:00 PM UTC (14:00)" -ForegroundColor White
Write-Host "  - Cron expression: 0 14 * * 1" -ForegroundColor Gray
Write-Host ""

# Check current time
$now = Get-Date
$dayOfWeek = $now.DayOfWeek
Write-Host "🕐 Current Time:" -ForegroundColor Yellow
Write-Host "  - Date: $($now.ToString('yyyy-MM-dd'))" -ForegroundColor White
Write-Host "  - Day: $dayOfWeek" -ForegroundColor White
Write-Host "  - Time: $($now.ToString('HH:mm:ss'))" -ForegroundColor White
Write-Host ""

# Check if it's Monday
if ($dayOfWeek -eq "Monday") {
    Write-Host "✅ Today is Monday - Cron should run at 2:00 PM UTC" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Today is $dayOfWeek - Cron runs on Mondays only" -ForegroundColor Yellow
}
Write-Host ""

# Check for results directory
$prognoDir = "apps\progno\.progno"
if (Test-Path $prognoDir) {
    Write-Host "📁 Results Directory: Found" -ForegroundColor Green
    $files = Get-ChildItem $prognoDir -File | Sort-Object LastWriteTime -Descending
    if ($files.Count -gt 0) {
        Write-Host "  Recent files:" -ForegroundColor White
        $files | Select-Object -First 5 | ForEach-Object {
            $age = (Get-Date) - $_.LastWriteTime
            $ageStr = if ($age.Days -gt 0) { "$($age.Days) days ago" }
                     elseif ($age.Hours -gt 0) { "$($age.Hours) hours ago" }
                     else { "$($age.Minutes) minutes ago" }
            Write-Host "    - $($_.Name) ($ageStr)" -ForegroundColor Gray
        }

        # Check for latest results
        $latest = $files | Where-Object { $_.Name -like "results-*" } | Select-Object -First 1
        if ($latest) {
            Write-Host ""
            Write-Host "📊 Latest Results File:" -ForegroundColor Yellow
            Write-Host "  - File: $($latest.Name)" -ForegroundColor White
            Write-Host "  - Last Modified: $($latest.LastWriteTime)" -ForegroundColor White
            $age = (Get-Date) - $latest.LastWriteTime
            if ($age.Days -lt 7) {
                Write-Host "  - Status: ✅ Recent (within last week)" -ForegroundColor Green
            } else {
                Write-Host "  - Status: ⚠️  Old (more than a week ago)" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  ⚠️  Directory exists but is empty" -ForegroundColor Yellow
    }
} else {
    Write-Host "📁 Results Directory: Not Found" -ForegroundColor Yellow
    Write-Host "  - This means the Monday cron hasn't run yet or failed" -ForegroundColor Gray
}
Write-Host ""

# Check API endpoint
Write-Host "🔌 Testing API Endpoint:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3008/api/admin/monday" -Method GET -UseBasicParsing -ErrorAction Stop
    $data = $response.Content | ConvertFrom-Json
    Write-Host "  ✅ Endpoint is accessible" -ForegroundColor Green
    if ($data.error) {
        Write-Host "  ⚠️  Error: $($data.error)" -ForegroundColor Yellow
        Write-Host "  💡 You need to set ODDS_API_KEY environment variable" -ForegroundColor Cyan
    } else {
        Write-Host "  ✅ Endpoint working - Last run data:" -ForegroundColor Green
        Write-Host "    - Completed Games: $($data.completedGames)" -ForegroundColor White
        Write-Host "    - Predictions Updated: $($data.predictionsUpdated)" -ForegroundColor White
        Write-Host "    - Win Rate: $([math]::Round($data.winRate * 100, 1))%" -ForegroundColor White
    }
} catch {
    Write-Host "  ❌ Cannot reach endpoint: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  💡 Make sure the dev server is running on port 3008" -ForegroundColor Cyan
}
Write-Host ""

# Manual trigger instructions
Write-Host "🔧 Manual Trigger:" -ForegroundColor Yellow
Write-Host "  You can manually trigger the Monday job:" -ForegroundColor White
Write-Host "  1. Via Admin Page: http://localhost:3008/progno?mode=admin" -ForegroundColor Cyan
Write-Host "     Click 'Run Monday (finals + grading)' button" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Via API:" -ForegroundColor Cyan
Write-Host "     POST http://localhost:3008/api/admin/monday" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan

