param(
  [string[]] $Paths
)

Set-StrictMode -Version Latest

if (-not $Paths -or $Paths.Count -eq 0) {
  $Paths = @(
    'C:\cevict-live\apps\progno\.env.example',
    'C:\cevict-live\apps\prognostication\.env.example',
    'C:\cevict-live\apps\gulfcoastcharters\.env.example',
    'C:\cevict-live\apps\wheretovacation\.env.example'
  )
}

foreach ($path in $Paths) {
  Write-Output ("== " + $path + " ==")
  if (-not (Test-Path -LiteralPath $path)) {
    Write-Output "MISSING_FILE"
    Write-Output ""
    continue
  }

  $set = New-Object System.Collections.Generic.HashSet[string]
  foreach ($line in (Get-Content -LiteralPath $path)) {
    if ($line -match '^\s*([A-Z0-9_]+)\s*=') {
      [void]$set.Add($matches[1])
    }
  }

  $set | Sort-Object
  Write-Output ""
}

