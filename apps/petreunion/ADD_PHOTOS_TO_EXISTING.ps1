# Add placeholder photos to existing pets without photos

Write-Host "`n⚠️  Enter the SERVICE ROLE KEY (not anon key)" -ForegroundColor Yellow
Write-Host "   Database: rdbuwyefbgnbuhmjrizo (PRO)" -ForegroundColor Cyan
$PRO_KEY = Read-Host "Service Role Key"

if (-not (Get-Command tsx -ErrorAction SilentlyContinue)) {
    Write-Host "Installing tsx..." -ForegroundColor Yellow
    npm install -g tsx
}

Write-Host "`n=== Adding Photos to Existing Pets ===" -ForegroundColor Cyan
Write-Host "PRO Database: rdbuwyefbgnbuhmjrizo" -ForegroundColor Yellow
npx tsx add-photos-to-existing-pets.ts $PRO_KEY

Write-Host "`n✅ Done!" -ForegroundColor Green
