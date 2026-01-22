# PopThePopcorn Setup Verification Script
# Run this to verify your deployment is properly configured

Write-Host "🔍 PopThePopcorn Setup Verification" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Must run from apps/popthepopcorn directory" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Running from correct directory" -ForegroundColor Green
Write-Host ""

# 1. Check environment variables (local)
Write-Host "📋 Checking Local Environment Variables..." -ForegroundColor Yellow
$envVars = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
)

$optionalVars = @(
    "PERPLEXITY_API_KEY",
    "SINCH_API_KEY",
    "TWITTER_BEARER_TOKEN",
    "CRON_SECRET"
)

$missing = @()
foreach ($var in $envVars) {
    if (-not (Get-Item "Env:$var" -ErrorAction SilentlyContinue)) {
        $missing += $var
        Write-Host "  ❌ $var - MISSING" -ForegroundColor Red
    } else {
        Write-Host "  ✅ $var - Set" -ForegroundColor Green
    }
}

foreach ($var in $optionalVars) {
    if (Get-Item "Env:$var" -ErrorAction SilentlyContinue) {
        Write-Host "  ✅ $var - Set (optional)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $var - Not set (optional)" -ForegroundColor Yellow
    }
}

Write-Host ""
if ($missing.Count -gt 0) {
    Write-Host "⚠️  Missing required environment variables!" -ForegroundColor Yellow
    Write-Host "   Set these in Vercel Dashboard → Settings → Environment Variables" -ForegroundColor Yellow
    Write-Host ""
}

# 2. Check if Supabase schema exists
Write-Host "📋 Checking Supabase Schema Files..." -ForegroundColor Yellow
if (Test-Path "supabase/schema.sql") {
    Write-Host "  ✅ schema.sql exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ schema.sql missing" -ForegroundColor Red
}

if (Test-Path "supabase/rls-policies.sql") {
    Write-Host "  ✅ rls-policies.sql exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ rls-policies.sql missing" -ForegroundColor Red
}

Write-Host ""

# 3. Check API routes
Write-Host "📋 Checking API Routes..." -ForegroundColor Yellow
$apiRoutes = @(
    "app/api/headlines/route.ts",
    "app/api/cron/scrape/route.ts",
    "app/api/admin/scraper/route.ts"
)

foreach ($route in $apiRoutes) {
    if (Test-Path $route) {
        Write-Host "  ✅ $route" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $route - MISSING" -ForegroundColor Red
    }
}

Write-Host ""

# 4. Summary
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "==========" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Set missing environment variables in Vercel Dashboard" -ForegroundColor White
Write-Host "2. Run supabase/schema.sql in Supabase SQL Editor" -ForegroundColor White
Write-Host "3. Run supabase/rls-policies.sql in Supabase SQL Editor" -ForegroundColor White
Write-Host "4. Refresh Supabase schema cache (Settings → API → Reload schema cache)" -ForegroundColor White
Write-Host "5. Trigger scraper: Visit /admin or wait 5 min for cron" -ForegroundColor White
Write-Host ""
