# Collect all env keys from .env* files under C:\cevict-live\, sorted by key name.
# Usage: .\collect-env-keys.ps1 [-OutputFile "path"] [-IncludeValues]
# Default output: C:\cevict-live\env-keys-sorted.txt

param(
    [string]$Root = "C:\cevict-live",
    [string]$OutputFile = "",
    [switch]$IncludeValues  # If set, include values (sensitive keys are masked as ***)
)

if (-not $OutputFile) {
    $OutputFile = Join-Path $Root "env-keys-sorted.txt"
}

$envFiles = Get-ChildItem -Path $Root -Filter ".env*" -Recurse -File -ErrorAction SilentlyContinue |
Where-Object { $_.FullName -notmatch "\\node_modules\\" }

$all = @{}   # key -> @( @{ File = "..."; Value = "..." }, ... )

foreach ($f in $envFiles) {
    $relPath = $f.FullName.Replace($Root, "").TrimStart("\")
    $lines = Get-Content -LiteralPath $f.FullName -Encoding UTF8 -ErrorAction SilentlyContinue
    if (-not $lines) { continue }

    foreach ($line in $lines) {
        $line = $line.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) { continue }
        # Match KEY=value or KEY= (export optional)
        if ($line -match '^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            $key = $Matches[1]
            $rawValue = $Matches[2].Trim()
            # Remove surrounding quotes
            if ($rawValue -match '^["''](.+)["'']\s*$') { $rawValue = $Matches[1] }
            $hasValue = $rawValue -ne ""
            $entry = @{ File = $relPath; Value = $rawValue; HasValue = $hasValue }
            if (-not $all.ContainsKey($key)) {
                $all[$key] = [System.Collections.ArrayList]@()
            }
            [void]$all[$key].Add($entry)
        }
    }
}

# Mask value for sensitive-looking keys
function Mask-Value($key, $value) {
    if (-not $value) { return "(empty)" }
    $sensitive = $key -match 'KEY|SECRET|PASSWORD|TOKEN|PRIVATE|API_KEY|_SECRET'
    if ($sensitive) { return "***" }
    if ($value.Length -gt 40) { return $value.Substring(0, 20) + "..." + $value.Substring($value.Length - 4) }
    return $value
}

$sortedKeys = $all.Keys | Sort-Object
$sb = [System.Text.StringBuilder]::new()

# Header
[void]$sb.AppendLine("# Env keys under $Root (sorted by key name)")
[void]$sb.AppendLine("# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$sb.AppendLine("#")
[void]$sb.AppendLine("KEY`tHAS_VALUE`tFILE(S)`tVALUE_OR_MASKED")
[void]$sb.AppendLine("---`t--------`t-------`t---------------")

foreach ($key in $sortedKeys) {
    $entries = $all[$key]
    $files = ($entries | ForEach-Object { $_.File }) -join "; "
    $first = $entries[0]
    $hasVal = if ($first.HasValue) { "yes" } else { "no" }
    $val = if ($IncludeValues) { Mask-Value $key $first.Value } else { "(use -IncludeValues to show)" }
    [void]$sb.AppendLine("$key`t$hasVal`t$files`t$val")
    # If same key in multiple files with different values, list them
    if ($entries.Count -gt 1 -and $IncludeValues) {
        for ($i = 1; $i -lt $entries.Count; $i++) {
            $e = $entries[$i]
            $v = Mask-Value $key $e.Value
            [void]$sb.AppendLine("  `t  `t  $($e.File)`t$v")
        }
    }
}

$outDir = Split-Path -Parent $OutputFile
if ($outDir -and -not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}
$sb.ToString() | Set-Content -Path $OutputFile -Encoding UTF8 -NoNewline
Add-Content -Path $OutputFile -Value ""

Write-Host "Done. Keys: $($sortedKeys.Count) -> $OutputFile" -ForegroundColor Green
