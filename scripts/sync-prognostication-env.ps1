# Sync all env keys Prognostication needs from existing .env files into apps\prognostication\.env.local.
# No copy-paste: reads from root/progno/gcc/etc. and writes only missing keys.
# Usage: .\sync-prognostication-env.ps1 [-WhatIf]
# Backup: creates .env.local.backup-YYYYMMDD-HHmmss before changing.

param(
    [string]$Root = "C:\cevict-live",
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

# Keys Prognostication uses (from ENV-KEYS-QUICK-REFERENCE / ENV-KEYS-REFERENCE)
$PrognosticationKeys = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "PROGNO_BASE_URL",
    "STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID",
    "NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID",
    "NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID",
    "NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "DISCORD_WEBHOOK_URL",
    "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION",
    "NEXT_PUBLIC_BASE_URL",
    "NEXT_PUBLIC_KALSHI_REFERRAL_CODE",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY"
)

# Source files (first non-empty value per key wins)
$SourcePaths = @(
    (Join-Path $Root ".env.local"),
    (Join-Path $Root ".env.local.backup"),
    (Join-Path $Root "apps\progno\.env.local"),
    (Join-Path $Root "apps\gulfcoastcharters\.env.local"),
    (Join-Path $Root "apps\petreunion\.env.local"),
    (Join-Path $Root "apps\wheretovacation\.env.local"),
    (Join-Path $Root "apps\prognostication\progno-massager\.env.local"),
    (Join-Path $Root "apps\alpha-hunter\.env.local")
)

$TargetDir = Join-Path $Root "apps\prognostication"
$TargetFile = Join-Path $TargetDir ".env.local"

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
foreach ($key in $PrognosticationKeys) {
    foreach ($src in $SourcePaths) {
        $val = Get-EnvKeyValue -FilePath $src -Key $key
        if ($val -ne $null -and $val -ne "") {
            $Collected[$key] = $val
            break
        }
    }
}

Write-Host "Prognostication env sync (no copy-paste)"
Write-Host "Sources: root, progno, gcc, petreunion, wheretovacation, progno-massager, alpha-hunter"
Write-Host "Target:  apps\prognostication\.env.local"
Write-Host ""

Write-Host "Collected (first non-empty wins):"
foreach ($k in $PrognosticationKeys) {
    if ($Collected.ContainsKey($k)) {
        $preview = if ($Collected[$k].Length -gt 16) { $Collected[$k].Substring(0, 12) + "..." } else { $Collected[$k] }
        Write-Host "  $k = $preview"
    } else {
        Write-Host "  $k = (not found)"
    }
}
Write-Host ""

if (-not (Test-Path -LiteralPath $TargetDir -PathType Container)) {
    Write-Host "Error: $TargetDir not found."
    exit 1
}

$existing = Get-AllKeysInFile -FilePath $TargetFile
$toAdd = @()
foreach ($key in $PrognosticationKeys) {
    if (-not $Collected.ContainsKey($key)) { continue }
    $has = $existing.ContainsKey($key)
    $existingVal = if ($has) { $existing[$key] } else { $null }
    if (-not $has -or [string]::IsNullOrWhiteSpace($existingVal)) {
        $toAdd += @{ Key = $key; Value = $Collected[$key] }
    }
}

if ($toAdd.Count -eq 0) {
    Write-Host "OK  prognostication — no keys to add (all set or already present)."
    exit 0
}

if ($WhatIf) {
    Write-Host "WhatIf: would add to prognostication: $(($toAdd | ForEach-Object { $_.Key }) -join ', ')"
    exit 0
}

# Backup
if (Test-Path -LiteralPath $TargetFile -PathType Leaf) {
    $backupSuffix = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupFile = Join-Path $TargetDir ".env.local.backup-$backupSuffix"
    Copy-Item -LiteralPath $TargetFile -Destination $backupFile -Force
    Write-Host "Backup: .env.local -> .env.local.backup-$backupSuffix"
}

# Append missing keys
$content = ""
if (Test-Path -LiteralPath $TargetFile) {
    $content = Get-Content -LiteralPath $TargetFile -Raw -Encoding UTF8
    if ($content) { $content = $content.TrimEnd() }
}
$nl = [Environment]::NewLine
if ($content) { $content += $nl }
$content += "# Added by sync-prognostication-env.ps1" + $nl
$content += ($toAdd | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join $nl
$content += $nl
Set-Content -LiteralPath $TargetFile -Value $content -Encoding UTF8 -NoNewline

Write-Host "Updated prognostication — added: $(($toAdd | ForEach-Object { $_.Key }) -join ', ')"
Write-Host "Done. Run with -WhatIf to see what would be added without writing."
