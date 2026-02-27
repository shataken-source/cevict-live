param(
  [Parameter(Mandatory = $true)]
  [string] $App,
  [ValidateSet('development', 'preview', 'production')]
  [string] $Env = 'development',
  [string] $TargetsPath,
  [switch] $AllEnvs,
  [switch] $DryRun
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

function Get-RepoRoot { return (Get-KeyVaultRepoRoot) }

function Get-Targets {
  $root = Get-RepoRoot
  $defaultA = Join-Path $root 'config\keyvault.targets.json'
  $defaultB = Join-Path $root 'config\keyvault.targets.example.json'
  $pick = if ($TargetsPath) { $TargetsPath } elseif (Test-Path -LiteralPath $defaultA) { $defaultA } else { $defaultB }
  $t = Read-JsonFile -Path $pick
  if ($null -eq $t) { throw "Could not read targets file: $pick" }
  return $t
}

function Get-StoreSecrets {
  $store = Get-KeyVaultStore
  return $store.secrets
}

function Get-Prop($obj, [string]$name) {
  if ($null -eq $obj) { return $null }
  $p = $obj.PSObject.Properties.Match($name)
  if ($p -and $p.Count -gt 0) { return $p[0].Value }
  return $null
}

$targets = Get-Targets
$appCfg = Get-Prop $targets.apps $App
if ($null -eq $appCfg) { throw "App '$App' not found in targets config." }

$appPath = [string](Get-Prop $appCfg 'path')
if (-not $appPath) { throw "Missing apps.$App.path in targets config." }

$root = Get-RepoRoot
$absAppPath = Join-Path $root $appPath
$manifestPath = Join-Path $absAppPath 'env.manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath)) { throw "Missing manifest: $manifestPath" }

$manifest = Read-JsonFile -Path $manifestPath
if ($null -eq $manifest) { throw "Could not parse manifest JSON: $manifestPath" }

$vercel = Get-Prop $appCfg 'vercel'
$projectId = [string](Get-Prop $vercel 'projectId')
$teamId = [string](Get-Prop $vercel 'teamId')
if (-not $projectId) { throw "Missing apps.$App.vercel.projectId in targets config." }

$secrets = Get-StoreSecrets
$token = [string](Get-Prop $secrets 'VERCEL_TOKEN')
if (-not $token -and -not $DryRun) {
  throw "Missing VERCEL_TOKEN in KeyVault store (vault\\secrets\\env-store.json)."
}
if (-not $teamId) { $teamId = [string](Get-Prop $secrets 'VERCEL_TEAM_ID') }

function Invoke-VercelApi([string]$Method, [string]$Path, $Body) {
  $base = 'https://api.vercel.com'
  $uri = $base + $Path
  if ($teamId) {
    $joiner = if ($uri -like '*?*') { '&' } else { '?' }
    $uri = $uri + $joiner + 'teamId=' + [Uri]::EscapeDataString($teamId)
  }
  $headers = @{ Authorization = "Bearer $token" }
  if ($null -ne $Body) {
    $json = $Body | ConvertTo-Json -Depth 20
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType 'application/json' -Body $json
  }
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
}

function Get-VercelEnvVars {
  if ($DryRun) { return @() }
  $res = Invoke-VercelApi -Method 'GET' -Path "/v10/projects/$projectId/env" -Body $null
  return @($res.envs)
}

function Upsert-VercelEnvVar([string]$Key, [string]$Value) {
  if ($DryRun) {
    Write-Host "DRYRUN: set $Key for $Env"
    return
  }

  $existing = $existingEnvs | Where-Object { $_.key -eq $Key -and $_.target -contains $Env }
  if ($existing -and $existing.Count -gt 0) {
    # Delete + recreate is simplest (Vercel env updates are awkward across targets).
    foreach ($e in $existing) {
      Invoke-VercelApi -Method 'DELETE' -Path "/v9/projects/$projectId/env/$($e.id)" -Body $null | Out-Null
    }
  }

  $body = @{
    key    = $Key
    value  = $Value
    type   = 'encrypted'
    target = @($Env)
  }
  Invoke-VercelApi -Method 'POST' -Path "/v10/projects/$projectId/env" -Body $body | Out-Null
}

Write-Host "KeyVault -> Vercel sync"
Write-Host "App: $App"
Write-Host "Path: $absAppPath"
Write-Host "ProjectId: $projectId"
Write-Host "Env: $Env"
if ($teamId) { Write-Host "TeamId: $teamId" }
if ($DryRun) { Write-Host "Mode: DRY RUN (no API calls)" }

$envTargets = if ($AllEnvs) { @('development', 'preview', 'production') } else { @($Env) }

foreach ($currentEnv in $envTargets) {
  $script:Env = $currentEnv
  Write-Host "`n--- Pushing to: $currentEnv ---"

  $existingEnvs = Get-VercelEnvVars

  foreach ($out in @($manifest.outputs)) {
    if ([string]$out.file -ne '.env.local') { continue } # for now, only map .env.local output
    $vars = $out.vars
    $keys = @($vars.PSObject.Properties.Name) | Sort-Object
    foreach ($k in $keys) {
      $spec = $vars.$k
      $resolved = Resolve-KeyVaultVarValue -Spec $spec -StoreSecrets $secrets
      $val = $resolved.value

      if ($null -eq $val -or [string]::IsNullOrWhiteSpace([string]$val)) {
        if ($resolved.required) {
          Write-Host "SKIP (missing required): $k ($($resolved.source))"
        }
        else {
          # optional missing -> skip silently
        }
        continue
      }

      Upsert-VercelEnvVar -Key $k -Value ([string]$val)
    }
  }
}

Write-Host "`nDone. Pushed to: $($envTargets -join ', ')"

