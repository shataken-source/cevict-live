param(
  [string] $AppPath
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
Write-Host "KeyVault doctor"
Write-Host "Store path: $storePath"

if (-not (Test-Path -LiteralPath $storePath)) {
  Write-Host "ERROR: store file not found."
  Write-Host "Create it with: .\\scripts\\keyvault\\init-store.ps1 -StorePath `"$storePath`""
  exit 1
}

$store = Read-JsonSafe -Path $storePath
if ($null -eq $store) {
  Write-Host "ERROR: store file is not valid JSON."
  Write-Host "Fix: ensure double-quotes and valid JSON (not single quotes)."
  exit 1
}

$secrets = Get-Prop $store 'secrets'
if ($null -eq $secrets) {
  Write-Host "ERROR: store JSON is missing top-level 'secrets' object."
  exit 1
}

$secretNames = @($secrets.PSObject.Properties.Name)
Write-Host ("Secrets keys found: " + $secretNames.Count)
Write-Host ("Has SUPABASE_URL: " + [bool](Get-SecretValue $secrets 'SUPABASE_URL' -or Get-SecretValue $secrets 'NEXT_PUBLIC_SUPABASE_URL'))
Write-Host ("Has SUPABASE_ANON_KEY: " + [bool](Get-SecretValue $secrets 'SUPABASE_ANON_KEY' -or Get-SecretValue $secrets 'NEXT_PUBLIC_SUPABASE_ANON_KEY'))
Write-Host ("Has SUPABASE_SERVICE_ROLE_KEY: " + [bool](Get-SecretValue $secrets 'SUPABASE_SERVICE_ROLE_KEY' -or Get-SecretValue $secrets 'SUPABASE_SERVICE_KEY'))

if ($AppPath) {
  $appFull = (Resolve-Path -LiteralPath $AppPath).Path
  $manifestPath = Join-Path $appFull 'env.manifest.json'
  if (-not (Test-Path -LiteralPath $manifestPath)) {
    Write-Host "ERROR: env.manifest.json not found at $manifestPath"
    exit 1
  }

  $manifest = Read-JsonSafe -Path $manifestPath
  if ($null -eq $manifest) {
    Write-Host "ERROR: manifest is not valid JSON: $manifestPath"
    exit 1
  }

  $outs = @($manifest.outputs)
  foreach ($out in $outs) {
    $vars = $out.vars
    if ($null -eq $vars) { continue }
    $keys = @($vars.PSObject.Properties.Name) | Sort-Object
    $missing = New-Object System.Collections.Generic.List[string]

    foreach ($k in $keys) {
      $spec = $vars.$k
      $req = $false
      $reqVal = Get-Prop $spec 'required'
      if ($null -ne $reqVal) { $req = [bool]$reqVal }

      if (-not $req) { continue }
      $cands = Get-SpecCandidates $spec
      $ok = $false
      foreach ($c in $cands) {
        if (Get-SecretValue $secrets $c) { $ok = $true; break }
      }
      if (-not $ok) {
        $missing.Add("$k (store keys tried: " + ($cands -join ', ') + ")") | Out-Null
      }
    }

    if ($missing.Count -gt 0) {
      Write-Host "Missing required for $($out.file):"
      $missing | ForEach-Object { Write-Host ("- " + $_) }
      exit 1
    }
  }
  Write-Host "Manifest required keys: OK"
}

Write-Host "OK"

