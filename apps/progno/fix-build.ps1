# 1. Define the file path (relative to your current location in apps/progno)
$filePath = "src/app/path/to/your/file.ts" # <--- UPDATE THIS to the actual file path

# 2. Use a regex replacement to add the null-coalescing operator (?? [])
# This changes 'result.predictions' to 'result.predictions ?? []'
Write-Host "Applying TypeScript safety patch to $filePath..." -ForegroundColor Cyan

(Get-Content $filePath) -replace 
    'for \(const pred of result\.predictions\)', 
    'for (const pred of result.predictions ?? [])' | 
Set-Content $filePath

Write-Host "Patch applied successfully.`n" -ForegroundColor Green

# 3. Clean and Rebuild
Write-Host "Starting fresh build to verify fix..." -ForegroundColor Yellow

# Use 'pnpm' or 'npm' depending on your monorepo setup
if (Test-Path "pnpm-lock.yaml") {
    pnpm build
} else {
    npm run build
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nBuild Successful! The type error is resolved." -ForegroundColor Green
} else {
    Write-Warning "`nBuild failed again. Check for other TypeScript errors in the output above."
}