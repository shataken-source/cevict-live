Set-StrictMode -Version Latest

function Get-KeyVaultPropValue {
  param(
    [Parameter(Mandatory = $true)] $Object,
    [Parameter(Mandatory = $true)] [string] $Name
  )
  if ($null -eq $Object) { return $null }
  $p = $Object.PSObject.Properties.Match($Name)
  if ($p -and $p.Count -gt 0) { return $p[0].Value }
  return $null
}

function Get-KeyVaultRepoRoot {
  $here = $PSScriptRoot
  # ...\scripts\keyvault -> ...\scripts -> repo root
  return (Split-Path -Parent (Split-Path -Parent $here))
}

function Get-KeyVaultStorePath {
  $root = Get-KeyVaultRepoRoot
  return (Join-Path $root 'vault\secrets\env-store.json')
}

function Read-KeyVaultJsonFile {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Path
  )
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
  # PowerShell 5.1 compatibility: ConvertFrom-Json may not support -Depth
  try {
    return ($raw | ConvertFrom-Json -Depth 50)
  } catch {
    return ($raw | ConvertFrom-Json)
  }
}

function Write-KeyVaultJsonFile {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Path,
    [Parameter(Mandatory = $true)]
    $Value
  )
  $dir = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }

  $json = $Value | ConvertTo-Json -Depth 50
  # Force UTF-8 without BOM for consistency.
  [System.IO.File]::WriteAllText($Path, $json + "`n", (New-Object System.Text.UTF8Encoding($false)))
}

function Get-KeyVaultStore {
  $path = Get-KeyVaultStorePath
  $store = Read-KeyVaultJsonFile -Path $path
  if ($null -eq $store) {
    return [pscustomobject]@{ version = 1; updated_at = (Get-Date).ToUniversalTime().ToString('o'); secrets = @{} }
  }
  if ($null -eq $store.secrets) { $store | Add-Member -NotePropertyName secrets -NotePropertyValue @{} -Force }
  return $store
}

function Save-KeyVaultStore {
  param([Parameter(Mandatory = $true)] $Store)
  $Store.updated_at = (Get-Date).ToUniversalTime().ToString('o')
  Write-KeyVaultJsonFile -Path (Get-KeyVaultStorePath) -Value $Store
}

function Get-KeyVaultSecret {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Name
  )
  $store = Get-KeyVaultStore
  $key = $Name.Trim()
  $v = Get-KeyVaultPropValue -Object $store.secrets -Name $key
  if ($null -ne $v) { return [string]$v }
  return $null
}

function Set-KeyVaultSecret {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Name,
    [Parameter(Mandatory = $true)]
    [string] $Value
  )
  $store = Get-KeyVaultStore
  $key = $Name.Trim()
  $store.secrets | Add-Member -NotePropertyName $key -NotePropertyValue $Value -Force
  Save-KeyVaultStore -Store $store
}

function Resolve-KeyVaultVarValue {
  param(
    [Parameter(Mandatory = $true)]
    $Spec,
    [Parameter(Mandatory = $true)]
    $StoreSecrets
  )

  # Spec can be:
  # - { from: "STORE_KEY", required: true|false }
  # - { fromAny: ["STORE_KEY_A","STORE_KEY_B"], required: true|false } (first non-empty wins)
  # - { literal: "value", required: false }
  # - string: interpreted as `from`
  if ($Spec -is [string]) {
    $fromKey = $Spec
    $sv = Get-KeyVaultPropValue -Object $StoreSecrets -Name $fromKey
    return [pscustomobject]@{ value = $sv; required = $true; source = "from:$fromKey" }
  }

  $required = $false
  $reqVal = Get-KeyVaultPropValue -Object $Spec -Name 'required'
  if ($null -ne $reqVal) { $required = [bool]$reqVal }

  $litVal = Get-KeyVaultPropValue -Object $Spec -Name 'literal'
  if ($null -ne $litVal) {
    return [pscustomobject]@{ value = [string]$litVal; required = $required; source = 'literal' }
  }

  $fromAny = Get-KeyVaultPropValue -Object $Spec -Name 'fromAny'
  if ($null -ne $fromAny) {
    foreach ($k in @($fromAny)) {
      $k2 = [string]$k
      if ([string]::IsNullOrWhiteSpace($k2)) { continue }
      $sv2 = Get-KeyVaultPropValue -Object $StoreSecrets -Name $k2
      if ($null -ne $sv2 -and -not [string]::IsNullOrWhiteSpace([string]$sv2)) {
        return [pscustomobject]@{ value = $sv2; required = $required; source = "fromAny:$k2" }
      }
    }
    return [pscustomobject]@{ value = $null; required = $required; source = "fromAny:(none)" }
  }

  $from = Get-KeyVaultPropValue -Object $Spec -Name 'from'
  if ($null -eq $from -or [string]::IsNullOrWhiteSpace([string]$from)) {
    return [pscustomobject]@{ value = $null; required = $required; source = 'missing-spec' }
  }
  $fromKey = [string]$from
  $sv = Get-KeyVaultPropValue -Object $StoreSecrets -Name $fromKey
  return [pscustomobject]@{ value = $sv; required = $required; source = "from:$fromKey" }
}

function Sync-KeyVaultEnvFromManifest {
  param(
    [Parameter(Mandatory = $true)]
    [string] $AppPath,
    [string] $ManifestPath,
    [switch] $DryRun,
    [switch] $IncludeMissingOptional,
    [switch] $AllowMissingRequired
  )

  $appFull = (Resolve-Path -LiteralPath $AppPath).Path
  $manifestFull =
    if ($ManifestPath) { (Resolve-Path -LiteralPath $ManifestPath).Path }
    else { Join-Path $appFull 'env.manifest.json' }

  if (-not (Test-Path -LiteralPath $manifestFull)) {
    throw "KeyVault manifest not found: $manifestFull"
  }

  $manifest = Read-KeyVaultJsonFile -Path $manifestFull
  if ($null -eq $manifest) { throw "Could not parse manifest JSON: $manifestFull" }

  $store = Get-KeyVaultStore
  $secrets = $store.secrets

  foreach ($out in @($manifest.outputs)) {
    $relFile = [string]$out.file
    if ([string]::IsNullOrWhiteSpace($relFile)) { continue }

    $target = Join-Path $appFull $relFile
    $lines = New-Object System.Collections.Generic.List[string]

    $lines.Add("# Generated by KeyVault. DO NOT EDIT BY HAND.")
    $lines.Add("# Source: vault\\secrets\\env-store.json (local-only)")
    $lines.Add("# Manifest: $(Split-Path -Leaf $manifestFull)")
    $lines.Add("")

    $vars = $out.vars
    $keys = @($vars.PSObject.Properties.Name) | Sort-Object

    foreach ($k in $keys) {
      $spec = $vars.$k
      $resolved = Resolve-KeyVaultVarValue -Spec $spec -StoreSecrets $secrets
      $val = $resolved.value

      if ($null -eq $val -or [string]::IsNullOrWhiteSpace([string]$val)) {
        if ($resolved.required) {
          if ($AllowMissingRequired -or $DryRun) {
            $lines.Add("# $k=  # MISSING ($($resolved.source))")
            continue
          }
          throw "Missing required secret for env var '$k' ($($resolved.source)) while generating $target"
        }
        if ($IncludeMissingOptional) {
          $lines.Add("# $k=")
        }
        continue
      }

      # Basic escaping: newline removal (env files are line-based)
      $safe = ([string]$val) -replace "(`r`n|`n|`r)", ' '
      $lines.Add("$k=$safe")
    }

    $content = ($lines -join "`n") + "`n"
    if ($DryRun) {
      Write-Host "----- $target -----"
      Write-Host $content
      continue
    }

    $dir = Split-Path -Parent $target
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($target, $content, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "Wrote $target"
  }
}

function Sync-KeyVaultAllApps {
  param(
    [switch] $DryRun,
    [switch] $IncludeMissingOptional
  )
  $root = Get-KeyVaultRepoRoot
  $apps = Join-Path $root 'apps'
  if (-not (Test-Path -LiteralPath $apps)) { throw "Apps folder not found: $apps" }

  $manifests = Get-ChildItem -Path $apps -Recurse -File -Filter 'env.manifest.json' -ErrorAction SilentlyContinue
  foreach ($m in $manifests) {
    Sync-KeyVaultEnvFromManifest -AppPath $m.Directory.FullName -ManifestPath $m.FullName -DryRun:$DryRun -IncludeMissingOptional:$IncludeMissingOptional
  }
}

Export-ModuleMember -Function `
  Get-KeyVaultRepoRoot, `
  Get-KeyVaultStorePath, `
  Get-KeyVaultStore, `
  Get-KeyVaultSecret, `
  Set-KeyVaultSecret, `
  Resolve-KeyVaultVarValue, `
  Sync-KeyVaultEnvFromManifest, `
  Sync-KeyVaultAllApps

