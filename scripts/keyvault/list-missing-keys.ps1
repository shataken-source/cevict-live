<#
.SYNOPSIS
  Lists which env keys from app manifests are missing from the KeyVault store.
  Optionally prints values for present keys (-ShowValues).

.PARAMETER AppPath
  Optional. Check one app only (e.g. .\apps\monitor). If omitted, checks monitor, launchpad, moltbook-viewer.

.PARAMETER ShowValues
  If set, prints the actual value for each key (present or "MISSING"). Use only on a private machine.
#>
param(
  [string] $AppPath,
  [switch] $ShowValues
)

Set-StrictMode -Version Latest

$modulePath = Join-Path $PSScriptRoot 'KeyVault.psm1'
Import-Module $modulePath -Force

function Read-JsonSafe([string]$Path) {
  try {
    $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
    return ($raw | ConvertFrom-Json)
  } catch {
    return $null
  }
}

function Get-Prop($obj, [string]$name) {
  if ($null -eq $obj) { return $null }
  $p = $obj.PSObject.Properties.Match($name)
  if ($p -and $p.Count -gt 0) { return $p[0].Value }
  return $null
}

function Get-SecretValue($secrets, [string]$key) {
  $v = Get-Prop $secrets $key
  if ($null -eq $v) { return $null }
  $s = [string]$v
  if ([string]::IsNullOrWhiteSpace($s)) { return $null }
  return $s
}

function Get-SpecCandidates($spec) {
  if ($spec -is [string]) { return @([string]$spec) }
  $fa = Get-Prop $spec 'fromAny'
  if ($null -ne $fa) { return @($fa | ForEach-Object { [string]$_ }) }
  $f = Get-Prop $spec 'from'
  if ($null -ne $f) { return @([string]$f) }
  return @()
}

$storePath = Get-KeyVaultStorePath
Write-Host "KeyVault list-missing-keys"
Write-Host "Store: $storePath"
if ($ShowValues) { Write-Host "ShowValues: ON (values will be printed)" }
Write-Host ""

if (-not (Test-Path -LiteralPath $storePath)) {
  Write-Host "ERROR: store file not found."
  exit 1
}

$store = Read-JsonSafe -Path $storePath
if ($null -eq $store) {
  Write-Host "ERROR: store file is not valid JSON."
  exit 1
}

$secrets = Get-Prop $store 'secrets'
if ($null -eq $secrets) {
  Write-Host "ERROR: store JSON is missing top-level 'secrets' object."
  exit 1
}

$repoRoot = Get-KeyVaultRepoRoot
$appsToCheck = @()
if ($AppPath) {
  $appsToCheck = @( (Resolve-Path -LiteralPath $AppPath).Path )
} else {
  $appsToCheck = @(
    (Join-Path $repoRoot 'apps\monitor'),
    (Join-Path $repoRoot 'apps\launchpad'),
    (Join-Path $repoRoot 'apps\moltbook-viewer'),
    (Join-Path $repoRoot 'apps\petreunion')
  )
}

$totalMissing = 0
foreach ($appFull in $appsToCheck) {
  $appName = Split-Path -Leaf $appFull
  $manifestPath = Join-Path $appFull 'env.manifest.json'
  if (-not (Test-Path -LiteralPath $manifestPath)) {
    Write-Host "[$appName] No env.manifest.json, skipping."
    continue
  }

  $manifest = Read-JsonSafe -Path $manifestPath
  if ($null -eq $manifest) {
    Write-Host "[$appName] Invalid manifest JSON, skipping."
    continue
  }

  $outs = @($manifest.outputs)
  $missingInApp = New-Object System.Collections.Generic.List[string]
  $allVars = New-Object System.Collections.Generic.List[object]

  foreach ($out in $outs) {
    $vars = $out.vars
    if ($null -eq $vars) { continue }
    foreach ($k in $vars.PSObject.Properties.Name) {
      $spec = $vars.$k
      $cands = Get-SpecCandidates $spec
      $value = $null
      $storeKeyUsed = $null
      foreach ($c in $cands) {
        $v = Get-SecretValue $secrets $c
        if ($null -ne $v) { $value = $v; $storeKeyUsed = $c; break }
      }
      $allVars.Add([PSCustomObject]@{ VarName = $k; StoreKeys = $cands; Value = $value; StoreKeyUsed = $storeKeyUsed }) | Out-Null
      if ($null -eq $value) {
        $missingInApp.Add("$k (store keys: " + ($cands -join ', ') + ")") | Out-Null
      }
    }
  }

  Write-Host "=== $appName ==="
  if ($missingInApp.Count -gt 0) {
    $totalMissing += $missingInApp.Count
    Write-Host "MISSING ($($missingInApp.Count)):"
    $missingInApp | ForEach-Object { Write-Host "  - $_" }
  } else {
    Write-Host "All manifest keys present in store."
  }

  if ($ShowValues) {
    Write-Host "Values:"
    foreach ($o in $allVars) {
      $display = if ($null -ne $o.Value) { $o.Value } else { "MISSING" }
      Write-Host "  $($o.VarName) = $display"
    }
  }
  Write-Host ""
}

if ($totalMissing -gt 0) {
  Write-Host "Total missing across apps: $totalMissing"
} else {
  Write-Host "All checked apps: every manifest key has a value in the store."
}
