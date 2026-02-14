# Deep scan for any Moltbook API key (moltbook_sk_...) in C:\cevict-live.
# Run from repo root: .\scripts\keyvault\find-moltbook-key.ps1
# Use to find if an OLD key exists in a random backup/file (any value different from the known v5 key).
$ErrorActionPreference = "SilentlyContinue"
$root = "C:\cevict-live"
$knownV5 = "moltbook_sk_v5skuimQik0lYL_H0zBioQx6UJq3W7IQ"
$pattern = "moltbook_sk_[A-Za-z0-9_-]{15,100}"
$exclude = @("node_modules", ".next", ".git", "pnpm-lock", "package-lock", ".turbo", "dist", "build", "out")
$found = @()
$scanDirs = @("apps\petreunion", "apps\moltbook-viewer", "backups", "vault", "config", "scripts\keyvault")
$includeExt = @("*.env*", "*.local", "*.backup*", "*.txt", "*.json")
foreach ($dir in $scanDirs) {
  $path = Join-Path $root $dir
  if (-not (Test-Path $path)) { continue }
Get-ChildItem -Path $path -Recurse -File -Include $includeExt -ErrorAction SilentlyContinue |
  Where-Object {
    $p = $_.FullName
    $skip = $false
    foreach ($e in $exclude) { if ($p -like "*\$e\*") { $skip = $true; break } }
    -not $skip
  } |
  ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { return }
    if ($content -notmatch $pattern) { return }
    $matches = [regex]::Matches($content, $pattern)
    foreach ($m in $matches) {
      $val = $m.Value
      $rel = $_.FullName.Replace($root + "\", "")
      if ($val -ne $knownV5) {
        $found += [pscustomobject]@{ File = $rel; Key = $val }
      }
    }
  }
}
if ($found.Count -gt 0) {
  Write-Host "Found $($found.Count) occurrence(s) of a Moltbook key that is NOT the current v5 key:"
  $found | ForEach-Object { Write-Host "  $($_.File): $($_.Key)" }
} else {
  Write-Host "No Moltbook key found that differs from the known v5 key. Only v5 key (or placeholders) exist in scanned files."
}
Write-Host "Scan complete."
