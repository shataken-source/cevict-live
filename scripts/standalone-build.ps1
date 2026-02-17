# Standalone EAS Build Script for IPTV Viewer (Windows)
# This creates a clean build context to avoid monorepo issues

param(
    [string]$Profile = "preview",
    [string]$Platform = "android"
)

Write-Host "🏗️  IPTV Viewer Standalone Build" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Profile: $Profile"
Write-Host "Platform: $Platform"
Write-Host ""

# Create temporary build directory
$BUILD_DIR = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "iptv-build-$(Get-Random)")
Write-Host "📁 Build directory: $BUILD_DIR" -ForegroundColor Yellow

New-Item -ItemType Directory -Path $BUILD_DIR -Force | Out-Null

# Copy essential files
Write-Host "📦 Copying project files..." -ForegroundColor Cyan
$SOURCE = "C:\cevict-live\apps\IPTVviewer"
$DEST = "$BUILD_DIR\IPTVviewer"

# Use robocopy for better performance
robocopy $SOURCE $DEST /E /XD node_modules .expo android ios build .git /NFL /NDL /NJH /NJS

# Change to build directory
Set-Location $DEST

# Remove node_modules if they exist
Write-Host "🧹 Cleaning..." -ForegroundColor Cyan
Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path .expo -Recurse -Force -ErrorAction SilentlyContinue

# Create minimal .easignore to exclude everything except our app
@"
# Exclude everything from parent dirs
..
"@ | Set-Content -Path ".easignore" -Force

Write-Host "📥 Installing dependencies..." -ForegroundColor Cyan
npm ci

Write-Host "🔍 Running TypeScript check..." -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ TypeScript errors found!" -ForegroundColor Red
    Set-Location C:\cevict-live
    Remove-Item -Path $BUILD_DIR -Recurse -Force
    exit 1
}

Write-Host "🏗️  Starting EAS build..." -ForegroundColor Cyan
Write-Host "This will upload from the clean build directory." -ForegroundColor Yellow
eas build --platform $Platform --profile $Profile --non-interactive

# Cleanup
Write-Host "🧹 Cleaning up..." -ForegroundColor Cyan
Set-Location C:\cevict-live
Remove-Item -Path $BUILD_DIR -Recurse -Force

Write-Host "✅ Build process complete!" -ForegroundColor Green
