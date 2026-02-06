# Find all pets with external photo URLs

Write-Host "`n⚠️  Enter the SERVICE ROLE KEY (not anon key)" -ForegroundColor Yellow
Write-Host "   Database: rdbuwyefbgnbuhmjrizo (PRO)" -ForegroundColor Cyan
$PRO_KEY = Read-Host "Service Role Key"

if (-not (Get-Command tsx -ErrorAction SilentlyContinue)) {
    Write-Host "Installing tsx..." -ForegroundColor Yellow
    npm install -g tsx
}

Write-Host "`n=== Finding All External Photos ===" -ForegroundColor Cyan
npx tsx find-all-external-photos.ts $PRO_KEY

Write-Host "`n✅ Done!" -ForegroundColor Green
