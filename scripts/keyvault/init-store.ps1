param(
  [string] $StorePath,
  [switch] $Force
)

Set-StrictMode -Version Latest

$modulePath = Join-Path $PSScriptRoot 'KeyVault.psm1'
Import-Module $modulePath -Force

function Get-RepoRoot { return (Get-KeyVaultRepoRoot) }

$root = Get-RepoRoot
$example = Join-Path $root 'docs\keyvault\env-store.example.json'
if (-not (Test-Path -LiteralPath $example)) {
  $example = Join-Path $root 'config\env-store.example.json'
}
if (-not (Test-Path -LiteralPath $example)) { throw "Missing example store file (tried docs\keyvault\ and config\)." }

if (-not $StorePath) {
  $StorePath = Get-KeyVaultStorePath
}

$dir = Split-Path -Parent $StorePath
if (-not (Test-Path -LiteralPath $dir)) {
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

if ((Test-Path -LiteralPath $StorePath) -and -not $Force) {
  Write-Host "Store already exists: $StorePath"
  Write-Host "Use -Force to overwrite."
  exit 0
}

if ($Force) {
  Write-Host ""
  Write-Host "DESTRUCTIVE: -Force will REPLACE the store with the example and WIPE ALL EXISTING SECRETS." -ForegroundColor Red
  Write-Host "Target: $StorePath" -ForegroundColor Yellow
  Write-Host "If you need to keep keys, back up the file first or do not use -Force." -ForegroundColor Yellow
  Write-Host ""
}

Copy-Item -LiteralPath $example -Destination $StorePath -Force
Write-Host "Created KeyVault store: $StorePath"
Write-Host "Now edit it and fill in real values."

