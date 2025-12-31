# ================================================================
# PROGNOSTICATION - AUTOMATED SETUP
# ================================================================

Write-Host "`n=== PROGNOSTICATION AUTOMATED SETUP ===" -ForegroundColor Cyan

$PROJECT_DIR = "C:\gcc\cevict-app\cevict-monorepo\apps\prognostication"

# ================================================================
# STEP 1: CHECK/COPY SOURCE FILES
# ================================================================

Write-Host "`n[1/4] Checking for source files..." -ForegroundColor Green

$sourceLocations = @(
    "$env:USERPROFILE\Downloads\prognostication-complete",
    "$PROJECT_DIR\..\prognostication-complete",
    "C:\prognostication-complete"
)

$sourceFound = $false
foreach ($location in $sourceLocations) {
    if (Test-Path $location) {
        Write-Host "   Found source files at: $location" -ForegroundColor Green
        Write-Host "   Copying files..." -ForegroundColor Yellow
        
        # Copy folders
        Copy-Item "$location\app" "$PROJECT_DIR\app" -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item "$location\components" "$PROJECT_DIR\components" -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item "$location\lib" "$PROJECT_DIR\lib" -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item "$location\scripts" "$PROJECT_DIR\scripts" -Recurse -Force -ErrorAction SilentlyContinue
        
        # Copy root files
        Copy-Item "$location\*.ts" "$PROJECT_DIR\" -Force -ErrorAction SilentlyContinue
        Copy-Item "$location\*.js" "$PROJECT_DIR\" -Force -ErrorAction SilentlyContinue
        Copy-Item "$location\*.json" "$PROJECT_DIR\" -Force -ErrorAction SilentlyContinue
        Copy-Item "$location\*.md" "$PROJECT_DIR\" -Force -ErrorAction SilentlyContinue
        
        Write-Host "   Source files copied!" -ForegroundColor Green
        $sourceFound = $true
        break
    }
}

if (-not $sourceFound) {
    Write-Host "   Source files not found!" -ForegroundColor Yellow
    Write-Host "   Please download prognostication-complete folder from chat" -ForegroundColor Yellow
    Write-Host "   And place it in one of these locations:" -ForegroundColor Yellow
    foreach ($loc in $sourceLocations) {
        Write-Host "      - $loc" -ForegroundColor White
    }
    Write-Host "`n   Press Enter when files are downloaded..." -ForegroundColor Cyan
    Read-Host
}

# ================================================================
# STEP 2: CONFIGURE ENVIRONMENT
# ================================================================

Write-Host "`n[2/4] Configuring environment..." -ForegroundColor Green

$envPath = "$PROJECT_DIR\.env.local"

if (Test-Path $envPath) {
    Write-Host "   .env.local already exists" -ForegroundColor Yellow
    $overwrite = Read-Host "   Overwrite it? (y/n)"
    if ($overwrite -ne 'y') {
        Write-Host "   Skipping environment setup" -ForegroundColor Yellow
    } else {
        Remove-Item $envPath
    }
}

if (-not (Test-Path $envPath)) {
    Write-Host "`n   Enter your Supabase credentials:" -ForegroundColor Cyan
    Write-Host "   (Get from: Supabase -> Settings -> API)" -ForegroundColor White
    
    $supabaseUrl = Read-Host "`n   Supabase URL (https://xxx.supabase.co)"
    $supabaseAnonKey = Read-Host "   Supabase Anon Key (eyJ...)"
    $supabaseServiceKey = Read-Host "   Supabase Service Role Key (eyJ...)"
    
    $envContent = @"
# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabaseAnonKey
SUPABASE_SERVICE_ROLE_KEY=$supabaseServiceKey

# STRIPE (optional - add later)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PREMIUM_MONTHLY=
STRIPE_PRICE_PREMIUM_YEARLY=
STRIPE_PRICE_VIP_MONTHLY=
STRIPE_PRICE_VIP_YEARLY=

# GOOGLE ADS
NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID=ca-pub-0940073536675562

# PROGNO
PROGNO_OUTPUT_DIR=../progno/output

# APP
NEXT_PUBLIC_APP_URL=http://localhost:3005
"@
    
    Set-Content -Path $envPath -Value $envContent
    Write-Host "   Environment configured!" -ForegroundColor Green
}

# ================================================================
# STEP 3: INSTALL DEPENDENCIES
# ================================================================

Write-Host "`n[3/4] Installing dependencies..." -ForegroundColor Green

Set-Location $PROJECT_DIR

if (Test-Path "node_modules") {
    Write-Host "   node_modules already exists, skipping..." -ForegroundColor Yellow
} else {
    Write-Host "   Running npm install (this may take a few minutes)..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Dependencies installed!" -ForegroundColor Green
    } else {
        Write-Host "   npm install had issues, but continuing..." -ForegroundColor Yellow
    }
}

# ================================================================
# STEP 4: CREATE ADMIN HELPER SCRIPT
# ================================================================

Write-Host "`n[4/4] Creating helper scripts..." -ForegroundColor Green

# Create admin SQL helper
$adminSql = @'
-- Run this in Supabase SQL Editor after you sign up
-- Replace 'your-email@example.com' with YOUR email

UPDATE profiles
SET is_admin = true
WHERE email = 'your-email@example.com';

-- You should see: "Success. 1 rows affected"
-- Then refresh the website and click the settings icon
'@
Set-Content -Path "$PROJECT_DIR\MAKE_ADMIN.sql" -Value $adminSql

Write-Host "   Created MAKE_ADMIN.sql" -ForegroundColor Green

# ================================================================
# COMPLETION
# ================================================================

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETE!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

Write-Host "`n NEXT STEPS:" -ForegroundColor Cyan

Write-Host "`n1. Start the development server:" -ForegroundColor Yellow
Write-Host "   cd $PROJECT_DIR" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White

Write-Host "`n2. Open in browser:" -ForegroundColor Yellow
Write-Host "   http://localhost:3005" -ForegroundColor White

Write-Host "`n3. Create your account:" -ForegroundColor Yellow
Write-Host "   - Click Sign Up" -ForegroundColor White
Write-Host "   - Enter email/password" -ForegroundColor White
Write-Host "   - Check email for verification link" -ForegroundColor White

Write-Host "`n4. Make yourself admin:" -ForegroundColor Yellow
Write-Host "   - Open Supabase SQL Editor" -ForegroundColor White
Write-Host "   - Open MAKE_ADMIN.sql (created in project folder)" -ForegroundColor White
Write-Host "   - Replace email with yours and run it" -ForegroundColor White

Write-Host "`n5. Access admin dashboard:" -ForegroundColor Yellow
Write-Host "   - Refresh website" -ForegroundColor White
Write-Host "   - Click settings icon in navbar" -ForegroundColor White
Write-Host "   - Manage users and picks at /admin" -ForegroundColor White

Write-Host "`nYou are ready to go!" -ForegroundColor Green
Write-Host ""

# Ask if they want to start dev server now
$startNow = Read-Host "`nStart development server now? (y/n)"
if ($startNow -eq 'y') {
    Write-Host "`nStarting server..." -ForegroundColor Green
    Write-Host "Press Ctrl C to stop" -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    npm run dev
}