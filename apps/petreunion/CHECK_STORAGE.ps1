# Check Supabase Storage for photos

# Get FREE database service role key
Write-Host "`n⚠️  Enter the SERVICE ROLE KEY (not anon key)" -ForegroundColor Yellow
Write-Host "   Database: nqkbqtiramecvmmpaxzk (FREE)" -ForegroundColor Cyan
$FREE_KEY = Read-Host "Service Role Key"

# Install tsx if needed
if (-not (Get-Command tsx -ErrorAction SilentlyContinue)) {
    Write-Host "Installing tsx..." -ForegroundColor Yellow
    npm install -g tsx
}

# Run the check
Write-Host "`n=== Checking Supabase Storage ===" -ForegroundColor Cyan
Write-Host "FREE Database: nqkbqtiramecvmmpaxzk" -ForegroundColor Yellow
npx tsx check-storage-buckets.ts $FREE_KEY

Write-Host "`n✅ Done! Check the output above." -ForegroundColor Green
