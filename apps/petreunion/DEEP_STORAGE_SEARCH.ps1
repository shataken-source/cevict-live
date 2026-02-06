# Deep search for photos - checks ALL buckets, subdirectories, and files

Write-Host "`n⚠️  Enter SERVICE ROLE KEYS" -ForegroundColor Yellow
Write-Host "   FREE Database: nqkbqtiramecvmmpaxzk" -ForegroundColor Cyan
$FREE_KEY = Read-Host "FREE Service Role Key"
Write-Host "   PRO Database: rdbuwyefbgnbuhmjrizo" -ForegroundColor Cyan
$PRO_KEY = Read-Host "PRO Service Role Key"

if (-not (Get-Command tsx -ErrorAction SilentlyContinue)) {
    Write-Host "Installing tsx..." -ForegroundColor Yellow
    npm install -g tsx
}

Write-Host "`n=== Deep Storage Search ===" -ForegroundColor Cyan
Write-Host "Searching ALL buckets, subdirectories, and files..." -ForegroundColor Yellow
npx tsx deep-storage-search.ts $FREE_KEY $PRO_KEY

Write-Host "`n✅ Done!" -ForegroundColor Green
