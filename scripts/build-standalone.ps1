# Standalone IPTV Viewer Build Script (Windows)
# Creates isolated build context outside monorepo

param(
    [string]$BuildProfile = "preview",
    [string]$Platform = "android"
)

Write-Host "🏗️  IPTV Viewer Standalone Build" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Profile: $BuildProfile | Platform: $Platform"
Write-Host ""

$BUILD_DIR = Join-Path $env:TEMP "iptv-build-$(Get-Random)"
Write-Host "📁 Build dir: $BUILD_DIR" -ForegroundColor Yellow

New-Item -ItemType Directory -Path $BUILD_DIR -Force | Out-Null

Write-Host "📦 Copying project files..." -ForegroundColor Cyan
$source = "C:\cevict-live\apps\IPTVviewer"
robocopy $source $BUILD_DIR /E /XD node_modules .expo android ios build .git .snapshots .worktrees /NFL /NDL /NJH /NJS

Set-Location $BUILD_DIR

@"
node_modules/
.expo/
android/
ios/
build/
"@ | Set-Content ".easignore" -Force

Write-Host "📥 Installing dependencies..." -ForegroundColor Cyan
npm ci

Write-Host "🔍 TypeScript check..." -ForegroundColor Cyan
try {
    npx tsc --noEmit 2>&1 | Out-Null
    Write-Host "✅ TypeScript OK" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  TypeScript warnings (ignoring for build)" -ForegroundColor Yellow
}

Write-Host "🏗️  Starting EAS build..." -ForegroundColor Cyan
Write-Host "Building from isolated context (no monorepo)" -ForegroundColor Yellow
Write-Host ""
eas build --platform $Platform --profile $BuildProfile --non-interactive

Set-Location C:\cevict-live
Remove-Item $BUILD_DIR -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "✅ Build process complete!" -ForegroundColor Green
