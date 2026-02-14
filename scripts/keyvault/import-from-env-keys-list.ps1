# Import env keys into KeyVault store by reading values from the files listed in env-keys-sorted.txt
# (or a key list file in the same format: KEY \t HAS_VALUE \t FILE(S) \t ...).
#
# For each key with HAS_VALUE=yes, picks the first existing source file (preferring current apps over backups),
# reads KEY=value from that file, and adds/updates the key in the KeyVault store.
#
# Usage:
#   .\import-from-env-keys-list.ps1
#     Uses C:\cevict-live\env-keys-sorted.txt
#   .\import-from-env-keys-list.ps1 -InputFile "C:\cevict-live\env-keys-sorted.txt"
#   .\import-from-env-keys-list.ps1 -Overwrite
#   .\import-from-env-keys-list.ps1 -DryRun

param(
  [string] $InputFile = "",
  [switch] $Overwrite,
  [switch] $DryRun
)

Set-StrictMode -Version Latest

$modulePath = Join-Path $PSScriptRoot 'KeyVault.psm1'
Import-Module $modulePath -Force

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if (-not $InputFile) {
  $InputFile = Join-Path $root 'env-keys-sorted.txt'
}

if (-not (Test-Path -LiteralPath $InputFile)) {
  Write-Error "Input file not found: $InputFile"
  exit 1
}

$storePath = Get-KeyVaultStorePath
Write-Host "Key list: $InputFile"
Write-Host "Target store: $storePath"
Write-Host ""

function Get-PreferredSourcePath {
  param([string[]] $RelativePaths)
  # Prefer: under apps\ (current), root .env; avoid backups, old-cevict-monorepo, _wt_
  $prefer = @()
  $fallback = @()
  foreach ($r in $RelativePaths) {
    $r = $r.Trim()
    if ([string]::IsNullOrWhiteSpace($r)) { continue }
    $full = Join-Path $root $r
    if (-not (Test-Path -LiteralPath $full)) { continue }
    if ($r -match '^backups\\' -or $r -match 'old-cevict-monorepo\\' -or $r -match '^_wt_') {
      $fallback += $full
    } else {
      $prefer += $full
    }
  }
  if ($prefer.Count -gt 0) { return $prefer[0] }
  if ($fallback.Count -gt 0) { return $fallback[0] }
  return $null
}

function Get-ValueFromEnvFile {
  param(
    [string] $LiteralPath,
    [string] $Key
  )
  if (-not (Test-Path -LiteralPath $LiteralPath)) { return $null }
  $lines = Get-Content -LiteralPath $LiteralPath -Encoding UTF8 -ErrorAction SilentlyContinue
  if (-not $lines) { return $null }
  foreach ($line in $lines) {
    $line = $line.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { continue }
    if ($line -match '^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
      if ($Matches[1] -ceq $Key) {
        $raw = $Matches[2].Trim()
        if ($raw -match '^["''](.+)["'']\s*$') { $raw = $Matches[1] }
        return $raw
      }
    }
  }
  return $null
}

$store = Get-KeyVaultStore
$existing = $store.secrets
$merged = @{}
if ($existing) {
  if ($existing -is [hashtable]) {
    foreach ($k in $existing.Keys) { $merged[$k] = $existing[$k] }
  } else {
    foreach ($p in $existing.PSObject.Properties) { $merged[$p.Name] = $p.Value }
  }
}

$added = 0
$updated = 0
$skipped = 0
$missing = 0
$noValue = 0

$lines = Get-Content -LiteralPath $InputFile -Encoding UTF8
foreach ($line in $lines) {
  $line = $line.Trim()
  if ($line -eq '' -or $line.StartsWith('#')) { continue }
  $cols = $line -split "`t", 4
  if ($cols.Count -lt 3) { continue }
  $key = $cols[0].Trim()
  $hasValue = $cols[1].Trim().ToLowerInvariant()
  $filesStr = $cols[2].Trim()
  if ($key -eq 'KEY' -or $key -eq '---' -or [string]::IsNullOrWhiteSpace($key)) { continue }
  if ($hasValue -ne 'yes') { continue }

  $fileList = $filesStr -split ';\s*' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
  $sourcePath = Get-PreferredSourcePath -RelativePaths $fileList
  if (-not $sourcePath) {
    $missing++
    if ($DryRun) { Write-Host "[no source file] $key" }
    continue
  }

  $value = Get-ValueFromEnvFile -LiteralPath $sourcePath -Key $key
  if ([string]::IsNullOrWhiteSpace($value)) {
    $noValue++
    continue
  }

  $hasExisting = $merged.ContainsKey($key) -and -not [string]::IsNullOrWhiteSpace([string]$merged[$key])
  if ($hasExisting -and -not $Overwrite) {
    $skipped++
    continue
  }

  if ($DryRun) {
    if ($hasExisting) { Write-Host "[would overwrite] $key" } else { Write-Host "[would add] $key" }
    $updated++
    continue
  }

  $merged[$key] = $value
  if ($hasExisting) { $updated++ } else { $added++ }
}

if (-not $DryRun -and ($added -gt 0 -or $updated -gt 0)) {
  $store.secrets = $merged
  Save-KeyVaultStore -Store $store
  Write-Host "Done. Added: $added, Updated: $updated, Skipped (already set): $skipped, No source file: $missing, Empty value: $noValue"
} elseif ($DryRun) {
  Write-Host "Dry run. Would add/update: $updated. Skipped: $skipped, No source: $missing, Empty value: $noValue"
} else {
  Write-Host "No changes. Added: 0, Updated: 0, Skipped: $skipped, No source file: $missing, Empty value: $noValue. Use -Overwrite to replace existing."
}
