<#
.SYNOPSIS
  Builds an audit bundle of all files an AI (or human) would need to audit Progno.
.DESCRIPTION
  Copies lib/, app/lib/, key API routes, types, and config. Outputs:
  - .txt (default): single text file with path + content for each file — AI-readable.
  - .tar: uncompressed tar archive (extract with tar -xf).
  - .zip: optional; many AIs cannot read zip.
  Run from repo root: .\apps\progno\scripts\Export-PrognoAuditBundle.ps1
  Or from apps/progno: .\scripts\Export-PrognoAuditBundle.ps1
.EXAMPLE
  .\Export-PrognoAuditBundle.ps1
  .\Export-PrognoAuditBundle.ps1 -OutputDir C:\temp -Format All
#>
param(
  [string] $OutputDir = (Get-Location).Path,
  [ValidateSet('Txt', 'Tar', 'Zip', 'All')]
  [string] $Format = 'Txt'
)

$ErrorActionPreference = 'Stop'

# Resolve Progno root: from script path, or from current directory (paste/run from apps\progno or repo root)
if ($PSScriptRoot -and (Test-Path $PSScriptRoot)) {
  $PrognoRoot = $PSScriptRoot -replace '[\\/]scripts$', ''
} else {
  $PrognoRoot = ''
}
if (-not $PrognoRoot -or -not (Test-Path (Join-Path $PrognoRoot 'package.json'))) {
  $cwd = Get-Location
  if (Test-Path (Join-Path $cwd.Path 'package.json')) {
    $PrognoRoot = $cwd.Path
  } elseif (Test-Path (Join-Path $cwd.Path 'apps\progno\package.json')) {
    $PrognoRoot = Join-Path $cwd.Path 'apps\progno'
  } else {
    Write-Error "Progno root not found. Run from repo root or apps/progno (or execute the .ps1 file: .\scripts\Export-PrognoAuditBundle.ps1)."
  }
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmm'
$staging = Join-Path $env:TEMP "progno-audit-staging-$timestamp"
New-Item -ItemType Directory -Path $staging -Force | Out-Null
$doTxt = ($Format -eq 'Txt') -or ($Format -eq 'All')
$doTar = ($Format -eq 'Tar') -or ($Format -eq 'All')
$doZip = ($Format -eq 'Zip') -or ($Format -eq 'All')

function Copy-PrognoPath {
  param([string]$RelativePath)
  $src = Join-Path $PrognoRoot $RelativePath
  if (-not (Test-Path $src)) { return }
  $dest = Join-Path $staging $RelativePath
  $parent = Split-Path $dest -Parent
  if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  if (Test-Path $src -PathType Leaf) {
    Copy-Item -Path $src -Destination $dest -Force
    Write-Host "  [+] $RelativePath"
  } else {
    Get-ChildItem -Path $src -Recurse -File | Where-Object { $_.Extension -match '\.(ts|tsx|js|jsx|json|md|sql)$' } | ForEach-Object {
      $rel = $_.FullName.Substring($PrognoRoot.Length).TrimStart([IO.Path]::DirectorySeparatorChar) -replace '[\\/]+', [IO.Path]::DirectorySeparatorChar
      $d = Join-Path $staging $rel
      $dp = Split-Path $d -Parent
      if (-not (Test-Path $dp)) { New-Item -ItemType Directory -Path $dp -Force | Out-Null }
      Copy-Item -Path $_.FullName -Destination $d -Force
      Write-Host "  [+] $rel"
    }
  }
}

Write-Host "Progno root: $PrognoRoot"
Write-Host "Staging:     $staging"
Write-Host ""

# --- 1) Root lib (your list + full tree for safety)
Write-Host "[1/5] lib/ (data-sources, api-sports, data-collection, backtesting, etc.)"
Copy-PrognoPath 'lib'

# --- 2) App lib (prediction engine, claude-effect, markets, sentiment, etc.)
Write-Host "[2/5] app/lib/ (prediction-engine, monte-carlo, claude-effect, markets, progno-db, etc.)"
Copy-PrognoPath 'app\lib'

# --- 3) Key API routes (picks, progno, backtest, arbitrage, cron, simulate, health)
Write-Host "[3/5] app/api/ (picks/today, progno/*, backtest, arbitrage, cron, simulate, health)"
$apiPaths = @(
  'app\api\picks',
  'app\api\progno',
  'app\api\backtest',
  'app\api\arbitrage',
  'app\api\arb-proxy',
  'app\api\cron',
  'app\api\simulate',
  'app\api\health',
  'app\api\accuracy',
  'app\api\performance',
  'app\api\markets',
  'app\api\iai',
  'app\api\narrative',
  'app\api\nig',
  'app\api\csi',
  'app\api\sentiment',
  'app\api\emergent',
  'app\api\temporal',
  'app\api\admin',
  'app\api\api-football',
  'app\api\test',
  'app\api\bot',
  'app\api\cursor-bot',
  'app\api\public-apis',
  'app\api\odds',
  'app\api\train'
)
foreach ($p in $apiPaths) { Copy-PrognoPath $p }

# --- 4) Types and config
Write-Host "[4/5] types, config, env manifest"
foreach ($item in @('types', 'package.json', 'package-lock.json', 'next.config.js', 'tsconfig.json', 'env.manifest.json', 'next-env.d.ts')) {
  Copy-PrognoPath $item
}

# --- 5) Scripts useful for audit (simulate, backtest, calculate win rate)
Write-Host "[5/5] scripts (simulate, backtest, calculate)"
Copy-PrognoPath 'scripts'

# README for the bundle
$readme = @"
# Progno audit bundle

Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')
Source: $PrognoRoot

## Contents

- **lib/** — Root lib: api-sports, data-collection, data-sources, backtesting, odds, live-data, etc.
- **app/lib/** — App lib: prediction-engine, monte-carlo-engine, claude-effect*, markets, progno-db, sentiment, narrative, iai, nig, csi, etc.
- **app/api/** — Key API routes: picks/today, progno/*, backtest, arbitrage, cron, simulate, health, admin, etc.
- **types/** — Shared types (if present)
- **scripts/** — Simulate, backtest, calculate win rate
- **package.json, next.config.js, tsconfig.json, env.manifest.json** — Config and deps

## Audit focus

- Prediction engine: division by zero, factorial overflow, confidence scale (0–1 vs 0–100), edge/vig, Pythagorean exponent.
- Claude effect: temporal decay, probability adjustment.
- Picks/today: spread sign, EV cap vs ranking, value bet logic.
- Data sources: game enrichment, odds, injuries, H2H.
- Backtesting and performance tracking.
"@
Set-Content -Path (Join-Path $staging 'AUDIT-BUNDLE-README.md') -Value $readme -Encoding UTF8
Write-Host "  [+] AUDIT-BUNDLE-README.md"

# --- Single .txt bundle (AI-readable: one file, path + content per file)
if ($doTxt) {
  $txtPath = Join-Path $OutputDir "progno-audit-bundle-$timestamp.txt"
  Write-Host ""
  Write-Host "Creating .txt (AI-readable): $txtPath"
  $sb = [System.Text.StringBuilder]::new()
  $header = "Progno audit bundle - $timestamp - Source: $PrognoRoot"
  [void]$sb.AppendLine($header)
  [void]$sb.AppendLine('')
  $files = Get-ChildItem -Path $staging -Recurse -File | Where-Object { $_.Extension -match '\.(ts|tsx|js|jsx|json|md|sql)$' } | Sort-Object { $_.FullName }
  foreach ($f in $files) {
    $rel = $f.FullName.Substring($staging.Length).TrimStart([IO.Path]::DirectorySeparatorChar) -replace '[\\/]+', '/'
    [void]$sb.AppendLine("### FILE: $rel")
    [void]$sb.AppendLine('')
    $content = Get-Content -Path $f.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($content) { [void]$sb.Append($content) }
    [void]$sb.AppendLine('')
    [void]$sb.AppendLine('')
  }
  [System.IO.File]::WriteAllText($txtPath, $sb.ToString(), [System.Text.UTF8Encoding]::new($false))
  $txtSize = [math]::Round((Get-Item $txtPath).Length / 1MB, 2)
  Write-Host "  Done. Size: $txtSize MB"
  Write-Host "  Output: $txtPath (upload this for AI audit)"
  Write-Host ""
}

# --- .tar archive (extract with: tar -xf progno-audit-bundle-*.tar)
if ($doTar) {
  $tarPath = Join-Path $OutputDir "progno-audit-bundle-$timestamp.tar"
  Write-Host "Creating .tar: $tarPath"
  $tarCmd = Get-Command tar -ErrorAction SilentlyContinue
  if ($tarCmd) {
    Push-Location $staging
    try {
      & tar -cf $tarPath .
      if ($LASTEXITCODE -eq 0 -and (Test-Path $tarPath)) {
        $tarSize = [math]::Round((Get-Item $tarPath).Length / 1MB, 2)
        Write-Host "  Done. Size: $tarSize MB"
        Write-Host "  Output: $tarPath"
      } else {
        Write-Host "  tar failed or path wrong (exit $LASTEXITCODE)."
      }
    } finally {
      Pop-Location
    }
  } else {
    Write-Host "  tar not found. Use -Format Txt for AI-readable bundle."
  }
  Write-Host ""
}

# --- .zip (optional; many AIs cannot read zip)
if ($doZip) {
  $zipPath = Join-Path $OutputDir "progno-audit-bundle-$timestamp.zip"
  Write-Host "Creating .zip: $zipPath"
  if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
  Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath -CompressionLevel Optimal
  $zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
  Write-Host "  Done. Size: $zipSize MB"
  Write-Host "  Output: $zipPath"
  Write-Host ""
}

Remove-Item -Path $staging -Recurse -Force
Write-Host "Done. Use the .txt file for AI tools (zip/tar are not readable by most AIs)."
