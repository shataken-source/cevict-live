# Start Both Trading Bots - Kalshi + Coinbase
# This script starts the 24/7 live trader with both platforms enabled

Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🚀 STARTING 24/7 TRADING BOT - KALSHI + COINBASE        ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  WARNING: .env.local not found!" -ForegroundColor Yellow
    Write-Host "   Create .env.local with your API keys:" -ForegroundColor Yellow
    Write-Host "   - KALSHI_API_KEY_ID" -ForegroundColor Yellow
    Write-Host "   - KALSHI_PRIVATE_KEY" -ForegroundColor Yellow
    Write-Host "   - COINBASE_API_KEY" -ForegroundColor Yellow
    Write-Host "   - ANTHROPIC_API_KEY" -ForegroundColor Yellow
    Write-Host ""
}

# Verify API keys are set
$envContent = Get-Content ".env.local" -ErrorAction SilentlyContinue
if ($envContent) {
    $hasKalshi = $envContent | Select-String -Pattern "KALSHI_API_KEY_ID"
    $hasCoinbase = $envContent | Select-String -Pattern "COINBASE_API_KEY"
    
    if (-not $hasKalshi) {
        Write-Host "⚠️  KALSHI_API_KEY_ID not found in .env.local" -ForegroundColor Yellow
    }
    if (-not $hasCoinbase) {
        Write-Host "⚠️  COINBASE_API_KEY not found in .env.local" -ForegroundColor Yellow
    }
}

Write-Host "📊 Trading Configuration:" -ForegroundColor White
Write-Host "   Crypto: Every 30 seconds" -ForegroundColor Green
Write-Host "   Kalshi: Every 60 seconds" -ForegroundColor Magenta
Write-Host "   Max Trade Size: `$5" -ForegroundColor Yellow
Write-Host "   Daily Spending Limit: `$50" -ForegroundColor Yellow
Write-Host "   Daily Loss Limit: `$25" -ForegroundColor Red
Write-Host ""

Write-Host "🤖 Starting 24/7 Live Trader..." -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop`n" -ForegroundColor Gray

# Start the trader
npm run 24-7

