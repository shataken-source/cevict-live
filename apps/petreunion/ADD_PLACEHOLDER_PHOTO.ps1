# Add placeholder photo to enable Pet of Day testing

# Get PRO database service role key
Write-Host "`n⚠️  Enter the SERVICE ROLE KEY (not anon key)" -ForegroundColor Yellow
Write-Host "   Database: rdbuwyefbgnbuhmjrizo (PRO)" -ForegroundColor Cyan
$PRO_KEY = Read-Host "Service Role Key"

# Install tsx if needed
if (-not (Get-Command tsx -ErrorAction SilentlyContinue)) {
    Write-Host "Installing tsx..." -ForegroundColor Yellow
    npm install -g tsx
}

# Run the program
Write-Host "`n=== Adding Placeholder Photo ===" -ForegroundColor Cyan
Write-Host "PRO Database: rdbuwyefbgnbuhmjrizo" -ForegroundColor Yellow
npx tsx add-placeholder-photo.ts $PRO_KEY

Write-Host "`n✅ Done! Test get_next_pet_of_day() in SQL Editor." -ForegroundColor Green
