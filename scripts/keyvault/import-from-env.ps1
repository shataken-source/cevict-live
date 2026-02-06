# One-time import: read KEY=value from .env* files and merge into the KeyVault store.
# Use this to seed C:\Cevict_Vault\env-store.json from existing .env.local etc.
#
# Usage:
#   .\import-from-env.ps1
#     Uses default paths (repo root + apps with common app names).
#   .\import-from-env.ps1 -Paths "C:\cevict-live\apps\progno\.env.local","C:\cevict-live\.env"
#   .\import-from-env.ps1 -Overwrite
#     Overwrite existing store values; default is to only add missing keys.

param(
  [string[]] $Paths,
  [switch] $Overwrite,
  [switch] $DryRun
)

Set-StrictMode -Version Latest

$modulePath = Join-Path $PSScriptRoot 'KeyVault.psm1'
Import-Module $modulePath -Force

$root = Get-KeyVaultRepoRoot
$defaultPaths = @(
  (Join-Path $root '.env'),
  (Join-Path $root '.env.local'),
  (Join-Path $root 'cevict-live.env.local'),
  (Join-Path $root 'apps\progno\.env.local'),
  (Join-Path $root 'apps\prognostication\.env.local'),
  (Join-Path $root 'apps\gulfcoastcharters\.env.local'),
  (Join-Path $root 'apps\wheretovacation\.env.local'),
  (Join-Path $root 'apps\alpha-hunter\.env.local'),
  (Join-Path $root 'backups\_20260108_0711prognostication\.env.local')
)

$files = if ($Paths -and $Paths.Count -gt 0) { $Paths } else { $defaultPaths }

function Parse-EnvFile {
  param([string] $LiteralPath)
  $vars = @{}
  if (-not (Test-Path -LiteralPath $LiteralPath)) { return $vars }
  $lines = Get-Content -LiteralPath $LiteralPath -Encoding UTF8 -ErrorAction SilentlyContinue
  if (-not $lines) { return $vars }
  foreach ($line in $lines) {
    $line = $line.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { continue }
    if ($line -match '^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
      $key = $Matches[1]
      $raw = $Matches[2].Trim()
      if ($raw -match '^["''](.+)["'']\s*$') { $raw = $Matches[1] }
      $vars[$key] = $raw
    }
  }
  return $vars
}

$storePath = Get-KeyVaultStorePath
Write-Host "Target store: $storePath"

# Ensure store exists; normalize secrets to a hashtable for merge
$store = Get-KeyVaultStore
$merged = @{}
$existing = $store.secrets
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

foreach ($fp in $files) {
  if (-not (Test-Path -LiteralPath $fp)) { continue }
  Write-Host "Reading: $fp"
  $vars = Parse-EnvFile -LiteralPath $fp
  foreach ($k in $vars.Keys) {
    $v = $vars[$k]
    if ([string]::IsNullOrWhiteSpace($v)) { continue }
    $hasExisting = $merged.ContainsKey($k) -and -not [string]::IsNullOrWhiteSpace([string]$merged[$k])
    if ($hasExisting -and -not $Overwrite) {
      $skipped++
      continue
    }
    if ($DryRun) {
      if ($hasExisting) { Write-Host "  [would overwrite] $k" } else { Write-Host "  [would add] $k" }
      $updated++; continue
    }
    $merged[$k] = $v
    if ($hasExisting) { $updated++ } else { $added++ }
  }
}

$store.secrets = $merged

if (-not $DryRun -and ($added -gt 0 -or $updated -gt 0)) {
  Save-KeyVaultStore -Store $store
  Write-Host "Done. Added: $added, Updated: $updated, Skipped (already set): $skipped"
} elseif ($DryRun) {
  Write-Host "Dry run. Would add/update: $updated. Skipped (already set): $skipped"
} else {
  Write-Host "No changes (added: 0, updated: 0, skipped: $skipped). Use -Overwrite to replace existing values."
}
