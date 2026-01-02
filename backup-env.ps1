# Backup .env.local before Vercel CLI operations
# Usage: .\backup-env.ps1

$envFile = ".env.local"
$backupFile = ".env.local.backup"

if (Test-Path $envFile) {
    Copy-Item $envFile $backupFile -Force
    Write-Host "✅ Backed up $envFile to $backupFile" -ForegroundColor Green
} else {
    Write-Host "⚠️  $envFile not found. Nothing to backup." -ForegroundColor Yellow
}

