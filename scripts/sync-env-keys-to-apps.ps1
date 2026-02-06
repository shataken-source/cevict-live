# Sync env keys (e.g. OPENAI_API_KEY) from existing .env.local files into target apps.
# Before writing, backs up each target's .env.local to .env.local.backup-YYYYMMDD-HHmmss.
# Usage: .\sync-env-keys-to-apps.ps1 [-Keys "OPENAI_API_KEY","ANTHROPIC_API_KEY"] [-WhatIf]
# Default: sync OPENAI_API_KEY and ANTHROPIC_API_KEY into progno, petreunion, gcc, wheretovacation, prognostication, moltbook-viewer.

param(
    [string]$Root = "C:\cevict-live",
    [string[]]$Keys = @("OPENAI_API_KEY", "ANTHROPIC_API_KEY"),
    [string[]]$TargetApps = @("progno", "petreunion", "gulfcoastcharters", "wheretovacation", "prognostication", "moltbook-viewer"),
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

# Source files to read from (first non-empty value wins per key)
$SourcePaths = @(
    (Join-Path $Root ".env.local"),
    (Join-Path $Root ".env.local.backup"),
    (Join-Path $Root "apps\progno\.env.local"),
    (Join-Path $Root "apps\petreunion\.env.local"),
    (Join-Path $Root "apps\gulfcoastcharters\.env.local"),
    (Join-Path $Root "apps\wheretovacation\.env.local"),
    (Join-Path $Root "apps\prognostication\.env.local"),
    (Join-Path $Root "apps\prognostication\progno-massager\.env.local"),
    (Join-Path $Root "apps\alpha-hunter\.env.local")
)

function Get-EnvKeyValue {
    param([string]$FilePath, [string]$Key)
    if (-not (Test-Path -LiteralPath $FilePath)) { return $null }
    $content = Get-Content -LiteralPath $FilePath -Encoding UTF8 -ErrorAction SilentlyContinue
    foreach ($line in $content) {
        $line = $line.Trim()
        if ($line -match '^#') { continue }
        if ($line -match "^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$") {
            if ($Matches[1] -ceq $Key) {
                $v = $Matches[2].Trim()
                if ($v -match '^["''](.+)["'']\s*$') { $v = $Matches[1] }
                return $v
            }
        }
    }
    return $null
}

function Get-AllKeysInFile {
    param([string]$FilePath)
    $found = @{}
    if (-not (Test-Path -LiteralPath $FilePath)) { return $found }
    $content = Get-Content -LiteralPath $FilePath -Encoding UTF8 -ErrorAction SilentlyContinue
    foreach ($line in $content) {
        $line = $line.Trim()
        if ($line -eq "" -or $line -match '^#') { continue }
        if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            $k = $Matches[1]
            $v = $Matches[2].Trim()
            if ($v -match '^["''](.+)["'']\s*$') { $v = $Matches[1] }
            $found[$k] = $v
        }
    }
    return $found
}

# Collect first non-empty value for each key from sources
$Collected = @{}
foreach ($key in $Keys) {
    foreach ($src in $SourcePaths) {
        $val = Get-EnvKeyValue -FilePath $src -Key $key
        if ($val -ne $null -and $val -ne "") {
            $Collected[$key] = $val
            break
        }
    }
}

Write-Host "Collected keys from sources (first non-empty wins):"
foreach ($k in $Keys) {
    if ($Collected.ContainsKey($k)) {
        $preview = if ($Collected[$k].Length -gt 20) { $Collected[$k].Substring(0, 12) + "..." } else { $Collected[$k] }
        Write-Host "  $k = $preview"
    } else {
        Write-Host "  $k = (not found in any source)"
    }
}
Write-Host ""

# Backup all target .env.local files before changing anything (skip if -WhatIf)
if (-not $WhatIf) {
    $backupSuffix = Get-Date -Format "yyyyMMdd-HHmmss"
    foreach ($app in $TargetApps) {
        $targetDir = Join-Path $Root "apps\$app"
        $targetFile = Join-Path $targetDir ".env.local"
        if (Test-Path -LiteralPath $targetFile -PathType Leaf) {
            $backupFile = Join-Path $targetDir ".env.local.backup-$backupSuffix"
            Copy-Item -LiteralPath $targetFile -Destination $backupFile -Force
            Write-Host "Backup: $app\.env.local -> .env.local.backup-$backupSuffix"
        }
    }
    Write-Host ""
}

foreach ($app in $TargetApps) {
    $targetDir = Join-Path $Root "apps\$app"
    $targetFile = Join-Path $targetDir ".env.local"

    if (-not (Test-Path -LiteralPath $targetDir -PathType Container)) {
        Write-Host "Skip $app (folder not found)"
        continue
    }

    $existing = Get-AllKeysInFile -FilePath $targetFile
    $toAdd = @()
    foreach ($key in $Keys) {
        if (-not $Collected.ContainsKey($key)) { continue }
        $has = $existing.ContainsKey($key)
        $existingVal = if ($has) { $existing[$key] } else { $null }
        if (-not $has -or [string]::IsNullOrWhiteSpace($existingVal)) {
            $toAdd += @{ Key = $key; Value = $Collected[$key] }
        }
    }

    if ($toAdd.Count -eq 0) {
        Write-Host "OK  $app — no keys to add"
        continue
    }

    if ($WhatIf) {
        Write-Host "WhatIf: $app — would add: $(($toAdd | ForEach-Object { $_.Key }) -join ', ')"
        continue
    }

    $append = foreach ($item in $toAdd) { "$($item.Key)=$($item.Value)" }

    if (-not (Test-Path -LiteralPath $targetFile)) {
        $template = Join-Path $targetDir "env.local.template"
        if (Test-Path -LiteralPath $template) {
            Write-Host "Creating $app\.env.local from env.local.template"
            Copy-Item -LiteralPath $template -Destination $targetFile
        }
    }

    $content = ""
    if (Test-Path -LiteralPath $targetFile) {
        $content = Get-Content -LiteralPath $targetFile -Raw -Encoding UTF8
        if ($content) { $content = $content.TrimEnd() }
    }
    $nl = [Environment]::NewLine
    if ($content) { $content += $nl }
    $content += "# Added by sync-env-keys-to-apps.ps1" + $nl
    $content += ($append -join $nl) + $nl
    Set-Content -LiteralPath $targetFile -Value $content -Encoding UTF8 -NoNewline
    Write-Host "Updated $app — added: $(($toAdd | ForEach-Object { $_.Key }) -join ', ')"
}

Write-Host ""
Write-Host "Done. Run with -WhatIf to see what would be added without writing."
