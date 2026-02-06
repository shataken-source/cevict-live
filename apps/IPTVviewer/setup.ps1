# NextTV Viewer - Quick Setup Script for Windows
# Run this in PowerShell: .\setup.ps1

Write-Host "================================" -ForegroundColor Cyan
Write-Host "NextTV Viewer - Setup & Test" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✓ npm installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm not found" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
Write-Host "(This may take 2-5 minutes)" -ForegroundColor Gray
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Check for Android setup
Write-Host ""
Write-Host "Checking Android setup..." -ForegroundColor Yellow
try {
    $adbCheck = adb version 2>&1
    Write-Host "✓ ADB found - Android development ready" -ForegroundColor Green
    $hasAndroid = $true
} catch {
    Write-Host "⚠ ADB not found - Install Android Studio to test on Android" -ForegroundColor Yellow
    $hasAndroid = $false
}

# Summary
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Instructions
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host ""

if ($hasAndroid) {
    Write-Host "To run on Android:" -ForegroundColor White
    Write-Host "  1. Connect Android device or start emulator" -ForegroundColor Gray
    Write-Host "  2. Run: npm run android" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "To start Metro bundler:" -ForegroundColor White
Write-Host "  npm start" -ForegroundColor Yellow
Write-Host ""

Write-Host "For detailed instructions, see:" -ForegroundColor White
Write-Host "  INSTALL_AND_RUN.md" -ForegroundColor Gray
Write-Host ""

Write-Host "Ready to test NextTV Viewer! 📺" -ForegroundColor Green
