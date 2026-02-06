# GCC File Audit and Sync Script
# Compares files across three directories and copies newest versions to C:\gccnewest

$ErrorActionPreference = "Continue"

# Source directories
$dir1 = "c:\cevict-live\apps\gulfcoastcharters"
$dir2 = "C:\gcc\charter-booking-platform"
$dir3 = "C:\gcc\cevict-app\cevict-monorepo\apps\gcc"

# Destination directory
$destDir = "C:\gccnewest"

# Create destination directory if it doesn't exist
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    Write-Host "Created destination directory: $destDir" -ForegroundColor Green
}

# Exclude patterns (directories and files to skip)
$excludePatterns = @(
    'node_modules',
    '.next',
    '.git',
    'dist',
    'build',
    '.cache',
    'coverage',
    '.nyc_output',
    '.turbo',
    '.vercel',
    '*.log',
    '*.tmp',
    '.DS_Store',
    'Thumbs.db'
)

# Function to check if path should be excluded
function Should-ExcludePath {
    param([string]$Path)
    
    foreach ($pattern in $excludePatterns) {
        if ($Path -like "*\$pattern\*" -or $Path -like "*\$pattern" -or $Path -like "$pattern\*") {
            return $true
        }
        if ($Path -like $pattern) {
            return $true
        }
    }
    return $false
}

# Function to get all files recursively with relative paths
function Get-AllFiles {
    param(
        [string]$BasePath,
        [string]$DisplayName
    )
    
    Write-Host "`nScanning: $DisplayName" -ForegroundColor Cyan
    Write-Host "Path: $BasePath" -ForegroundColor Gray
    
    if (-not (Test-Path $BasePath)) {
        Write-Host "  WARNING: Directory does not exist!" -ForegroundColor Yellow
        return @{}
    }
    
    $files = @{}
    $fileCount = 0
    $skippedCount = 0
    
    Get-ChildItem -Path $BasePath -Recurse -File | ForEach-Object {
        $relativePath = $_.FullName.Substring($BasePath.Length).TrimStart('\', '/')
        
        # Skip excluded paths
        if (Should-ExcludePath -Path $relativePath) {
            $skippedCount++
            return
        }
        
        $fileCount++
        
        $files[$relativePath] = @{
            FullPath = $_.FullName
            LastWriteTime = $_.LastWriteTime
            Length = $_.Length
            Source = $DisplayName
        }
    }
    
    Write-Host "  Found $fileCount files (skipped $skippedCount excluded)" -ForegroundColor Green
    return $files
}

# Get all files from each directory
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "GCC FILE AUDIT AND SYNC" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

$files1 = Get-AllFiles -BasePath $dir1 -DisplayName "cevict-live/gulfcoastcharters"
$files2 = Get-AllFiles -BasePath $dir2 -DisplayName "charter-booking-platform"
$files3 = Get-AllFiles -BasePath $dir3 -DisplayName "cevict-monorepo/apps/gcc"

# Combine all unique file paths
$allFilePaths = @{}
$files1.Keys | ForEach-Object { $allFilePaths[$_] = $true }
$files2.Keys | ForEach-Object { $allFilePaths[$_] = $true }
$files3.Keys | ForEach-Object { $allFilePaths[$_] = $true }

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "ANALYZING FILES" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

$stats = @{
    TotalFiles = $allFilePaths.Count
    OnlyInDir1 = 0
    OnlyInDir2 = 0
    OnlyInDir3 = 0
    InMultiple = 0
    Copied = 0
    Skipped = 0
    Errors = 0
}

$copyLog = @()

# Process each file
foreach ($relativePath in $allFilePaths.Keys | Sort-Object) {
    $existsIn1 = $files1.ContainsKey($relativePath)
    $existsIn2 = $files2.ContainsKey($relativePath)
    $existsIn3 = $files3.ContainsKey($relativePath)
    
    $existsCount = 0
    if ($existsIn1) { $existsCount++ }
    if ($existsIn2) { $existsCount++ }
    if ($existsIn3) { $existsCount++ }
    
    # Determine which file to copy
    $fileToCopy = $null
    $sourceInfo = ""
    
    if ($existsCount -eq 1) {
        # File only exists in one location
        if ($existsIn1) {
            $fileToCopy = $files1[$relativePath]
            $stats.OnlyInDir1++
            $sourceInfo = "ONLY in cevict-live"
        }
        elseif ($existsIn2) {
            $fileToCopy = $files2[$relativePath]
            $stats.OnlyInDir2++
            $sourceInfo = "ONLY in charter-booking-platform"
        }
        elseif ($existsIn3) {
            $fileToCopy = $files3[$relativePath]
            $stats.OnlyInDir3++
            $sourceInfo = "ONLY in cevict-monorepo"
        }
    }
    else {
        # File exists in multiple locations - find newest
        $stats.InMultiple++
        $candidates = @()
        
        if ($existsIn1) { $candidates += $files1[$relativePath] }
        if ($existsIn2) { $candidates += $files2[$relativePath] }
        if ($existsIn3) { $candidates += $files3[$relativePath] }
        
        # Sort by LastWriteTime (newest first)
        $candidates = $candidates | Sort-Object -Property LastWriteTime -Descending
        
        $fileToCopy = $candidates[0]
        $sourceInfo = "NEWEST from $($fileToCopy.Source) ($($fileToCopy.LastWriteTime))"
        
        # Show comparison if multiple versions
        if ($candidates.Count -gt 1) {
            $otherVersions = $candidates[1..($candidates.Count-1)] | ForEach-Object {
                "  - $($_.Source): $($_.LastWriteTime)"
            }
            Write-Host "`n$relativePath" -ForegroundColor Yellow
            Write-Host "  Using: $sourceInfo" -ForegroundColor Green
            Write-Host ($otherVersions -join "`n") -ForegroundColor Gray
        }
    }
    
    # Copy the file
    if ($fileToCopy) {
        $destPath = Join-Path $destDir $relativePath
        $destParent = Split-Path $destPath -Parent
        
        try {
            # Create parent directory if needed
            if (-not (Test-Path $destParent)) {
                New-Item -ItemType Directory -Path $destParent -Force | Out-Null
            }
            
            # Copy file
            Copy-Item -Path $fileToCopy.FullPath -Destination $destPath -Force
            
            $stats.Copied++
            $copyLog += [PSCustomObject]@{
                RelativePath = $relativePath
                Source = $fileToCopy.Source
                LastWriteTime = $fileToCopy.LastWriteTime
                Status = $sourceInfo
            }
            
            if ($stats.Copied % 100 -eq 0) {
                Write-Host "  Copied $($stats.Copied) files..." -ForegroundColor Cyan
            }
        }
        catch {
            $stats.Errors++
            # Only show errors for non-node_modules files to reduce noise
            if ($relativePath -notlike "*node_modules*") {
                Write-Host "  ERROR copying $relativePath : $_" -ForegroundColor Red
            }
        }
    }
}

# Print summary
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "SYNC SUMMARY" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

Write-Host "Total unique files found: $($stats.TotalFiles)" -ForegroundColor White
Write-Host "Files only in cevict-live: $($stats.OnlyInDir1)" -ForegroundColor Cyan
Write-Host "Files only in charter-booking-platform: $($stats.OnlyInDir2)" -ForegroundColor Cyan
Write-Host "Files only in cevict-monorepo: $($stats.OnlyInDir3)" -ForegroundColor Cyan
Write-Host "Files in multiple locations: $($stats.InMultiple)" -ForegroundColor Yellow
Write-Host "`nFiles copied: $($stats.Copied)" -ForegroundColor Green
Write-Host "Errors: $($stats.Errors)" -ForegroundColor $(if ($stats.Errors -gt 0) { "Red" } else { "Green" })

# Save detailed log
$logPath = Join-Path $destDir "sync-log-$(Get-Date -Format 'yyyyMMdd-HHmmss').csv"
$copyLog | Export-Csv -Path $logPath -NoTypeInformation
Write-Host "`nDetailed log saved to: $logPath" -ForegroundColor Cyan

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "SYNC COMPLETE" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "Destination: $destDir" -ForegroundColor Green
