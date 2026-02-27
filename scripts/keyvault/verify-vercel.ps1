param(
  [Parameter(Mandatory = $true)]
  [string] $App,
  [ValidateSet('development', 'preview', 'production')]
  [string] $Env = 'production',
  [string] $TargetsPath
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

# ─── Load targets ───
$root = Get-KeyVaultRepoRoot
$defaultA = Join-Path $root 'config\keyvault.targets.json'
$defaultB = Join-Path $root 'config\keyvault.targets.example.json'
$pick = if ($TargetsPath) { $TargetsPath } elseif (Test-Path -LiteralPath $defaultA) { $defaultA } else { $defaultB }
$targets = Read-JsonFile -Path $pick
if ($null -eq $targets) { throw "Could not read targets file: $pick" }

$appCfg = Get-Prop $targets.apps $App
if ($null -eq $appCfg) { throw "App '$App' not found in targets config." }

$appPath = [string](Get-Prop $appCfg 'path')
$absAppPath = Join-Path $root $appPath
$manifestPath = Join-Path $absAppPath 'env.manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath)) { throw "Missing manifest: $manifestPath" }

$manifest = Read-JsonFile -Path $manifestPath

$vercel = Get-Prop $appCfg 'vercel'
$projectId = [string](Get-Prop $vercel 'projectId')
$teamId = [string](Get-Prop $vercel 'teamId')
if (-not $projectId) { throw "Missing apps.$App.vercel.projectId" }

$store = Get-KeyVaultStore
$secrets = $store.secrets
$token = [string](Get-Prop $secrets 'VERCEL_TOKEN')
if (-not $token) { throw "Missing VERCEL_TOKEN in KeyVault store." }
if (-not $teamId) { $teamId = [string](Get-Prop $secrets 'VERCEL_TEAM_ID') }

# ─── Fetch Vercel env vars ───
function Invoke-VercelGet([string]$Path) {
  $base = 'https://api.vercel.com'
  $uri = $base + $Path
  if ($teamId) {
    $joiner = if ($uri -like '*?*') { '&' } else { '?' }
    $uri = $uri + $joiner + 'teamId=' + [Uri]::EscapeDataString($teamId)
  }
  return Invoke-RestMethod -Method 'GET' -Uri $uri -Headers @{ Authorization = "Bearer $token" }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "     KeyVault <-> Vercel Verification       " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "App: $App"
Write-Host "ProjectId: $projectId"
Write-Host "Env: $Env"
Write-Host ""

$res = Invoke-VercelGet -Path "/v10/projects/$projectId/env"
$vercelEnvs = @($res.envs)

# Build lookup: key -> value for the target environment
$vercelMap = @{}
foreach ($e in $vercelEnvs) {
  if ($e.target -contains $Env) {
    $vercelMap[$e.key] = $e
  }
}

# ─── Compare ───
$ok = 0
$mismatch = 0
$missingVercel = 0
$extraVercel = 0

$manifestKeys = @()

foreach ($out in @($manifest.outputs)) {
  if ([string]$out.file -ne '.env.local') { continue }
  $vars = $out.vars
  $keys = @($vars.PSObject.Properties.Name) | Sort-Object
  $manifestKeys = $keys

  foreach ($k in $keys) {
    $spec = $vars.$k
    $resolved = Resolve-KeyVaultVarValue -Spec $spec -StoreSecrets $secrets
    $kvVal = [string]$resolved.value

    if ([string]::IsNullOrWhiteSpace($kvVal)) {
      # No value in store — skip
      continue
    }

    if (-not $vercelMap.ContainsKey($k)) {
      Write-Host "  [X] MISSING in Vercel: $k" -ForegroundColor Red
      $missingVercel++
      continue
    }

    # Vercel encrypted env vars can't be read back — we can only confirm the key exists
    # The Vercel API returns decrypted=false for encrypted vars
    $vEntry = $vercelMap[$k]
    $vType = [string]$vEntry.type

    if ($vType -eq 'encrypted') {
      Write-Host "  [OK] $k (encrypted -- value cannot be compared)" -ForegroundColor Green
      $ok++
    }
    elseif ([string]$vEntry.value -eq $kvVal) {
      Write-Host "  [OK] $k (values match)" -ForegroundColor Green
      $ok++
    }
    else {
      Write-Host "  [!!] $k (VALUE MISMATCH -- store vs Vercel differ)" -ForegroundColor Yellow
      $mismatch++
    }
  }
}

# Check for extra vars in Vercel not in manifest
foreach ($vKey in $vercelMap.Keys) {
  if ($vKey -notin $manifestKeys) {
    Write-Host "  [i] Extra in Vercel (not in manifest): $vKey" -ForegroundColor DarkGray
    $extraVercel++
  }
}

Write-Host ""
Write-Host "--- Summary ---" -ForegroundColor Cyan
Write-Host "  [OK] Matched/present: $ok" -ForegroundColor Green
if ($mismatch -gt 0) { Write-Host "  [!!] Mismatched: $mismatch" -ForegroundColor Yellow }
if ($missingVercel -gt 0) { Write-Host "  [X] Missing in Vercel: $missingVercel" -ForegroundColor Red }
if ($extraVercel -gt 0) { Write-Host "  [i] Extra in Vercel: $extraVercel" -ForegroundColor DarkGray }

if ($missingVercel -gt 0) {
  Write-Host ""
  Write-Host "Run: .\push-vercel.ps1 -App $App -Env $Env" -ForegroundColor Yellow
  Write-Host "to sync missing vars to Vercel." -ForegroundColor Yellow
}

Write-Host ""
