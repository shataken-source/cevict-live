param(
  [string] $AppPath,
  [string] $ManifestPath,
  [switch] $All,
  [switch] $DryRun,
  [switch] $IncludeMissingOptional,
  [switch] $AllowMissingRequired
)

Set-StrictMode -Version Latest

$modulePath = Join-Path $PSScriptRoot 'KeyVault.psm1'
Import-Module $modulePath -Force

$storePath = Get-KeyVaultStorePath
Write-Host "Using store: $storePath"

if ($All) {
  Sync-KeyVaultAllApps -DryRun:$DryRun -IncludeMissingOptional:$IncludeMissingOptional
  exit 0
}

if (-not $AppPath) {
  throw "Provide -AppPath .\\apps\\<app> or use -All"
}

Sync-KeyVaultEnvFromManifest -AppPath $AppPath -ManifestPath $ManifestPath -DryRun:$DryRun -IncludeMissingOptional:$IncludeMissingOptional -AllowMissingRequired:$AllowMissingRequired

