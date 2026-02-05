param(
  [Parameter(Mandatory = $true)]
  [string] $Name,
  [Parameter(Mandatory = $true)]
  [string] $Value
)

Set-StrictMode -Version Latest

$modulePath = Join-Path $PSScriptRoot 'KeyVault.psm1'
Import-Module $modulePath -Force

Set-KeyVaultSecret -Name $Name -Value $Value
Write-Host "Saved secret '$Name' into $(Get-KeyVaultStorePath)"

