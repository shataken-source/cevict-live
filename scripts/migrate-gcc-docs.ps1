# Migrate docs and create app folders from C:\gcc to cevict-live
# Run from repo root or scripts/

$ErrorActionPreference = 'Stop'
$mono = 'C:\gcc\cevict-app\cevict-monorepo'
$live = 'C:\cevict-live'
$gccRoot = 'C:\gcc'

# Resolve cevict-live root
$liveRoot = $live
if (Test-Path (Join-Path $PSScriptRoot '..\apps\gulfcoastcharters')) {
  $liveRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

# 1) GCC docs from monorepo -> gulfcoastcharters/docs/from-monorepo-gcc
$gccDocsDst = Join-Path $liveRoot 'apps\gulfcoastcharters\docs\from-monorepo-gcc'
if (Test-Path (Join-Path $mono 'docs\gcc')) {
  if (-not (Test-Path $gccDocsDst)) { New-Item -ItemType Directory -Path $gccDocsDst -Force | Out-Null }
  Copy-Item -Path (Join-Path $mono 'docs\gcc\*') -Destination $gccDocsDst -Recurse -Force
  Write-Host "OK: docs/gcc -> gulfcoastcharters/docs/from-monorepo-gcc"
}

# 2) Petreunion docs from monorepo -> petreunion/docs/from-monorepo-petreunion
$prDocsDst = Join-Path $liveRoot 'apps\petreunion\docs\from-monorepo-petreunion'
if (Test-Path (Join-Path $mono 'docs\petreunion')) {
  if (-not (Test-Path $prDocsDst)) { New-Item -ItemType Directory -Path $prDocsDst -Force | Out-Null }
  Copy-Item -Path (Join-Path $mono 'docs\petreunion\*') -Destination $prDocsDst -Recurse -Force
  Write-Host "OK: docs/petreunion -> petreunion/docs/from-monorepo-petreunion"
}

# 3) WTV docs from monorepo app -> wheretovacation/docs/from-monorepo-wtv
$wtvSrc = Join-Path $mono 'apps\wheretovacation\docs'
$wtvDst = Join-Path $liveRoot 'apps\wheretovacation\docs\from-monorepo-wtv'
if (Test-Path $wtvSrc) {
  if (-not (Test-Path $wtvDst)) { New-Item -ItemType Directory -Path $wtvDst -Force | Out-Null }
  Copy-Item -Path (Join-Path $wtvSrc '*') -Destination $wtvDst -Recurse -Force
  Write-Host "OK: apps/wheretovacation/docs -> wheretovacation/docs/from-monorepo-wtv"
}

# 4) Fishystuff (C:\gcc\fishystuff) -> gulfcoastcharters/docs/fishy-from-gcc
$fishySrc = Join-Path $gccRoot 'fishystuff'
$fishyDst = Join-Path $liveRoot 'apps\gulfcoastcharters\docs\fishy-from-gcc'
if (Test-Path $fishySrc) {
  if (-not (Test-Path $fishyDst)) { New-Item -ItemType Directory -Path $fishyDst -Force | Out-Null }
  Copy-Item -Path (Join-Path $fishySrc '*') -Destination $fishyDst -Recurse -Force -Exclude '~$*'
  Write-Host "OK: C:\gcc\fishystuff -> gulfcoastcharters/docs/fishy-from-gcc"
}

# 5) Charter-booking-platform docs (only .md and key files) -> gulfcoastcharters/docs/charter-booking-platform-from-gcc
$charterSrc = Join-Path $gccRoot 'charter-booking-platform'
$charterDst = Join-Path $liveRoot 'apps\gulfcoastcharters\docs\charter-booking-platform-from-gcc'
if (Test-Path $charterSrc) {
  if (-not (Test-Path $charterDst)) { New-Item -ItemType Directory -Path $charterDst -Force | Out-Null }
  Get-ChildItem -Path $charterSrc -File -Recurse -Include '*.md','*.docx','*.txt' | Where-Object { $_.FullName -notmatch '\\.next\\|\\node_modules\\' } | ForEach-Object {
    $rel = $_.FullName.Substring($charterSrc.Length).TrimStart('\')
    $destFile = Join-Path $charterDst $rel
    $destDir = Split-Path -Parent $destFile
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    Copy-Item -Path $_.FullName -Destination $destFile -Force
  }
  Write-Host "OK: C:\gcc\charter-booking-platform (docs) -> gulfcoastcharters/docs/charter-booking-platform-from-gcc"
}

# 6) Create missing app folders (format like monitor/launchpad: README + docs)
$missingApps = @(
  'ai-orchestrator',
  'alexa-skill',
  'banner-generator',
  'cevict',
  'deployer',
  'fishy',
  'gateway',
  'google-assistant',
  'petrescue-mobile',
  'solar-weather',
  'progno-parked'
)
foreach ($app in $missingApps) {
  $appPath = Join-Path $liveRoot "apps\$app"
  if (-not (Test-Path $appPath)) {
    New-Item -ItemType Directory -Path $appPath -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $appPath 'docs') -Force | Out-Null
    $readme = @"
# $app

Project folder created from C:\gcc scan. Docs and code can be moved here from the monorepo.

**Source:** C:\gcc\cevict-app\cevict-monorepo\apps\$app (or equivalent)

See \`docs/\` for migrated documentation.
"@
    Set-Content -Path (Join-Path $appPath 'README.md') -Value $readme -Encoding UTF8
    Write-Host "Created: apps\$app (README + docs/)"
  }
  # Copy app-specific docs from monorepo if that app exists there
  $monoApp = $app
  if ($app -eq 'progno-parked') { $monoApp = '_progno_parked' }
  if ($app -eq 'fishy') { $monoApp = 'Fishy' }
  $monoAppPath = Join-Path $mono "apps\$monoApp"
  if (Test-Path $monoAppPath) {
    $appDocsDst = Join-Path $appPath 'docs\from-monorepo'
    Get-ChildItem -Path $monoAppPath -Filter '*.md' -File -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch 'node_modules|\\.next\\' } | ForEach-Object {
      $rel = $_.FullName.Substring($monoAppPath.Length).TrimStart('\')
      $destFile = Join-Path $appDocsDst $rel
      $destDir = Split-Path -Parent $destFile
      if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
      Copy-Item -Path $_.FullName -Destination $destFile -Force
    }
    if (Test-Path (Join-Path $monoAppPath 'docs')) {
      if (-not (Test-Path $appDocsDst)) { New-Item -ItemType Directory -Path $appDocsDst -Force | Out-Null }
      Copy-Item -Path (Join-Path $monoAppPath 'docs\*') -Destination $appDocsDst -Recurse -Force
    }
    Write-Host "  -> Copied docs from monorepo apps\$monoApp"
  }
}

Write-Host "Done."
