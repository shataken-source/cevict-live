# Push env vars from an app's .env.local to a Vercel project
# Usage: .\vercel-push-env.ps1 -AppPath C:\cevict-live\apps\trailervegas -ProjectName trailervegas
param(
  [Parameter(Mandatory)]
  [string]$AppPath,
  [Parameter(Mandatory)]
  [string]$ProjectName,
  [string]$Environment = "production"
)

$envFile = Join-Path $AppPath ".env.local"
if (-not (Test-Path $envFile)) {
  Write-Error "No .env.local found at $envFile"
  exit 1
}

Write-Host "Pushing env vars from $envFile to Vercel project '$ProjectName' ($Environment)" -ForegroundColor Cyan

$lines = Get-Content $envFile | Where-Object { $_ -match '^\s*[A-Z_]+=.' }
$count = 0

foreach ($line in $lines) {
  $parts = $line -split '=', 2
  $key = $parts[0].Trim()
  $val = $parts[1].Trim()
  if (-not $key -or -not $val) { continue }

  Write-Host "  Setting $key ..." -NoNewline
  try {
    # Remove existing var first (ignore errors if it doesn't exist)
    echo "y" | vercel env rm $key $Environment --yes 2>$null | Out-Null
    # Add the new value
    echo $val | vercel env add $key $Environment 2>&1 | Out-Null
    Write-Host " OK" -ForegroundColor Green
    $count++
  } catch {
    Write-Host " FAILED: $_" -ForegroundColor Red
  }
}

Write-Host "`nDone. $count env var(s) pushed to '$ProjectName' ($Environment)." -ForegroundColor Green
