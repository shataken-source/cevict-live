# ==============================================================================
# CREATE MINIMAL DEPLOYMENT PACKAGE FOR WINDOWS SERVICE
# ==============================================================================
# Creates a minimal package with only files needed for the Windows service
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     📦 CREATING MINIMAL DEPLOYMENT PACKAGE                  ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$deployDir = Join-Path $scriptDir "deploy"
$deployAlphaHunter = Join-Path $deployDir "alpha-hunter"

# Clean and create deploy directory
if (Test-Path $deployDir) {
    Write-Host "🗑️  Cleaning existing deploy directory..." -ForegroundColor Yellow
    Remove-Item -Path $deployDir -Recurse -Force
}
New-Item -ItemType Directory -Path $deployAlphaHunter -Force | Out-Null

Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow

# 1. Service installation scripts
Write-Host "   Copying service scripts..." -ForegroundColor Gray
Copy-Item "$scriptDir\install-windows-service.ps1" -Destination $deployAlphaHunter
Copy-Item "$scriptDir\uninstall-windows-service.ps1" -Destination $deployAlphaHunter
Copy-Item "$scriptDir\WINDOWS_SERVICE_SETUP.md" -Destination $deployAlphaHunter

# 2. Package files
Write-Host "   Copying package files..." -ForegroundColor Gray
Copy-Item "$scriptDir\package.json" -Destination $deployAlphaHunter
Copy-Item "$scriptDir\tsconfig.json" -Destination $deployAlphaHunter

# 3. Source files - only what's needed for live-trader-24-7.ts
Write-Host "   Copying source files..." -ForegroundColor Gray
$srcDir = Join-Path $deployAlphaHunter "src"
New-Item -ItemType Directory -Path $srcDir -Force | Out-Null

# Main bot file
Copy-Item "$scriptDir\src\live-trader-24-7.ts" -Destination $srcDir

# Core dependencies
$coreFiles = @(
    "bot-manager.ts",
    "dashboard-reporter.ts",
    "fund-manager.ts",
    "types.ts"
)

foreach ($file in $coreFiles) {
    if (Test-Path "$scriptDir\src\$file") {
        Copy-Item "$scriptDir\src\$file" -Destination $srcDir
    }
}

# Exchanges
$exchangesDir = Join-Path $srcDir "exchanges"
New-Item -ItemType Directory -Path $exchangesDir -Force | Out-Null
Copy-Item "$scriptDir\src\exchanges\coinbase.ts" -Destination $exchangesDir

# Intelligence modules
$intelDir = Join-Path $srcDir "intelligence"
New-Item -ItemType Directory -Path $intelDir -Force | Out-Null
$intelFiles = @(
    "kalshi-trader.ts",
    "prognostication-sync.ts",
    "category-learners.ts",
    "data-aggregator.ts",
    "derivatives-expert.ts",
    "entertainment-expert.ts",
    "futures-expert.ts",
    "gme-specialist.ts",
    "historical-knowledge.ts",
    "market-learner.ts",
    "progno-integration.ts",
    "progno-massager.ts"
)

foreach ($file in $intelFiles) {
    if (Test-Path "$scriptDir\src\intelligence\$file") {
        Copy-Item "$scriptDir\src\intelligence\$file" -Destination $intelDir
    }
}

# Lib modules
$libDir = Join-Path $srcDir "lib"
New-Item -ItemType Directory -Path $libDir -Force | Out-Null
Copy-Item "$scriptDir\src\lib\supabase-memory.ts" -Destination $libDir

# 4. Create .env.local.example
Write-Host "   Creating .env.local.example..." -ForegroundColor Gray
$envExample = @"
# Alpha-Hunter 24/7 Bot Configuration
# Copy this to C:\cevict-live\.env.local and fill in your API keys

# Kalshi API (Required)
KALSHI_API_KEY_ID=your_kalshi_api_key_id
KALSHI_PRIVATE_KEY=your_kalshi_private_key
KALSHI_ENV=demo

# Coinbase API (Required)
COINBASE_API_KEY=your_coinbase_api_key
COINBASE_API_SECRET=your_coinbase_api_secret

# Anthropic API (Required for AI analysis)
ANTHROPIC_API_KEY=your_anthropic_api_key

# Supabase (Required for predictions storage)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Prognostication Sync (Optional)
PROGNOSTICATION_URL=http://localhost:3005
PROGNO_INTERNAL_API_KEY=dev-key-12345
"@
$envExample | Out-File -FilePath (Join-Path $deployDir ".env.local.example") -Encoding UTF8

# 5. Create README
Write-Host "   Creating README..." -ForegroundColor Gray
$readme = @"
# Alpha-Hunter 24/7 Bot - Deployment Package

This is a minimal deployment package containing only the files necessary to run the Alpha-Hunter bot as a Windows service.

## Quick Start

1. **Extract this package** to your desired location (e.g., `C:\alpha-hunter`)

2. **Install dependencies:**
   ```powershell
   cd C:\alpha-hunter\alpha-hunter
   npm install
   ```

3. **Configure environment:**
   - Copy `.env.local.example` to `C:\cevict-live\.env.local`
   - Fill in your API keys

4. **Install Windows service:**
   ```powershell
   # Run PowerShell as Administrator
   cd C:\alpha-hunter\alpha-hunter
   .\install-windows-service.ps1
   ```

## What's Included

- ✅ Service installation scripts
- ✅ Bot source code (live-trader-24-7.ts and dependencies)
- ✅ Package configuration (package.json, tsconfig.json)
- ✅ Setup documentation

## What's NOT Included

- ❌ node_modules (install with `npm install`)
- ❌ .env.local (create from .env.local.example)
- ❌ Other apps/projects
- ❌ Test files
- ❌ Documentation files (except setup guide)

## Dependencies

After extracting, run `npm install` to install:
- @anthropic-ai/sdk
- @supabase/supabase-js
- dotenv
- tsx
- And other required packages

## Support

See `WINDOWS_SERVICE_SETUP.md` for detailed setup instructions and troubleshooting.
"@
$readme | Out-File -FilePath (Join-Path $deployDir "README.md") -Encoding UTF8

# 6. Create .gitignore for deployment
Write-Host "   Creating .gitignore..." -ForegroundColor Gray
$gitignore = @"
node_modules/
.env.local
logs/
dist/
*.log
"@
$gitignore | Out-File -FilePath (Join-Path $deployAlphaHunter ".gitignore") -Encoding UTF8

# 7. Create deployment instructions
Write-Host "   Creating deployment instructions..." -ForegroundColor Gray
$deployInstructions = @"
# DEPLOYMENT INSTRUCTIONS

## Step 1: Extract Package
Extract this ZIP to your deployment location (e.g., `C:\alpha-hunter`)

## Step 2: Install Dependencies
```powershell
cd C:\alpha-hunter\alpha-hunter
npm install
```

## Step 3: Configure Environment
1. Copy `.env.local.example` to `C:\cevict-live\.env.local`
2. Edit `C:\cevict-live\.env.local` and add your API keys:
   - KALSHI_API_KEY_ID
   - KALSHI_PRIVATE_KEY
   - COINBASE_API_KEY
   - COINBASE_API_SECRET
   - ANTHROPIC_API_KEY
   - NEXT_PUBLIC_SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY

## Step 4: Install Windows Service
```powershell
# Run PowerShell as Administrator
cd C:\alpha-hunter\alpha-hunter
.\install-windows-service.ps1
```

## Step 5: Verify
```powershell
Get-Service -Name AlphaHunter247
```

The service should show as "Running".

## Uninstall
```powershell
.\uninstall-windows-service.ps1
```
"@
$deployInstructions | Out-File -FilePath (Join-Path $deployDir "DEPLOYMENT_INSTRUCTIONS.md") -Encoding UTF8

Write-Host "`n✅ Deployment package created at: $deployDir" -ForegroundColor Green
Write-Host "`nPackage Contents:" -ForegroundColor Cyan
Get-ChildItem -Path $deployDir -Recurse -File | Select-Object FullName | ForEach-Object {
    $relative = $_.FullName.Replace($deployDir, "").TrimStart('\')
    Write-Host "   $relative" -ForegroundColor Gray
}

Write-Host "`n📦 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Review the package contents" -ForegroundColor White
Write-Host "   2. Create a ZIP file of the 'deploy' folder" -ForegroundColor White
Write-Host "   3. Deploy to target machine" -ForegroundColor White
Write-Host "   4. Extract and follow DEPLOYMENT_INSTRUCTIONS.md" -ForegroundColor White
Write-Host "`n"

