# ============================================================================
# DEPLOYMENT SCRIPTS - APP-ONLY DEPLOYMENT (NOT WHOLE REPO)
# ============================================================================
# These scripts deploy ONLY the specific app and its dependencies
# NO full repo deployment - keeps deployments fast and clean
# ============================================================================

## PROGNOSTICATION DEPLOYMENT

### Build Script
```powershell
# apps/prognostication/scripts/deploy.ps1
Write-Host "`n🚀 DEPLOYING PROGNOSTICATION APP ONLY`n" -ForegroundColor Cyan

# Navigate to app directory
cd $PSScriptRoot/..

# Install dependencies for this app only
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Build the app
Write-Host "🔨 Building app..." -ForegroundColor Yellow
npm run build

# Check for build errors
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Prognostication deployed successfully!`n" -ForegroundColor Green
```

## ALPHA-HUNTER DEPLOYMENT

### Build Script
```powershell
# apps/alpha-hunter/scripts/deploy.ps1
Write-Host "`n🚀 DEPLOYING ALPHA-HUNTER BOT ONLY`n" -ForegroundColor Cyan

# Navigate to app directory
cd $PSScriptRoot/..

# Install dependencies for this app only
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Compile TypeScript
Write-Host "🔨 Compiling TypeScript..." -ForegroundColor Yellow
npm run build

# Check for build errors
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Alpha-Hunter deployed successfully!`n" -ForegroundColor Green
```

## PRODUCTION DEPLOYMENT (VERCEL/NETLIFY)

### Vercel Configuration
```json
// apps/prognostication/vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "NEXT_PUBLIC_KALSHI_REFERRAL_CODE": "@NEXT_PUBLIC_KALSHI_REFERRAL_CODE"
  },
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

### Deploy Commands
```bash
# Deploy Prognostication to Vercel (app-only)
cd apps/prognostication
vercel --prod

# Deploy Alpha-Hunter to VPS (app-only)
cd apps/alpha-hunter
npm run build
pm2 start dist/live-trader-24-7.js --name "alpha-hunter"
```

## GITHUB ACTIONS (APP-SPECIFIC)

### Prognostication Auto-Deploy
```yaml
# .github/workflows/deploy-prognostication.yml
name: Deploy Prognostication

on:
  push:
    branches: [main]
    paths:
      - 'apps/prognostication/**'
      - '!apps/prognostication/**.md'

jobs:
  deploy:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/prognostication
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: apps/prognostication/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          NODE_ENV: production
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: apps/prognostication
          vercel-args: '--prod'
```

### Alpha-Hunter Auto-Deploy
```yaml
# .github/workflows/deploy-alpha-hunter.yml
name: Deploy Alpha-Hunter

on:
  push:
    branches: [main]
    paths:
      - 'apps/alpha-hunter/**'
      - '!apps/alpha-hunter/**.md'

jobs:
  deploy:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/alpha-hunter
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: apps/alpha-hunter/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/cevict-live/apps/alpha-hunter
            git pull origin main
            npm ci --production
            npm run build
            pm2 restart alpha-hunter
```

## MANUAL DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Run `npm run lint` in app directory
- [ ] Run `npm run build` locally
- [ ] Verify `.env.local` has all required vars
- [ ] Check for console errors in dev mode
- [ ] Verify API connections work

### Deploy Prognostication
```powershell
cd apps/prognostication
npm install
npm run build
# Deploy to hosting provider
```

### Deploy Alpha-Hunter
```powershell
cd apps/alpha-hunter
npm install
npm run build
# Copy to production server
# Restart with pm2 or systemd
```

### Post-Deployment Verification
- [ ] Check app is accessible
- [ ] Verify API endpoints return 200
- [ ] Check logs for errors
- [ ] Monitor for 5 minutes
- [ ] Verify real data is flowing (NO fallbacks)

## DEPLOYMENT BEST PRACTICES

### 1. NEVER Deploy Whole Repo
```bash
# ❌ BAD - Deploys everything
git push origin main

# ✅ GOOD - Deploy specific app
cd apps/prognostication
vercel --prod
```

### 2. Always Use App-Specific Dependencies
```bash
# ❌ BAD - Install from repo root
npm install

# ✅ GOOD - Install per app
cd apps/prognostication && npm install
cd apps/alpha-hunter && npm install
```

### 3. Separate Build Processes
```bash
# ❌ BAD - Try to build everything
npm run build

# ✅ GOOD - Build each app separately
cd apps/prognostication && npm run build
cd apps/alpha-hunter && npm run build
```

### 4. Environment Variables Per App
```bash
# apps/prognostication/.env.local
NEXT_PUBLIC_KALSHI_REFERRAL_CODE=CEVICT2025
NEXT_PUBLIC_SUPABASE_URL=...
PROGNO_INTERNAL_API_KEY=...

# apps/alpha-hunter/.env.local
KALSHI_API_KEY_ID=...
KALSHI_PRIVATE_KEY=...
COINBASE_API_KEY=...
ANTHROPIC_API_KEY=...
```

## ROLLBACK PROCEDURE

### If Deployment Fails
```powershell
# Prognostication - Vercel
vercel rollback

# Alpha-Hunter - PM2
pm2 reload alpha-hunter --update-env
```

### If Need to Revert Code
```bash
# Check last good deploy
git log --oneline -10

# Revert to specific commit
git checkout <commit-hash> apps/prognostication
cd apps/prognostication
npm run build
vercel --prod
```

## MONITORING POST-DEPLOYMENT

### Check Prognostication
```bash
curl https://prognostication.com/api/kalshi/picks
# Should return: {"success":true,"isLiveData":true,...}
# If isLiveData: false → ALERT! Fallback logic active!
```

### Check Alpha-Hunter
```bash
# SSH to VPS
pm2 logs alpha-hunter --lines 50
# Look for: "✅ Using LIVE data"
# If you see: "⚠️ Using SAMPLE data" → PROBLEM!
```

## AUTOMATION TIPS

### Deploy Script (PowerShell)
```powershell
# scripts/deploy-all.ps1
param(
    [Parameter(Mandatory=$false)]
    [string]$App = "all"
)

function Deploy-App {
    param([string]$AppName)
    
    Write-Host "`n🚀 Deploying $AppName..." -ForegroundColor Cyan
    cd "apps/$AppName"
    
    npm install
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ $AppName deployment failed!" -ForegroundColor Red
        return $false
    }
    
    Write-Host "✅ $AppName deployed!" -ForegroundColor Green
    cd ../..
    return $true
}

if ($App -eq "all") {
    Deploy-App "prognostication"
    Deploy-App "alpha-hunter"
} else {
    Deploy-App $App
}
```

Usage:
```powershell
# Deploy specific app
./scripts/deploy-all.ps1 -App prognostication

# Deploy all apps
./scripts/deploy-all.ps1
```

