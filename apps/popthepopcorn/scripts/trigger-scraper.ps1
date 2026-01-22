# Trigger PopThePopcorn Scraper
# This script helps you trigger the scraper manually

param(
    [string]$Method = "cron",  # "cron" or "admin"
    [string]$Url = "https://www.popthepopcorn.com",
    [string]$CronSecret = ""
)

Write-Host "🍿 PopThePopcorn Scraper Trigger" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

if ($Method -eq "cron") {
    Write-Host "Triggering via Cron endpoint..." -ForegroundColor Yellow
    
    $headers = @{}
    if ($CronSecret) {
        $headers["Authorization"] = "Bearer $CronSecret"
        Write-Host "Using CRON_SECRET for authentication" -ForegroundColor Green
    } else {
        Write-Host "⚠️  No CRON_SECRET provided (will fail if CRON_SECRET is set in Vercel)" -ForegroundColor Yellow
    }
    
    try {
        $response = Invoke-WebRequest -Uri "$Url/api/cron/scrape" -Method GET -Headers $headers -UseBasicParsing
        Write-Host "✅ Scraper triggered successfully!" -ForegroundColor Green
        Write-Host "   Response: $($response.Content)" -ForegroundColor White
        Write-Host ""
        Write-Host "⏳ Wait 1-2 minutes for headlines to appear" -ForegroundColor Yellow
    } catch {
        Write-Host "❌ Error triggering scraper:" -ForegroundColor Red
        Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host ""
            Write-Host "💡 Tip: Set CRON_SECRET parameter:" -ForegroundColor Yellow
            Write-Host "   .\trigger-scraper.ps1 -CronSecret 'your-secret'" -ForegroundColor White
        }
    }
} elseif ($Method -eq "admin") {
    Write-Host "⚠️  Admin endpoint requires authentication" -ForegroundColor Yellow
    Write-Host "   Visit $Url/admin and use the UI to trigger scraper" -ForegroundColor White
} else {
    Write-Host "❌ Invalid method. Use 'cron' or 'admin'" -ForegroundColor Red
}

Write-Host ""
