# Replace FREE database URL with PRO database URL in all files
# FREE: https://nqkbqtiramecvmmpaxzk.supabase.co
# PRO:  https://rdbuwyefbgnbuhmjrizo.supabase.co

param(
    [switch]$DryRun = $false,
    [string]$RootPath = "."
)

$ErrorActionPreference = "Stop"

$FREE_URL = "https://nqkbqtiramecvmmpaxzk.supabase.co"
$PRO_URL = "https://rdbuwyefbgnbuhmjrizo.supabase.co"

# Also check for variations (with/without https, different formats)
$FREE_PATTERNS = @(
    "https://nqkbqtiramecvmmpaxzk.supabase.co",
    "http://nqkbqtiramecvmmpaxzk.supabase.co",
    "nqkbqtiramecvmmpaxzk.supabase.co",
    "nqkbqtiramecvmmpaxzk"
)

$PRO_REPLACEMENTS = @{
    "https://nqkbqtiramecvmmpaxzk.supabase.co" = "https://rdbuwyefbgnbuhmjrizo.supabase.co"
    "http://nqkbqtiramecvmmpaxzk.supabase.co" = "https://rdbuwyefbgnbuhmjrizo.supabase.co"
    "nqkbqtiramecvmmpaxzk.supabase.co" = "rdbuwyefbgnbuhmjrizo.supabase.co"
    "nqkbqtiramecvmmpaxzk" = "rdbuwyefbgnbuhmjrizo"
}

Write-Host "=== Database URL Replacement Script ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "FREE Database: $FREE_URL" -ForegroundColor Yellow
Write-Host "PRO Database:  $PRO_URL" -ForegroundColor Green
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No files will be modified" -ForegroundColor Yellow
    Write-Host ""
}

# Get all files (excluding common exclusions)
$files = Get-ChildItem -Path $RootPath -Recurse -File | Where-Object {
    $excluded = @(
        "node_modules",
        ".git",
        ".next",
        "dist",
        "build",
        ".vscode",
        ".idea",
        "*.log",
        "*.ps1"  # Exclude this script itself
    )
    
    $shouldExclude = $false
    foreach ($exclude in $excluded) {
        if ($_.FullName -like "*$exclude*") {
            $shouldExclude = $true
            break
        }
    }
    
    -not $shouldExclude
}

Write-Host "Scanning $($files.Count) files..." -ForegroundColor Cyan
Write-Host ""

$filesToModify = @()
$totalReplacements = 0

# First pass: find all files that need modification
foreach ($file in $files) {
    try {
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
        if ($null -eq $content) { continue }
        
        $modified = $false
        $replacements = 0
        
        foreach ($pattern in $FREE_PATTERNS) {
            if ($content -match [regex]::Escape($pattern)) {
                $count = ([regex]::Matches($content, [regex]::Escape($pattern))).Count
                $replacements += $count
                $modified = $true
            }
        }
        
        if ($modified) {
            $filesToModify += @{
                File = $file
                Replacements = $replacements
            }
            $totalReplacements += $replacements
        }
    }
    catch {
        # Skip files that can't be read (binary, locked, etc.)
        continue
    }
}

# Show what will be changed
if ($filesToModify.Count -eq 0) {
    Write-Host "✅ No files found containing the FREE database URL" -ForegroundColor Green
    exit 0
}

Write-Host "Found $($filesToModify.Count) file(s) containing FREE database URL:" -ForegroundColor Yellow
Write-Host "Total replacements needed: $totalReplacements" -ForegroundColor Yellow
Write-Host ""

foreach ($item in $filesToModify) {
    $relativePath = $item.File.FullName.Replace((Resolve-Path $RootPath).Path + "\", "")
    Write-Host "  - $relativePath ($($item.Replacements) replacement(s))" -ForegroundColor Gray
}

Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN - No changes made. Remove -DryRun to apply changes." -ForegroundColor Yellow
    exit 0
}

# Ask for confirmation
$confirmation = Read-Host "Do you want to proceed with replacements? (yes/no)"
if ($confirmation -ne "yes" -and $confirmation -ne "y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Applying replacements..." -ForegroundColor Cyan

# Second pass: make the replacements
$successCount = 0
$errorCount = 0

foreach ($item in $filesToModify) {
    $file = $item.File
    try {
        $content = Get-Content -Path $file.FullName -Raw
        
        # Apply all replacements
        foreach ($pattern in $FREE_PATTERNS) {
            if ($PRO_REPLACEMENTS.ContainsKey($pattern)) {
                $replacement = $PRO_REPLACEMENTS[$pattern]
                $content = $content -replace [regex]::Escape($pattern), $replacement
            }
        }
        
        # Write back to file
        Set-Content -Path $file.FullName -Value $content -NoNewline
        
        $relativePath = $file.FullName.Replace((Resolve-Path $RootPath).Path + "\", "")
        Write-Host "  ✅ $relativePath" -ForegroundColor Green
        $successCount++
    }
    catch {
        $relativePath = $file.FullName.Replace((Resolve-Path $RootPath).Path + "\", "")
        Write-Host "  ❌ Error processing $relativePath : $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Files processed: $successCount" -ForegroundColor Green
if ($errorCount -gt 0) {
    Write-Host "Errors: $errorCount" -ForegroundColor Red
}
Write-Host "Total replacements: $totalReplacements" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Replacement complete!" -ForegroundColor Green
