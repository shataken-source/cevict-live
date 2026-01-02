# Restore .env.local from backup
# Usage: .\restore-env.ps1

$envFile = ".env.local"
$backupFile = ".env.local.backup"

if (Test-Path $backupFile) {
    Copy-Item $backupFile $envFile -Force
    Write-Host "✅ Restored $envFile from $backupFile" -ForegroundColor Green
} else {
    Write-Host "❌ $backupFile not found. Cannot restore." -ForegroundColor Red
    Write-Host "💡 Tip: Run .\backup-env.ps1 before running Vercel CLI commands" -ForegroundColor Yellow
}

