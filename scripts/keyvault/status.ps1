param(
  [switch] $ShowValues,
  [switch] $Verbose
)

Set-StrictMode -Version Latest

$modulePath = Join-Path $PSScriptRoot 'KeyVault.psm1'
Import-Module $modulePath -Force

function Read-JsonFile([string] $Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
  try { return ($raw | ConvertFrom-Json -Depth 50) } catch { return ($raw | ConvertFrom-Json) }
}

function Get-Prop($obj, [string]$name) {
  if ($null -eq $obj) { return $null }
  $p = $obj.PSObject.Properties.Match($name)
  if ($p -and $p.Count -gt 0) { return $p[0].Value }
  return $null
}

# ─── Store info ───
$storePath = Get-KeyVaultStorePath
$store = Get-KeyVaultStore
$secretNames = @($store.secrets.PSObject.Properties.Name) | Sort-Object
$totalSecrets = $secretNames.Count

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "       KeyVault Status Dashboard            " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Store: $storePath"
Write-Host "Updated: $($store.updated_at)"
Write-Host "Total secrets: $totalSecrets"

# Show placeholder/empty secrets
$placeholders = @()
$empty = @()
foreach ($name in $secretNames) {
  $val = [string](Get-Prop $store.secrets $name)
  if ([string]::IsNullOrWhiteSpace($val)) {
    $empty += $name
  }
  elseif ($val -match '^(your[-_]|YOUR[-_]|xxx|placeholder|TODO|REPLACE|CHANGEME)') {
    $placeholders += $name
  }
}

if ($placeholders.Count -gt 0) {
  Write-Host ""
  Write-Host "[!] Placeholder values ($($placeholders.Count)):" -ForegroundColor Yellow
  foreach ($p in $placeholders) { Write-Host "  - $p" -ForegroundColor Yellow }
}
if ($empty.Count -gt 0) {
  Write-Host ""
  Write-Host "[!] Empty values ($($empty.Count)):" -ForegroundColor Yellow
  foreach ($e in $empty) { Write-Host "  - $e" -ForegroundColor Yellow }
}

$realSecrets = $totalSecrets - $placeholders.Count - $empty.Count
Write-Host ""
Write-Host "[OK] Real secrets: $realSecrets / $totalSecrets" -ForegroundColor Green

# ─── Targets info ───
$root = Get-KeyVaultRepoRoot
$targetsPath = Join-Path $root 'config\keyvault.targets.json'
if (Test-Path -LiteralPath $targetsPath) {
  $targets = Read-JsonFile -Path $targetsPath
  if ($null -ne $targets -and $null -ne $targets.apps) {
    $appNames = @($targets.apps.PSObject.Properties.Name) | Sort-Object
    Write-Host ""
    Write-Host "--- Configured Apps ($($appNames.Count)) ---" -ForegroundColor Cyan

    foreach ($appName in $appNames) {
      $cfg = $targets.apps.$appName
      $path = [string](Get-Prop $cfg 'path')
      $vercel = Get-Prop $cfg 'vercel'
      $pid2 = if ($vercel) { [string](Get-Prop $vercel 'projectId') } else { '' }
      $hasManifest = Test-Path -LiteralPath (Join-Path $root "$path\env.manifest.json")

      $pidLabel = if ($pid2 -and $pid2 -notmatch 'YOUR_') { "[OK] $pid2" } else { "[X] missing" }
      $mLabel = if ($hasManifest) { "[OK]" } else { "[X]" }

      Write-Host ""
      Write-Host "  $appName" -ForegroundColor White
      Write-Host "    Path:     $path"
      Write-Host "    Vercel:   $pidLabel"
      Write-Host "    Manifest: $mLabel"

      if ($hasManifest -and $Verbose) {
        $manifestPath = Join-Path $root "$path\env.manifest.json"
        $manifest = Read-JsonFile -Path $manifestPath
        foreach ($out in @($manifest.outputs)) {
          $vars = $out.vars
          $keys = @($vars.PSObject.Properties.Name) | Sort-Object
          $missing = @()
          $present = @()
          foreach ($k in $keys) {
            $spec = $vars.$k
            $resolved = Resolve-KeyVaultVarValue -Spec $spec -StoreSecrets $store.secrets
            if ($null -eq $resolved.value -or [string]::IsNullOrWhiteSpace([string]$resolved.value)) {
              $missing += $k
            }
            else {
              $present += $k
            }
          }
          Write-Host "    Env vars: $($present.Count) present, $($missing.Count) missing" -ForegroundColor $(if ($missing.Count -eq 0) { 'Green' } else { 'Yellow' })
          if ($missing.Count -gt 0) {
            foreach ($m in $missing) { Write-Host "      [X] $m" -ForegroundColor Yellow }
          }
        }
      }
    }
  }
}
else {
  Write-Host ""
  Write-Host "No keyvault.targets.json found at $targetsPath" -ForegroundColor Yellow
}

if ($ShowValues) {
  Write-Host ""
  Write-Host "--- All Secrets ---" -ForegroundColor Cyan
  foreach ($name in $secretNames) {
    $val = [string](Get-Prop $store.secrets $name)
    $display = if ($val.Length -gt 40) { $val.Substring(0, 20) + '...' + $val.Substring($val.Length - 10) } else { $val }
    Write-Host "  $name = $display"
  }
}

Write-Host ""
