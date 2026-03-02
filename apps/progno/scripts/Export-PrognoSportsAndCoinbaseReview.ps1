<#
.SYNOPSIS
  Builds a review package of Progno sports prediction logic + Coinbase/crypto trading logic.
.DESCRIPTION
  Combines the existing Progno audit bundle idea with Alpha Hunter + Coinbase pieces so
  another AI (or human) can audit sports picks + crypto execution end-to-end.

  Copies:
  - Progno: lib/, app/lib/, key API routes (picks/today, progno/*, backtest, cron, simulate),
    Supabase migrations for results/actual_bets/tuning, and core docs (PROGNO_* audits, tuning docs).
  - Alpha Hunter: Coinbase exchange + crypto trainer code, key services, README, env example,
    and Supabase migrations for crypto trades.
  - Trading Dashboard: README + trading types for context on how Coinbase performance is surfaced.

  Outputs:
  - .txt (default): single text file with path + content for each file — AI-readable.
  - .tar: uncompressed tar archive (optional; for humans).
  - .zip: optional; many AIs cannot read zip.

  Run from repo root:
    .\apps\progno\scripts\Export-PrognoSportsAndCoinbaseReview.ps1
  or from apps/progno:
    .\scripts\Export-PrognoSportsAndCoinbaseReview.ps1
#>
param(
  [string] $OutputDir = (Get-Location).Path,
  [ValidateSet('Txt', 'Tar', 'Zip', 'All')]
  [string] $Format = 'Txt'
)

$ErrorActionPreference = 'Stop'

# Resolve Progno root: from script path, or from current directory
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
    Write-Error "Progno root not found. Run from repo root or apps/progno (or execute the .ps1 file: .\scripts\Export-PrognoSportsAndCoinbaseReview.ps1)."
  }
}

# Repo root = two levels up from apps\progno
$appsDir = Split-Path $PrognoRoot -Parent
$RepoRoot = Split-Path $appsDir -Parent

$timestamp = Get-Date -Format 'yyyyMMdd-HHmm'
$staging = Join-Path $env:TEMP "progno-coinbase-review-staging-$timestamp"
New-Item -ItemType Directory -Path $staging -Force | Out-Null
$doTxt = ($Format -eq 'Txt') -or ($Format -eq 'All')
$doTar = ($Format -eq 'Tar') -or ($Format -eq 'All')
$doZip = ($Format -eq 'Zip') -or ($Format -eq 'All')

function Copy-PrognoPath {
  param([string]$RelativePath)
  $src = Join-Path $PrognoRoot $RelativePath
  if (-not (Test-Path $src)) { return }
  $dest = Join-Path $staging "progno\$RelativePath"
  $parent = Split-Path $dest -Parent
  if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  if (Test-Path $src -PathType Leaf) {
    Copy-Item -Path $src -Destination $dest -Force
    Write-Host "  [+] progno\$RelativePath"
  } else {
    Get-ChildItem -Path $src -Recurse -File | Where-Object { $_.Extension -match '\.(ts|tsx|js|jsx|json|md|sql|txt)$' } | ForEach-Object {
      $rel = $_.FullName.Substring($PrognoRoot.Length).TrimStart([IO.Path]::DirectorySeparatorChar) -replace '[\\/]+', [IO.Path]::DirectorySeparatorChar
      $d = Join-Path $staging "progno\$rel"
      $dp = Split-Path $d -Parent
      if (-not (Test-Path $dp)) { New-Item -ItemType Directory -Path $dp -Force | Out-Null }
      Copy-Item -Path $_.FullName -Destination $d -Force
      Write-Host "  [+] progno\$rel"
    }
  }
}

function Copy-RepoPath {
  param([string]$RelativePath)
  $src = Join-Path $RepoRoot $RelativePath
  if (-not (Test-Path $src)) { return }
  $dest = Join-Path $staging $RelativePath
  $parent = Split-Path $dest -Parent
  if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  if (Test-Path $src -PathType Leaf) {
    Copy-Item -Path $src -Destination $dest -Force
    Write-Host "  [+] $RelativePath"
  } else {
    Get-ChildItem -Path $src -Recurse -File | Where-Object { $_.Extension -match '\.(ts|tsx|js|jsx|json|md|sql|txt)$' } | ForEach-Object {
      $rel = $_.FullName.Substring($RepoRoot.Length).TrimStart([IO.Path]::DirectorySeparatorChar) -replace '[\\/]+', [IO.Path]::DirectorySeparatorChar
      $d = Join-Path $staging $rel
      $dp = Split-Path $d -Parent
      if (-not (Test-Path $dp)) { New-Item -ItemType Directory -Path $dp -Force | Out-Null }
      Copy-Item -Path $_.FullName -Destination $d -Force
      Write-Host "  [+] $rel"
    }
  }
}

Write-Host "Progno root: $PrognoRoot"
Write-Host "Repo root:   $RepoRoot"
Write-Host "Staging:     $staging"
Write-Host ""

# --- PROGNO (sports prediction engine) ---------------------------------------
Write-Host "[1/6] Progno lib/ and app/lib/ (prediction engine, signals, filters, calibration, etc.)"
Copy-PrognoPath 'lib'
Copy-PrognoPath 'app\lib'

Write-Host "[2/6] Progno API routes (picks/today, progno/*, backtest, cron, simulate, health)"
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

Write-Host "[3/6] Progno Supabase migrations (results, daily summary, actual bets, tuning_config)"
Copy-PrognoPath 'supabase\migrations\20260221_fix_game_outcomes_and_summary.sql'
Copy-PrognoPath 'supabase\migrations\20260226_actual_bets.sql'
Copy-PrognoPath 'supabase\migrations\20260302_tuning_config.sql'

Write-Host "[4/6] Progno scripts and key docs (audits, tuning, learning)"
Copy-PrognoPath 'scripts'
foreach ($doc in @(
  'TESTING-AND-FINE-TUNING.md',
  'LEARNING-BOT.md',
  'TRAILLERVEGAS-MONETIZATION.md',
  'DATA-FLOW-ODDS-TO-PREDICTIONS.md',
  'PROGNO-PROGNOSTICATION-PIPELINE.md',
  'PROGNO_ALPHA_HUNTER_AUDIT_2026-02-25.md',
  'PROGNO_PROGNOSTICATION_AUDIT_2026-02-16.md',
  'PROGNO_API.md',
  'DOCUMENTATION.md'
)) { Copy-PrognoPath $doc }

Copy-PrognoPath 'CODE-REVIEW-BUNDLE.txt'

Write-Host "[5/6] Progno config (package, tsconfig, env manifest, types)"
foreach ($item in @('types', 'package.json', 'package-lock.json', 'next.config.js', 'tsconfig.json', 'env.manifest.json', 'next-env.d.ts')) {
  Copy-PrognoPath $item
}

# --- ALPHA HUNTER / COINBASE (crypto execution) ------------------------------
Write-Host "[6/6] Alpha Hunter Coinbase/crypto logic and schema"
Copy-RepoPath 'apps\alpha-hunter\README.md'
Copy-RepoPath 'apps\alpha-hunter\.env.example'

foreach ($p in @(
  'apps\alpha-hunter\src\exchanges',
  'apps\alpha-hunter\src\coinbase.ts',
  'apps\alpha-hunter\src\crypto-trainer.ts',
  'apps\alpha-hunter\src\exchanges\coinbase.ts',
  'apps\alpha-hunter\src\exchanges\exchange-manager.ts',
  'apps\alpha-hunter\src\services\trade-safety.ts',
  'apps\alpha-hunter\src\dashboard-reporter.ts',
  'apps\alpha-hunter\src\index.ts'
)) { Copy-RepoPath $p }

Copy-RepoPath 'apps\alpha-hunter\supabase\migrations\20260226_crypto_trades.sql'
Copy-RepoPath 'apps\alpha-hunter\database\migrations\001_bot_memory_tables.sql'
Copy-RepoPath 'apps\alpha-hunter\database\migrations\002_bot_config_and_strategy_params.sql'

Write-Host "[+] Trading Dashboard context"
Copy-RepoPath 'apps\trading-dashboard\README.md'
Copy-RepoPath 'apps\trading-dashboard\src\types\trading.ts'

# --- Bundle README -----------------------------------------------------------
$readmePath = Join-Path $staging 'REVIEW-PACKAGE-README.md'
$readme = @"
# Progno Sports + Coinbase Review Package

Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')
Progno root: $PrognoRoot
Repo root:   $RepoRoot

## Contents

- **progno/lib/** — Root libraries: data sources, backtesting, Claude Effect data collection, odds helpers.
- **progno/app/lib/** — App libraries: prediction engine, Monte Carlo engine, calibration, true-edge engine,
  probability analyzer, filters, ranking, tuning-config, learning bot.
- **progno/app/api/** — API routes for picks/today, progno predictions, backtest, arbitrage, cron, simulate, admin, etc.
- **progno/supabase/migrations/** — Key tables for game outcomes, prediction results, daily summary, actual_bets, tuning_config.
- **progno/scripts/** — Simulation, backtesting, 7-day tuning, probability analyzer runs.
- **progno/*.md** — Design docs and audits: PROGNO audits, data-flow diagrams, tuning and learning docs, TrailerVegas monetization.
- **alpha-hunter/** — Coinbase/crypto logic: exchange manager, Coinbase adapters, crypto trainer, trade safety, dashboard reporter,
  Supabase schema for crypto_trades and bot memory/config.
- **apps/trading-dashboard/** — Trading dashboard README and trading types (context for how Coinbase performance is surfaced).

## Suggested Audit Focus

- **Progno sports pipeline**
  - /app/api/picks/today: odds ingestion, 7-day Monte Carlo, Claude Effect, value/edge calc, pick ranking.
  - /app/lib/modules: signals, filters, confidence, ranking — how each signal contributes to confidence and edge.
  - Calibration and tuning: model-calibration, true-edge engine, tuning-config + learning-bot (post-results tuning).
  - Supabase schemas for game_outcomes, prediction_results, actual_bets: grading, win-rate calculation, ROI, and learning loops.

- **Coinbase / crypto execution**
  - Alpha Hunter exchange manager + Coinbase adapters: order placement, balance handling, error handling.
  - Crypto trainer: strategy parameters, risk sizing, and learning behaviour.
  - Supabase crypto_trades schema: how trades and P&L are persisted.
  - Trading dashboard types: how metrics are computed and displayed.

## How to Use This Package

1. Read this README to understand structure.
2. Start from **progno/app/api/picks/today/route.ts** (sports prediction core) and
   **apps/alpha-hunter/src/coinbase.ts** + **apps/alpha-hunter/src/exchanges/coinbase.ts** (Coinbase execution).
3. Follow references into lib modules, scripts (simulations), and migrations to understand data flow end-to-end.
4. Propose improvements in:
   - confidence/edge formulae,
   - risk management,
   - learning/tuning loops,
   - Coinbase safety checks and failure modes.
"@
Set-Content -Path $readmePath -Value $readme -Encoding UTF8
Write-Host "  [+] REVIEW-PACKAGE-README.md"

# --- Single .txt bundle (AI-readable) ----------------------------------------
if ($doTxt) {
  $txtPath = Join-Path $OutputDir "progno-coinbase-review-package-$timestamp.txt"
  Write-Host ""
  Write-Host "Creating .txt (AI-readable): $txtPath"
  $sb = [System.Text.StringBuilder]::new()
  $header = "Progno sports + Coinbase review package - $timestamp - Progno: $PrognoRoot - Repo: $RepoRoot"
  [void]$sb.AppendLine($header)
  [void]$sb.AppendLine('')
  $files = Get-ChildItem -Path $staging -Recurse -File | Where-Object { $_.Extension -match '\.(ts|tsx|js|jsx|json|md|sql|txt)$' } | Sort-Object { $_.FullName }
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

# --- .tar archive ------------------------------------------------------------
if ($doTar) {
  $tarPath = Join-Path $OutputDir "progno-coinbase-review-package-$timestamp.tar"
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

# --- .zip archive (optional) -------------------------------------------------
if ($doZip) {
  $zipPath = Join-Path $OutputDir "progno-coinbase-review-package-$timestamp.zip"
  Write-Host "Creating .zip: $zipPath"
  if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
  Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath -CompressionLevel Optimal
  $zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
  Write-Host "  Done. Size: $zipSize MB"
  Write-Host "  Output: $zipPath"
  Write-Host ""
}

Remove-Item -Path $staging -Recurse -Force
Write-Host "Done. Use the .txt file for AI tools (tar/zip are for humans)."

