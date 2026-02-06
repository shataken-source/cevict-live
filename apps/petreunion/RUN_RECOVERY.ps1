# Run this to recover all pets automatically
# No SQL copy-paste needed!

cd apps/petreunion

# Get both service role keys
$FREE_KEY = Read-Host "Enter FREE Database (nqkbqtiramecvmmpaxzk) Service Role Key"
$PRO_KEY = Read-Host "Enter PRO Database (rdbuwyefbgnbuhmjrizo) Service Role Key"

# Install tsx if needed
if (-not (Get-Command tsx -ErrorAction SilentlyContinue)) {
    Write-Host "Installing tsx..." -ForegroundColor Yellow
    npm install -g tsx
}

# Run the recovery program
Write-Host "`n=== Starting Pet Recovery ===" -ForegroundColor Cyan
Write-Host "Copying from FREE → PRO database" -ForegroundColor Yellow
npx tsx recover-all-pets.ts $FREE_KEY $PRO_KEY

Write-Host "`n✅ Done! Check the output above." -ForegroundColor Green
