$ErrorActionPreference = "Stop"

param(
  [string]$States = "AL",
  [int]$MaxPets = 200,
  [int]$MaxPages = 5,
  [string]$MatcherUrl = "",
  [switch]$NoSave
)

function Import-DotEnv {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return }

  $lines = Get-Content -LiteralPath $Path -ErrorAction SilentlyContinue
  foreach ($line in $lines) {
    if (-not $line) { continue }
    $trim = $line.Trim()
    if ($trim.StartsWith("#")) { continue }
    if ($trim -notmatch "^[A-Za-z_][A-Za-z0-9_]*=") { continue }
    $idx = $trim.IndexOf("=")
    if ($idx -lt 1) { continue }
    $key = $trim.Substring(0, $idx).Trim()
    $val = $trim.Substring($idx + 1).Trim()
    # Strip surrounding quotes
    if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
      $val = $val.Substring(1, $val.Length - 2)
    }
    # Do NOT write values to output (secrets)
    [Environment]::SetEnvironmentVariable($key, $val, "Process")
  }
}

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$appRoot = Resolve-Path (Join-Path $here "..") | Select-Object -ExpandProperty Path

Push-Location $appRoot
try {
  # Load env vars for this process (root .env.local is preferred, then app .env.local)
  Import-DotEnv (Join-Path $appRoot "..\..\.env.local")
  Import-DotEnv (Join-Path $appRoot ".env.local")

  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $logDir = Join-Path $appRoot "logs"
  if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
  $logFile = Join-Path $logDir "pawboost-rendered-$timestamp.log"

  $saveValue = if ($NoSave) { "false" } else { "true" }
  if ($MatcherUrl -and $MatcherUrl.Trim().Length -gt 0) {
    $env:PETREUNION_RUN_MATCHER_URL = $MatcherUrl.Trim().TrimEnd("/")
  }

  $cmd = @(
    "node",
    (Join-Path $appRoot "scripts\pawboost-scrape-rendered.js"),
    "--states", $States,
    "--maxPets", "$MaxPets",
    "--maxPages", "$MaxPages",
    "--save", $saveValue
  ) -join " "

  "`n[$(Get-Date -Format o)] Starting: $cmd" | Out-File -FilePath $logFile -Append -Encoding utf8
  & node (Join-Path $appRoot "scripts\pawboost-scrape-rendered.js") --states $States --maxPets $MaxPets --maxPages $MaxPages --save $saveValue 2>&1 `
    | Tee-Object -FilePath $logFile -Append

  "`n[$(Get-Date -Format o)] Completed." | Out-File -FilePath $logFile -Append -Encoding utf8
} finally {
  Pop-Location
}

