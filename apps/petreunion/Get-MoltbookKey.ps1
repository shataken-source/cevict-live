# Resolve Moltbook API key from multiple sources (petreunion .env.local, moltbook-viewer .env.local, MOLTBOOK_AGENTS_JSON).
# Use: . .\Get-MoltbookKey.ps1; $key = Get-MoltbookKey; if (-not $key) { exit 1 }
# Or: $key = & { . (Join-Path $PSScriptRoot 'Get-MoltbookKey.ps1'); Get-MoltbookKey }
$ErrorActionPreference = "Stop"
$script:RepoRoot = if ($PSScriptRoot) { (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path } else { (Resolve-Path ".\..\..").Path }

function Get-MoltbookKeyFromEnvFile([string]$envPath) {
  if (-not (Test-Path -LiteralPath $envPath)) { return $null }
  $keyLine = Get-Content $envPath -ErrorAction SilentlyContinue | Where-Object { $_ -match "^\s*MOLTBOOK_API_KEY\s*=" } | Select-Object -First 1
  if ($keyLine) {
    $k = ($keyLine -replace "^\s*MOLTBOOK_API_KEY\s*=", "").Split("#")[0].Trim().Trim('"').Trim("'")
    if ($k) { return $k }
  }
  $agentsLine = Get-Content $envPath -ErrorAction SilentlyContinue | Where-Object { $_ -match "^\s*MOLTBOOK_AGENTS_JSON\s*=" } | Select-Object -First 1
  if ($agentsLine) {
    $jsonStr = ($agentsLine -replace "^\s*MOLTBOOK_AGENTS_JSON\s*=", "").Trim().Trim('"').Trim("'")
    try {
      $arr = $jsonStr | ConvertFrom-Json
      if ($arr -and $arr[0].key) { return $arr[0].key.Trim() }
    } catch {}
  }
  return $null
}

function Get-MoltbookKey {
  $petreunionEnv = Join-Path $script:RepoRoot "apps\petreunion\.env.local"
  $viewerEnv = Join-Path $script:RepoRoot "apps\moltbook-viewer\.env.local"
  $k = Get-MoltbookKeyFromEnvFile $petreunionEnv
  if (-not $k) { $k = Get-MoltbookKeyFromEnvFile $viewerEnv }
  return $k
}
