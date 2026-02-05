# PopThePopcorn Deployment Script for Vercel
# Run this script to deploy to Vercel

Write-Host "🍿 PopThePopcorn Deployment Script" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
    Write-Host "✅ Vercel CLI installed" -ForegroundColor Green
}

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Please run this script from the popthepopcorn directory." -ForegroundColor Red
    exit 1
}

# Verify build works
Write-Host "🔨 Building project..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Please fix errors before deploying." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build successful" -ForegroundColor Green
Write-Host ""

# Check environment variables
Write-Host "📋 Required Environment Variables:" -ForegroundColor Cyan
Write-Host "  - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Yellow
Write-Host "  - NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Yellow
Write-Host "  - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Yellow
Write-Host "  - ADMIN_PASSWORD" -ForegroundColor Yellow
Write-Host ""
Write-Host "Optional:" -ForegroundColor Cyan
Write-Host "  - CRON_SECRET (recommended)" -ForegroundColor Yellow
Write-Host "  - SINCH_SERVICE_PLAN_ID" -ForegroundColor Yellow
Write-Host "  - SINCH_API_TOKEN" -ForegroundColor Yellow
Write-Host "  - SINCH_FROM_NUMBER" -ForegroundColor Yellow
Write-Host "  - SINCH_REGION" -ForegroundColor Yellow
Write-Host ""

$continue = Read-Host "Have you set all required environment variables in Vercel? (y/n)"
if ($continue -ne "y" -and $continue -ne "Y") {
    Write-Host "⚠️  Please set environment variables in Vercel Dashboard first:" -ForegroundColor Yellow
    Write-Host "   1. Go to your Vercel project settings" -ForegroundColor Yellow
    Write-Host "   2. Navigate to Environment Variables" -ForegroundColor Yellow
    Write-Host "   3. Add all required variables" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Or use: vercel env add VARIABLE_NAME" -ForegroundColor Yellow
    exit 0
}

# Deploy
Write-Host ""
Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Cyan
vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Enable cron jobs in Vercel Dashboard → Settings → Cron Jobs" -ForegroundColor Yellow
    Write-Host "  2. Test your deployment URL" -ForegroundColor Yellow
    Write-Host "  3. Visit /admin/login to test admin dashboard" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "❌ Deployment failed. Check the error messages above." -ForegroundColor Red
    exit 1
}
