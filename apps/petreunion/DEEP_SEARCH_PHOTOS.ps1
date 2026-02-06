# Deep search for photos - checks ALL fields and tables

# Get FREE database service role key
Write-Host "`n⚠️  Enter the SERVICE ROLE KEY (not anon key)" -ForegroundColor Yellow
Write-Host "   Database: nqkbqtiramecvmmpaxzk (FREE)" -ForegroundColor Cyan
$FREE_KEY = Read-Host "Service Role Key"

# Install tsx if needed
if (-not (Get-Command tsx -ErrorAction SilentlyContinue)) {
    Write-Host "Installing tsx..." -ForegroundColor Yellow
    npm install -g tsx
}

# Run the deep search
Write-Host "`n=== Deep Search for Photos ===" -ForegroundColor Cyan
Write-Host "FREE Database: nqkbqtiramecvmmpaxzk" -ForegroundColor Yellow
Write-Host "Checking ALL fields and tables..." -ForegroundColor Yellow
npx tsx find-photos-deep-search.ts $FREE_KEY

Write-Host "`n✅ Done! Check the output above." -ForegroundColor Green
