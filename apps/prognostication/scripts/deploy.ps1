# ============================================================================
# PROGNOSTICATION DEPLOYMENT SCRIPT
# ============================================================================
# Deploys ONLY the Prognostication app and its dependencies
# NO full repo deployment
# ============================================================================

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "`n🚀 DEPLOYING PROGNOSTICATION APP" -ForegroundColor Green
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

# Install dependencies
Write-Host "📦 Installing dependencies...`n" -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Dependency installation failed!" -ForegroundColor Red
    cd $OriginalLocation
    exit 1
}

# Build the app
Write-Host "`n🔨 Building Next.js app...`n" -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Build failed!" -ForegroundColor Red
    cd $OriginalLocation
    exit 1
}

# Verify build output
if (!(Test-Path ".next")) {
    Write-Host "`n❌ Build output (.next) not found!" -ForegroundColor Red
    cd $OriginalLocation
    exit 1
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "`n✅ PROGNOSTICATION DEPLOYED SUCCESSFULLY!`n" -ForegroundColor Green
Write-Host "📊 BUILD SUMMARY:" -ForegroundColor Yellow
Write-Host "   • Dependencies: Installed" -ForegroundColor Green
Write-Host "   • Build: Success" -ForegroundColor Green
Write-Host "   • Output: .next/" -ForegroundColor Cyan
Write-Host "`n💡 NEXT STEPS:" -ForegroundColor Yellow
Write-Host "   1. Test locally: npm run start" -ForegroundColor White
Write-Host "   2. Deploy to Vercel: vercel --prod" -ForegroundColor White
Write-Host "   3. Verify live data: curl /api/kalshi/picks`n" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# Return to original location
cd $OriginalLocation

