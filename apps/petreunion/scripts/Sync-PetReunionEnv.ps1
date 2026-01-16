param(
  # Where to search for existing env files (root defaults to repo root)
  [string]$Root = "C:\cevict-live",

  # Output env file for Next.js to load
  [string]$OutFile = "C:\cevict-live\apps\petreunion\.env.local",

  # If set, only prints what would happen (never writes a file)
  [switch]$DryRun,

  # If set, prints values too (NOT recommended). Default is key-names only.
  [switch]$ShowValues
)

$ErrorActionPreference = "Stop"

function Normalize-EnvValue {
  param([string]$v, [string]$key)
  if ($null -eq $v) { return "" }

  $s = $v.Trim()
  if (($s.StartsWith('"') -and $s.EndsWith('"')) -or ($s.StartsWith("'") -and $s.EndsWith("'"))) {
    $s = $s.Substring(1, $s.Length - 2)
  }

  # Remove literal CR/LF sequences sometimes embedded by exporters
  $s = $s -replace "\\r\\n", ""
  $s = $s -replace "\\n", ""
  $s = $s -replace "\\r", ""
  # Remove real CR/LF too
  $s = ($s -replace "`r|`n","").Trim()

  # Fix: NEXT_PUBLIC_SITE_URL="NEXT_PUBLIC_SITE_URL=https://..."
  if ($key -eq "NEXT_PUBLIC_SITE_URL" -and $s -match "^NEXT_PUBLIC_SITE_URL=") {
    $s = $s -replace "^NEXT_PUBLIC_SITE_URL=", ""
  }

  return $s.Trim()
}

function Read-EnvFile {
  param([string]$path)
  $map = @{}
  if (-not (Test-Path -LiteralPath $path)) { return $map }

  $lines = Get-Content -LiteralPath $path -ErrorAction SilentlyContinue
  foreach ($line in $lines) {
    if (-not $line) { continue }
    $t = $line.Trim()
    if (-not $t) { continue }
    if ($t.StartsWith("#")) { continue }
    if ($t -notmatch "^[A-Za-z_][A-Za-z0-9_]*=") { continue }
    $idx = $t.IndexOf("=")
    if ($idx -lt 1) { continue }
    $k = $t.Substring(0, $idx).Trim()
    $v = $t.Substring($idx + 1)
    $map[$k] = (Normalize-EnvValue -v $v -key $k)
  }
  return $map
}

function Is-SupabaseUrl {
  param([string]$v)
  if (-not $v) { return $false }
  return ($v -match "^https://.+\.supabase\.co$") -or ($v -match "^https://.+\.supabase\.com$")
}

function Join-EnvMaps {
  param(
    [hashtable]$base,
    [hashtable]$add
  )
  foreach ($k in $add.Keys) {
    if (-not $add[$k]) { continue }
    $base[$k] = $add[$k]
  }
  return $base
}

# Candidate sources (ordered from "most authoritative" to "least")
$candidates = @(
  (Join-Path $Root "apps\petreunion\.env.local"),
  (Join-Path $Root "apps\petreunion\.env-from vercel"),
  (Join-Path $Root ".env.local"),
  (Join-Path $Root ".env")
) | Where-Object { Test-Path -LiteralPath $_ }

# Also search for any other *.env.local-like files (excluding noisy/unsafe dirs)
$excludeDirs = @(
  "\.git\",
  "\node_modules\",
  "\vault\",
  "\backups\",
  "\old-cevict-monorepo\",
  "\runtime_",
  "\.next\",
  "\.vercel\"
)

try {
  $more = Get-ChildItem -LiteralPath $Root -Recurse -Force -File -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Name -match "^\.env(\..+)?\.local$" -or $_.Name -eq ".env-from vercel"
    } |
    Where-Object {
      $p = $_.FullName
      foreach ($ex in $excludeDirs) { if ($p -match [regex]::Escape($ex)) { return $false } }
      return $true
    } |
    Select-Object -ExpandProperty FullName
  $candidates = @($candidates + $more) | Select-Object -Unique
} catch {
  # ignore
}

Write-Host "Found env sources:" -ForegroundColor Cyan
$candidates | ForEach-Object { Write-Host "  - $_" }

$merged = @{}
foreach ($p in $candidates) {
  $merged = Join-EnvMaps -base $merged -add (Read-EnvFile $p)
}

# Desired keys for PetReunion
$allow = @(
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_URL",
  "ADMIN_KEY",
  "PETREUNION_ADMIN_PASSWORD",
  "ADMIN_PASSWORD",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_BASE_URL",
  "OLLAMA_API_URL",
  "OLLAMA_MODEL"
)

$outMap = @{}
foreach ($k in $allow) {
  if ($merged.ContainsKey($k) -and $merged[$k]) {
    $outMap[$k] = $merged[$k]
  }
}

# Fix Supabase URL mix-ups:
# - SUPABASE_URL must be the project URL, not sb_* tokens
$npUrl = $outMap["NEXT_PUBLIC_SUPABASE_URL"]
$sbUrl = $outMap["SUPABASE_URL"]
if (Is-SupabaseUrl $npUrl) {
  $outMap["SUPABASE_URL"] = $npUrl
} elseif (Is-SupabaseUrl $sbUrl) {
  $outMap["NEXT_PUBLIC_SUPABASE_URL"] = $sbUrl
  $outMap["SUPABASE_URL"] = $sbUrl
} else {
  # Try to salvage from any other key that looks like a supabase URL
  foreach ($k in $merged.Keys) {
    if (Is-SupabaseUrl $merged[$k]) {
      $outMap["NEXT_PUBLIC_SUPABASE_URL"] = $merged[$k]
      $outMap["SUPABASE_URL"] = $merged[$k]
      break
    }
  }
}

# Normalize site URL if missing and we can infer it
if (-not $outMap.ContainsKey("NEXT_PUBLIC_SITE_URL") -or -not $outMap["NEXT_PUBLIC_SITE_URL"]) {
  if ($merged.ContainsKey("PETREUNION_URL") -and $merged["PETREUNION_URL"]) {
    $outMap["NEXT_PUBLIC_SITE_URL"] = $merged["PETREUNION_URL"]
  }
}

# Build output
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("# PetReunion local env (auto-generated)")
$lines.Add("# Generated: $ts")
$lines.Add("# WARNING: contains secrets. Do NOT commit.")
$lines.Add("")

$missing = @()
foreach ($k in @("NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY")) {
  if (-not $outMap.ContainsKey($k) -or -not $outMap[$k]) { $missing += $k }
}

Write-Host ""
Write-Host "Key summary:" -ForegroundColor Cyan
foreach ($k in $allow) {
  $present = $outMap.ContainsKey($k) -and $outMap[$k]
  $flag = if ($present) { "FOUND" } else { "MISSING" }
  Write-Host ("  - {0}: {1}" -f $k, $flag)
}

if ($missing.Count -gt 0) {
  Write-Host ""
  Write-Host "CRITICAL missing keys (PetReunion won't work until set):" -ForegroundColor Yellow
  $missing | ForEach-Object { Write-Host "  - $_" }
}

foreach ($k in $allow) {
  if (-not $outMap.ContainsKey($k) -or -not $outMap[$k]) { continue }
  $v = $outMap[$k]
  if (-not $ShowValues) {
    # Keep values out of console/logs by default
    $lines.Add("$k=$v")
  } else {
    Write-Host "VALUE $k=$v" -ForegroundColor Red
    $lines.Add("$k=$v")
  }
}

if ($DryRun) {
  Write-Host ""
  Write-Host "DryRun: not writing $OutFile" -ForegroundColor Cyan
  exit 0
}

# Backup existing file
if (Test-Path -LiteralPath $OutFile) {
  $bak = "$OutFile.backup.$ts"
  Copy-Item -LiteralPath $OutFile -Destination $bak -Force
  Write-Host "Backed up existing .env.local -> $bak"
}

Set-Content -LiteralPath $OutFile -Value $lines -Encoding utf8
Write-Host ""
Write-Host "Wrote: $OutFile" -ForegroundColor Green
Write-Host "Restart Next dev server so it loads the new env file." -ForegroundColor Green

