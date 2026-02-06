# Find photo URLs in database

Write-Host "`n⚠️  Enter the SERVICE ROLE KEY (not anon key)" -ForegroundColor Yellow
Write-Host "   Database: nqkbqtiramecvmmpaxzk (FREE)" -ForegroundColor Cyan
$FREE_KEY = Read-Host "Service Role Key"

if (-not (Get-Command tsx -ErrorAction SilentlyContinue)) {
    Write-Host "Installing tsx..." -ForegroundColor Yellow
    npm install -g tsx
}

Write-Host "`n=== Finding Photo URLs ===" -ForegroundColor Cyan
npx tsx find-photo-urls-in-db.ts $FREE_KEY

Write-Host "`n✅ Done!" -ForegroundColor Green
