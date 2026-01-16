param(
  [string]$SourceFile = "",
  [string]$OutFile = ""
)

$ErrorActionPreference = "Stop"

function Normalize-EnvValue {
  param([string]$v)
  if ($null -eq $v) { return "" }

  $s = $v.Trim()
  # Strip surrounding quotes
  if (($s.StartsWith('"') -and $s.EndsWith('"')) -or ($s.StartsWith("'") -and $s.EndsWith("'"))) {
    $s = $s.Substring(1, $s.Length - 2)
  }
  # Remove literal CR/LF sequences that Vercel CLI sometimes embeds in the value
  $s = $s -replace "\\r\\n", ""
  $s = $s -replace "\\n", ""
  $s = $s -replace "\\r", ""
  # Remove real CR/LF too
  $s = ($s -replace "`r|`n","").Trim()

  # Fix a common bad export: NEXT_PUBLIC_SITE_URL="NEXT_PUBLIC_SITE_URL=https://..."
  if ($s -match "^NEXT_PUBLIC_SITE_URL=") {
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
    if ($t.StartsWith("#")) { continue }
    if ($t -notmatch "^[A-Za-z_][A-Za-z0-9_]*=") { continue }
    $idx = $t.IndexOf("=")
    if ($idx -lt 1) { continue }
    $k = $t.Substring(0, $idx).Trim()
    $v = $t.Substring($idx + 1)
    $map[$k] = (Normalize-EnvValue $v)
  }
  return $map
}

$root = Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..") | Select-Object -ExpandProperty Path

if (-not $SourceFile) { $SourceFile = Join-Path $root ".env-from vercel" }
if (-not $OutFile) { $OutFile = Join-Path $root ".env.local" }

if (-not (Test-Path -LiteralPath $SourceFile)) {
  throw "Source file not found: $SourceFile"
}

$envMap = Read-EnvFile $SourceFile

# Minimal + safe set for PetReunion local dev
$needed = @(
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_URL",
  "ADMIN_KEY",
  "PETREUNION_ADMIN_PASSWORD",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_BASE_URL",
  "OLLAMA_API_URL",
  "OLLAMA_MODEL"
)

$out = New-Object System.Collections.Generic.List[string]
$out.Add("# Auto-generated from '$([IO.Path]::GetFileName($SourceFile))' by Make-EnvLocalFromVercel.ps1")
$out.Add("# NOTE: This file contains secrets. Do not commit.")

foreach ($k in $needed) {
  if ($envMap.ContainsKey($k) -and $envMap[$k]) {
    $out.Add("$k=$($envMap[$k])")
  }
}

# Fix Supabase URL mix-ups if present
$npUrl = if ($envMap.ContainsKey("NEXT_PUBLIC_SUPABASE_URL")) { $envMap["NEXT_PUBLIC_SUPABASE_URL"] } else { "" }
$sbUrl = if ($envMap.ContainsKey("SUPABASE_URL")) { $envMap["SUPABASE_URL"] } else { "" }

if ($npUrl -and $npUrl -match "^https://.*\.supabase\.co$") {
  # Ensure SUPABASE_URL exists and is correct
  $out.Add("SUPABASE_URL=$npUrl")
} elseif ($sbUrl -and $sbUrl -match "^https://.*\.supabase\.co$") {
  $out.Add("NEXT_PUBLIC_SUPABASE_URL=$sbUrl")
  $out.Add("SUPABASE_URL=$sbUrl")
}

# De-dup lines by key (keep last)
$final = @{}
foreach ($line in $out) {
  if ($line -match "^[A-Za-z_][A-Za-z0-9_]*=") {
    $k = $line.Split("=", 2)[0]
    $final[$k] = $line
  } else {
    $final[[guid]::NewGuid().ToString()] = $line
  }
}

Set-Content -LiteralPath $OutFile -Value ($final.Values) -Encoding utf8

Write-Host "Wrote: $OutFile"
Write-Host "Next step: restart 'npm run dev' so Next loads .env.local"

