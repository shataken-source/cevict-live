# Scan repo for env-related files (.env.local, .env.example, backups) and list which keys they reference.
# Does NOT print secret values; only key names and (for .example files) whether value looks like a placeholder.
# Usage: .\scan-env-files.ps1 [-RepoRoot "C:\cevict-live"] [-IncludeBackups] [-ReportPlaceholdersInStore]

param(
    [string]$RepoRoot = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
    [switch]$IncludeBackups = $true,
    [switch]$ReportPlaceholdersInStore = $false
)

Set-StrictMode -Version Latest

# Files we consider "env" files (these are often in .gitignore; script reads from disk)
$envFilePatterns = @(
    '.env',
    '.env.local',
    '.env.*.local',
    '.env.example',
    '.env*.example',
    '.env.local.template',
    'env.local.template',
    '*.env.example'
)
if ($IncludeBackups) {
    $envFilePatterns += '.env.local.backup*'
    $envFilePatterns += '*.env.backup'
}

# Parse KEY=value from a line; return $null if not a key line
function Get-EnvKeyFromLine {
    param([string]$Line)
    $t = $Line.Trim()
    if ([string]::IsNullOrWhiteSpace($t) -or $t.StartsWith('#')) { return $null }
    if ($t -match '^([A-Za-z_][A-Za-z0-9_]*)=') { return $Matches[1] }
    return $null
}

# Check if value looks like placeholder (for .example files)
function Test-PlaceholderValue {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $true }
    $v = $Value.Trim().ToLowerInvariant()
    $patterns = @('^your-', 'paste_your', '_here$', '^replace', '^xxx', '^<', 'example\.', 'your_', 'paste your')
    foreach ($pat in $patterns) {
        if ($v -match $pat) { return $true }
    }
    return $false
}

# Get key name and optional value from line
function Get-EnvKeyValueFromLine {
    param([string]$Line)
    $t = $Line.Trim()
    if ([string]::IsNullOrWhiteSpace($t) -or $t.StartsWith('#')) { return $null }
    if ($t -match '^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
        $val = $Matches[2].Trim()
        if ($val -match '^["''](.+)["'']\s*$') { $val = $Matches[1] }
        return [pscustomobject]@{ Key = $Matches[1]; Value = $val }
    }
    return $null
}

# Collect candidate files: repo root, apps\*, scripts (avoid deep recurse into node_modules)
$searchPaths = @(
    $RepoRoot
)
$appsDir = Join-Path $RepoRoot 'apps'
if (Test-Path -LiteralPath $appsDir) {
    $searchPaths += Get-ChildItem -Path $appsDir -Directory -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }
}
$scriptsDir = Join-Path $RepoRoot 'scripts'
if (Test-Path -LiteralPath $scriptsDir) { $searchPaths += $scriptsDir }

$candidates = @()
foreach ($dir in $searchPaths) {
    $candidates += Get-ChildItem -Path $dir -File -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Name -eq '.env' -or
            $_.Name -eq '.env.local' -or
            $_.Name -match '^\.env\.\w+\.local$' -or
            $_.Name -eq '.env.production' -or
            $_.Name -eq '.env.example' -or
            $_.Name -match '^\.env.*\.example$' -or
            $_.Name -eq 'env.local.template' -or
            $_.Name -eq '.env.local.template' -or
            ($IncludeBackups -and ($_.Name -match '\.env\.local\.backup' -or $_.Name -match '\.env\.backup'))
        }
}

# Dedupe by full path
$files = $candidates | Sort-Object -Property FullName -Unique

Write-Host "Repo: $RepoRoot"
Write-Host "Env-related files found: $($files.Count)"
Write-Host ""

$allKeysByFile = @{}
$allKeysSet = [System.Collections.Generic.HashSet[string]]::new()
$examplePlaceholders = [System.Collections.Generic.List[object]]::new()

foreach ($f in $files) {
    $rel = $f.FullName.Replace($RepoRoot, '').TrimStart('\', '/')
    $keys = [System.Collections.Generic.List[string]]::new()
    $isExample = $f.Name -match '\.example$|template'
    $content = $null
    try {
        $content = Get-Content -LiteralPath $f.FullName -Encoding UTF8 -ErrorAction Stop
    } catch {
        Write-Host "  (skip read: $rel)" -ForegroundColor DarkGray
        continue
    }
    foreach ($line in $content) {
        if ($isExample) {
            $kv = Get-EnvKeyValueFromLine -Line $line
            if ($kv) {
                [void]$keys.Add($kv.Key)
                [void]$allKeysSet.Add($kv.Key)
                if (Test-PlaceholderValue -Value $kv.Value) {
                    $examplePlaceholders.Add([pscustomobject]@{ File = $rel; Key = $kv.Key; ValuePreview = if ($kv.Value.Length -gt 40) { $kv.Value.Substring(0, 37) + "..." } else { $kv.Value } })
                }
            }
        } else {
            $k = Get-EnvKeyFromLine -Line $line
            if ($k) {
                [void]$keys.Add($k)
                [void]$allKeysSet.Add($k)
            }
        }
    }
    if ($keys.Count -gt 0) {
        $allKeysByFile[$rel] = $keys
    }
}

# Report: per file, key names only (no values for .env.local / backups)
Write-Host "Keys per file (key names only; no secret values):"
Write-Host "---------------------------------------------------"
foreach ($rel in ($allKeysByFile.Keys | Sort-Object)) {
    $keyList = $allKeysByFile[$rel]
    Write-Host ""
    Write-Host "  $rel" -ForegroundColor Cyan
    Write-Host "    Keys ($($keyList.Count)): $($keyList -join ', ')"
}

# From .env.example / templates: which have placeholder-like values
if ($examplePlaceholders.Count -gt 0) {
    Write-Host ""
    Write-Host "In .example / template files, values that look like placeholders:"
    Write-Host "---------------------------------------------------------------"
    foreach ($p in $examplePlaceholders) {
        Write-Host "  $($p.File)  $($p.Key)=$($p.ValuePreview)"
    }
}

# Optional: which of the keys we saw are placeholders in the key store
if ($ReportPlaceholdersInStore) {
    $modulePath = Join-Path $PSScriptRoot 'KeyVault.psm1'
    Import-Module $modulePath -Force
    $placeholderPatterns = @('^your-', 'paste_your', '_here$', '^replace', '^xxx', 'example\.')
    Write-Host ""
    Write-Host "Keys that appear in env files AND are placeholders in key store:"
    Write-Host "----------------------------------------------------------------"
    $found = 0
    foreach ($key in ($allKeysSet | Sort-Object)) {
        $val = Get-KeyVaultSecret -Name $key
        if (-not $val) { continue }
        $v = $val.Trim().ToLowerInvariant()
        $isPlaceholder = [string]::IsNullOrWhiteSpace($val)
        if (-not $isPlaceholder) {
            foreach ($pat in $placeholderPatterns) {
                if ($v -match $pat) { $isPlaceholder = $true; break }
            }
        }
        if ($isPlaceholder) {
            Write-Host "  $key"
            $found++
        }
    }
    if ($found -eq 0) { Write-Host "  (none)" }
}

Write-Host ""
Write-Host "Total unique key names across all scanned files: $($allKeysSet.Count)"
