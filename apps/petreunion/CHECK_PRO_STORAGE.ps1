# Check PRO database Storage

Write-Host "`n⚠️  Enter the SERVICE ROLE KEY (not anon key)" -ForegroundColor Yellow
Write-Host "   Database: rdbuwyefbgnbuhmjrizo (PRO)" -ForegroundColor Cyan
$PRO_KEY = Read-Host "Service Role Key"

if (-not (Get-Command tsx -ErrorAction SilentlyContinue)) {
    Write-Host "Installing tsx..." -ForegroundColor Yellow
    npm install -g tsx
}

Write-Host "`n=== Checking PRO Storage ===" -ForegroundColor Cyan
npx tsx check-pro-storage.ts $PRO_KEY

Write-Host "`n✅ Done!" -ForegroundColor Green
