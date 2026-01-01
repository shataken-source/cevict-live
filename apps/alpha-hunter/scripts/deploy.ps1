# ============================================================================
# ALPHA-HUNTER DEPLOYMENT SCRIPT
# ============================================================================
# Deploys ONLY the Alpha-Hunter bot and its dependencies
# NO full repo deployment
# ============================================================================

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "`n🚀 DEPLOYING ALPHA-HUNTER BOT" -ForegroundColor Green
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# Store original location
$OriginalLocation = Get-Location

# Navigate to app directory
$AppPath = Join-Path $PSScriptRoot ".."
cd $AppPath

Write-Host "📍 Working Directory: $(Get-Location)`n" -ForegroundColor White

# Check for required files
if (!(Test-Path "package.json")) {
    Write-Host "❌ ERROR: package.json not found!" -ForegroundColor Red
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Yellow
    cd $OriginalLocation
    exit 1
}

# Check for .env.local
if (!(Test-Path ".env.local")) {
    Write-Host "⚠️  WARNING: .env.local not found!" -ForegroundColor Yellow
    Write-Host "   Bot will not function without API keys`n" -ForegroundColor Yellow
}

# Install dependencies
Write-Host "📦 Installing dependencies...`n" -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Dependency installation failed!" -ForegroundColor Red
    cd $OriginalLocation
    exit 1
}

# Build the TypeScript code
Write-Host "`n🔨 Compiling TypeScript...`n" -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Build failed!" -ForegroundColor Red
    cd $OriginalLocation
    exit 1
}

# Verify build output
if (!(Test-Path "dist")) {
    Write-Host "`n❌ Build output (dist) not found!" -ForegroundColor Red
    cd $OriginalLocation
    exit 1
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "`n✅ ALPHA-HUNTER DEPLOYED SUCCESSFULLY!`n" -ForegroundColor Green
Write-Host "📊 BUILD SUMMARY:" -ForegroundColor Yellow
Write-Host "   • Dependencies: Installed" -ForegroundColor Green
Write-Host "   • Build: Success" -ForegroundColor Green
Write-Host "   • Output: dist/" -ForegroundColor Cyan
Write-Host "`n💡 NEXT STEPS:" -ForegroundColor Yellow
Write-Host "   1. Start bot: npm run 24-7" -ForegroundColor White
Write-Host "   2. Or use PM2: pm2 start dist/live-trader-24-7.js" -ForegroundColor White
Write-Host "   3. Monitor logs: pm2 logs alpha-hunter`n" -ForegroundColor White
Write-Host "⚠️  CRITICAL REMINDERS:" -ForegroundColor Yellow
Write-Host "   • Verify .env.local has all API keys" -ForegroundColor Red
Write-Host "   • Check Coinbase & Kalshi connections" -ForegroundColor Red
Write-Host "   • Ensure Supabase credentials are valid" -ForegroundColor Red
Write-Host "   • NO FALLBACK DATA - Real API only!`n" -ForegroundColor Red
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# Return to original location
cd $OriginalLocation

