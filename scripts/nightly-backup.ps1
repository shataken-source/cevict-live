<#
.SYNOPSIS
  Nightly Backup - Core Code to Google Drive
.DESCRIPTION
  Backs up critical source code and config needed to restore from complete failure.
  Destination: G:\My Drive\NightlyCodeBackups\YYYY-MM-DD\
  Auto-prunes backups older than 14 days.
.USAGE
  powershell -ExecutionPolicy Bypass -File scripts\nightly-backup.ps1
#>

$ErrorActionPreference = "Stop"
$date = Get-Date -Format "yyyy-MM-dd"
$backupRoot = "G:\My Drive\NightlyCodeBackups\$date"
$srcRoot = "C:\cevict-live"
$nightlyRoot = "G:\My Drive\NightlyCodeBackups"

Write-Host ""
Write-Host "=== Nightly Backup - $date ===" -ForegroundColor Cyan
Write-Host "Source: $srcRoot"
Write-Host "Dest:   $backupRoot"
Write-Host ""

# --- Prune backups older than 14 days ---
$cutoff = (Get-Date).AddDays(-14)
$oldDirs = @(Get-ChildItem -Path $nightlyRoot -Directory -ErrorAction SilentlyContinue)
foreach ($old in $oldDirs) {
    if ($old.Name -match '^\d{4}-\d{2}-\d{2}$') {
        try {
            $dirDate = [datetime]::ParseExact($old.Name, 'yyyy-MM-dd', $null)
            if ($dirDate -lt $cutoff) {
                Write-Host "  Pruning old backup: $($old.Name)" -ForegroundColor DarkGray
                Remove-Item $old.FullName -Recurse -Force
            }
        } catch { }
    }
}

# --- Core apps to back up (src only, skip node_modules/.next/data) ---
$apps = @(
    "alpha-hunter",
    "progno",
    "progno-massager",
    "cevict-scraper",
    "gulfcoastcharters",
    "wheretovacation",
    "smokersrights"
)

$excludeDirs = @("node_modules", ".next", ".turbo", "dist", ".vercel", "data", "__pycache__", ".cache")

function Copy-AppSource {
    param([string]$appName)
    $src = Join-Path $srcRoot "apps\$appName"
    $dst = Join-Path $backupRoot "apps\$appName"

    if (-not (Test-Path $src)) {
        Write-Host "  SKIP $appName (not found)" -ForegroundColor DarkYellow
        return
    }

    Write-Host "  Backing up $appName..." -NoNewline

    $xdArgs = @()
    foreach ($xd in $excludeDirs) { $xdArgs += "/XD"; $xdArgs += $xd }
    $rcArgs = @($src, $dst, "/E", "/NJH", "/NJS", "/NP", "/NFL", "/NDL", "/XF", "*.log", "*.zip", "*.apk") + $xdArgs
    & robocopy @rcArgs 2>&1 | Out-Null

    $fileCount = @(Get-ChildItem -Path $dst -Recurse -File -ErrorAction SilentlyContinue).Count
    Write-Host " $fileCount files" -ForegroundColor Green
}

# --- Back up each app ---
Write-Host "Backing up apps:" -ForegroundColor Yellow
foreach ($app in $apps) {
    Copy-AppSource $app
}

# --- Root-level config files ---
Write-Host ""
Write-Host "Backing up root configs:" -ForegroundColor Yellow
$rootFiles = @("package.json", "package-lock.json", "turbo.json", "vercel.json", ".gitignore", "tsconfig.json")
if (-not (Test-Path $backupRoot)) { New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null }
foreach ($f in $rootFiles) {
    $fPath = Join-Path $srcRoot $f
    if (Test-Path $fPath) {
        Copy-Item $fPath -Destination (Join-Path $backupRoot $f) -Force
        Write-Host "  $f" -ForegroundColor Green
    }
}

# --- Scripts directory ---
Write-Host ""
Write-Host "Backing up scripts:" -ForegroundColor Yellow
$scriptsSrc = Join-Path $srcRoot "scripts"
$scriptsDst = Join-Path $backupRoot "scripts"
if (Test-Path $scriptsSrc) {
    & robocopy $scriptsSrc $scriptsDst /E /NJH /NJS /NP /NFL /NDL /XD node_modules 2>&1 | Out-Null
    $scriptCount = @(Get-ChildItem -Path $scriptsDst -Recurse -File -ErrorAction SilentlyContinue).Count
    Write-Host "  $scriptCount files" -ForegroundColor Green
}

# --- Workflows ---
$wfSrc = Join-Path $srcRoot ".windsurf\workflows"
if (Test-Path $wfSrc) {
    $wfDst = Join-Path $backupRoot ".windsurf\workflows"
    New-Item -ItemType Directory -Path $wfDst -Force | Out-Null
    Copy-Item "$wfSrc\*" -Destination $wfDst -Recurse -Force
    Write-Host "  .windsurf/workflows" -ForegroundColor Green
}

# --- env.manifest files (schema only, no secrets) ---
Write-Host ""
Write-Host "Backing up env manifests:" -ForegroundColor Yellow
$manifests = @(Get-ChildItem -Path (Join-Path $srcRoot "apps") -Filter "env.manifest.json" -Recurse -Depth 2 -ErrorAction SilentlyContinue)
foreach ($mf in $manifests) {
    $relPath = $mf.FullName.Substring($srcRoot.Length + 1)
    $dstPath = Join-Path $backupRoot $relPath
    $dstDir = Split-Path $dstPath -Parent
    if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
    Copy-Item $mf.FullName -Destination $dstPath -Force
    Write-Host "  $relPath" -ForegroundColor Green
}

# --- Supabase migrations ---
Write-Host ""
Write-Host "Backing up Supabase migrations:" -ForegroundColor Yellow
foreach ($app in $apps) {
    $migSrc = Join-Path $srcRoot "apps\$app\supabase"
    $migDst = Join-Path $backupRoot "apps\$app\supabase"
    if (Test-Path $migSrc) {
        & robocopy $migSrc $migDst /E /NJH /NJS /NP /NFL /NDL 2>&1 | Out-Null
        $migCount = @(Get-ChildItem -Path $migDst -Recurse -File -ErrorAction SilentlyContinue).Count
        Write-Host "  $app/supabase - $migCount files" -ForegroundColor Green
    }
}

# --- Summary ---
$allFiles = @(Get-ChildItem -Path $backupRoot -Recurse -File -ErrorAction SilentlyContinue)
$totalFiles = $allFiles.Count
$totalSize = ($allFiles | Measure-Object -Property Length -Sum).Sum
$sizeMB = [math]::Round($totalSize / 1MB, 1)

Write-Host ""
Write-Host "=== Backup Complete ===" -ForegroundColor Cyan
Write-Host "  Date:  $date"
Write-Host "  Files: $totalFiles"
Write-Host "  Size:  ${sizeMB}MB"
Write-Host "  Path:  $backupRoot"
Write-Host ""
