# Stop all Node.js processes
Write-Host "Stopping all Node.js processes..." -ForegroundColor Cyan
taskkill /F /IM node.exe 2>$null

# Navigate to the project directory
$projectDir = "C:\gcc\cevict-app\cevict-monorepo\apps\cevict"
Set-Location $projectDir

# Clear npm cache
Write-Host "Clearing npm cache..." -ForegroundColor Cyan
pnpm store prune

# Remove node_modules and lock files
Write-Host "Removing node_modules and lock files..." -ForegroundColor Cyan
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue node_modules
Remove-Item -Force -ErrorAction SilentlyInclude pnpm-lock.yaml
Remove-Item -Force -ErrorAction SilentlyInclude package-lock.json
Remove-Item -Recurse -Force -ErrorAction SilentlyInclude .next

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Cyan
pnpm install

# Start the development server
Write-Host "Starting the development server..." -ForegroundColor Green
pnpm dev