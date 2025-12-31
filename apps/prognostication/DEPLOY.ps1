# PROGNOSTICATION DEPLOYMENT SCRIPT
# Deploys to Vercel and manages environment variables

param(
    [switch]$SkipBuild = $false,
    [switch]$CheckKeys = $true
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Magenta
Write-Host "🚀 PROGNOSTICATION DEPLOYMENT" -ForegroundColor Magenta
Write-Host "=========================================" -ForegroundColor Magenta
Write-Host ""

$APP_DIR = "apps\prognostication"
$ADMIN_PHONE = Read-Host "Enter your phone number for SMS notifications (e.g., +1234567890)"

# Step 1: Check environment variables
if ($CheckKeys) {
    Write-Host "📋 Step 1: Checking environment variables..." -ForegroundColor Yellow

    $requiredVars = @(
        "NEXT_PUBLIC_SITE_URL",
        "PROGNO_BASE_URL",
        "SINCH_SERVICE_PLAN_ID",
        "SINCH_API_TOKEN",
        "SINCH_FROM_NUMBER",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "STRIPE_SECRET_KEY"
    )

    $missingVars = @()

    foreach ($var in $requiredVars) {
        $value = [Environment]::GetEnvironmentVariable($var, "Process")
        if (-not $value) {
            $missingVars += $var
            Write-Host "  ⚠️  Missing: $var" -ForegroundColor Yellow
        } else {
            Write-Host "  ✅ Found: $var" -ForegroundColor Green
        }
    }

    if ($missingVars.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠️  Missing environment variables detected!" -ForegroundColor Yellow
        Write-Host "   These will need to be set in Vercel dashboard" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Missing variables:" -ForegroundColor Yellow
        $missingVars | ForEach-Object { Write-Host "   - $_" -ForegroundColor Gray }
        Write-Host ""

        $continue = Read-Host "Continue with deployment? (y/n)"
        if ($continue -ne "y") {
            Write-Host "❌ Deployment cancelled" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✅ All required environment variables found!" -ForegroundColor Green
    }
    Write-Host ""
}

# Step 2: Add admin phone number to environment
Write-Host "📱 Step 2: Setting up admin phone number..." -ForegroundColor Yellow
if ($ADMIN_PHONE) {
    Write-Host "   Admin phone: $ADMIN_PHONE" -ForegroundColor Gray

    # Try to add to Vercel environment variables automatically
    Write-Host "   Attempting to add ADMIN_PHONE_NUMBER to Vercel..." -ForegroundColor Gray
    Set-Location $APP_DIR

    $vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
    if ($vercelInstalled) {
        try {
            # Add environment variable to Vercel
            $envResult = vercel env add ADMIN_PHONE_NUMBER production 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ ADMIN_PHONE_NUMBER added to Vercel" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  Could not auto-add (may need manual setup)" -ForegroundColor Yellow
                Write-Host "   ⚠️  Add ADMIN_PHONE_NUMBER=$ADMIN_PHONE to Vercel environment variables manually" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   ⚠️  Could not auto-add (may need manual setup)" -ForegroundColor Yellow
            Write-Host "   ⚠️  Add ADMIN_PHONE_NUMBER=$ADMIN_PHONE to Vercel environment variables manually" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️  Vercel CLI not found - add ADMIN_PHONE_NUMBER=$ADMIN_PHONE manually" -ForegroundColor Yellow
    }

    Set-Location ..\..
} else {
    Write-Host "   ⚠️  No phone number provided - SMS notifications will not work" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Build
if (-not $SkipBuild) {
    Write-Host "📦 Step 3: Building application..." -ForegroundColor Yellow
    Set-Location $APP_DIR

    try {
        Write-Host "   Installing dependencies..." -ForegroundColor Gray
        pnpm install --frozen-lockfile

        Write-Host "   Building..." -ForegroundColor Gray
        pnpm build

        if ($LASTEXITCODE -ne 0) {
            throw "Build failed"
        }

        Write-Host "✅ Build successful!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Build failed: $_" -ForegroundColor Red
        Set-Location ..\..
        exit 1
    } finally {
        Set-Location ..\..
    }
    Write-Host ""
}

# Step 4: Deploy to Vercel
Write-Host "🚀 Step 4: Deploying to Vercel..." -ForegroundColor Yellow
Set-Location $APP_DIR

# Check if Vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Host "   Installing Vercel CLI..." -ForegroundColor Gray
    npm install -g vercel
}

Write-Host "   Running: vercel --prod" -ForegroundColor Gray
vercel --prod --yes

Set-Location ..\..

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""

# Step 5: Environment variables reminder
Write-Host "📋 Step 5: Environment Variables Checklist" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Make sure these are set in Vercel dashboard:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Required:" -ForegroundColor White
Write-Host "  ✓ NEXT_PUBLIC_SITE_URL" -ForegroundColor Gray
Write-Host "  ✓ PROGNO_BASE_URL" -ForegroundColor Gray
Write-Host "  ✓ SINCH_SERVICE_PLAN_ID" -ForegroundColor Gray
Write-Host "  ✓ SINCH_API_TOKEN" -ForegroundColor Gray
Write-Host "  ✓ SINCH_FROM_NUMBER" -ForegroundColor Gray
Write-Host "  ✓ SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)" -ForegroundColor Gray
Write-Host "  ✓ SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Gray
Write-Host "  ✓ STRIPE_SECRET_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "Optional (for SMS notifications):" -ForegroundColor White
if ($ADMIN_PHONE) {
    Write-Host "  ✓ ADMIN_PHONE_NUMBER=$ADMIN_PHONE" -ForegroundColor Gray
} else {
    Write-Host "  ⚠️  ADMIN_PHONE_NUMBER (your phone number for pick notifications)" -ForegroundColor Yellow
}
Write-Host "  ✓ ADMIN_PASSWORD (for protected endpoints)" -ForegroundColor Gray
Write-Host "  ✓ PROGNOSTICATION_URL (for Progno to send SMS notifications)" -ForegroundColor Gray
Write-Host ""

# Step 6: Test endpoints
Write-Host "🧪 Step 6: Testing Endpoints" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "After deployment, test these endpoints:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Send pick notification:" -ForegroundColor White
Write-Host "   POST /api/sms/notify-pick" -ForegroundColor Gray
Write-Host "   Body: phoneNumber, game, pick, confidence, edge, etc." -ForegroundColor Gray
Write-Host ""
Write-Host "2. Get daily summary:" -ForegroundColor White
Write-Host "   POST /api/sms/daily-summary-image" -ForegroundColor Gray
Write-Host "   Body: phoneNumber" -ForegroundColor Gray
Write-Host ""
Write-Host "3. View today picks:" -ForegroundColor White
Write-Host "   GET /api/picks/today" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Deployment process complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Verify environment variables in Vercel dashboard" -ForegroundColor White
Write-Host "  2. Test SMS notifications with your phone number" -ForegroundColor White
Write-Host "  3. Set up cron jobs for daily summaries" -ForegroundColor White
Write-Host "  4. Integrate pick notifications into Progno prediction engine" -ForegroundColor White
Write-Host ""

