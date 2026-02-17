# EAS Build PowerShell Script for IPTV Viewer
# Usage: .\scripts\build.ps1 [development|preview|production] [android|ios]

param(
    [string]$Profile = "preview",
    [string]$Platform = "android"
)

Write-Host "🏗️  EAS Build Script" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host "Profile: $Profile"
Write-Host "Platform: $Platform"
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: No package.json found. Make sure you're in apps/IPTVviewer/ directory" -ForegroundColor Red
    exit 1
}

# Check if eas CLI is installed
$easCheck = Get-Command eas -ErrorAction SilentlyContinue
if (-not $easCheck) {
    Write-Host "⚠️  EAS CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g eas-cli
}

# Check if user is logged in
try {
    $null = eas whoami 2>$null
} catch {
    Write-Host "🔐 Please login to EAS first:" -ForegroundColor Yellow
    eas login
}

Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
npm ci

Write-Host "🔍 Running TypeScript check..." -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ TypeScript errors found. Fix them before building." -ForegroundColor Red
    exit 1
}

Write-Host "🏗️  Starting EAS build..." -ForegroundColor Cyan
eas build --platform $Platform --profile $Profile --non-interactive

Write-Host "✅ Build submitted to EAS!" -ForegroundColor Green
Write-Host ""
Write-Host "Monitor build at: https://expo.dev/accounts/[account]/projects/iptvviewer/builds"
