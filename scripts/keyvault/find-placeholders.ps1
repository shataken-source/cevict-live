# Find keys in the key store whose values look like placeholders (your-*, paste_your_*, *_here, etc.).
# Usage: .\find-placeholders.ps1  [-ListAll]
#   -ListAll: list every key and whether it looks like a placeholder (default: only placeholders)

param(
    [switch]$ListAll = $false
)

Set-StrictMode -Version Latest
$modulePath = Join-Path $PSScriptRoot 'KeyVault.psm1'
Import-Module $modulePath -Force

$store = Get-KeyVaultStore
$secrets = $store.secrets
$propCount = if ($secrets) { @($secrets.PSObject.Properties).Count } else { 0 }
if ($propCount -eq 0) {
    Write-Host "Key store is empty or has no secrets."
    exit 0
}

# Patterns that suggest placeholder / not yet set
$placeholderPatterns = @(
    '^your-',           # your-cron-secret, your-api-sports-key
    'paste_your',        # whsec_paste_your_actual_secret_here
    'paste your',
    '_here$',            # something_here
    '^replace_me',
    '^xxx',
    '^example\.',
    '^<.*>$',            # <placeholder>
    '^\[.*\]$',          # [paste key here]
    '^replace',
    '^fill_in',
    '^enter_',
    '^add_your'
)

function Test-PlaceholderValue {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $true }
    $v = $Value.Trim().ToLowerInvariant()
    foreach ($pat in $placeholderPatterns) {
        if ($v -match $pat) { return $true }
    }
    return $false
}

$placeholders = [System.Collections.Generic.List[object]]::new()
$all = [System.Collections.Generic.List[object]]::new()

foreach ($prop in $secrets.PSObject.Properties) {
    $key = $prop.Name
    $val = [string]$prop.Value
    $isPlaceholder = Test-PlaceholderValue -Value $val
    $all.Add([pscustomobject]@{ Key = $key; Value = $val; IsPlaceholder = $isPlaceholder })
    if ($isPlaceholder) {
        $placeholders.Add([pscustomobject]@{ Key = $key; Value = $val })
    }
}

$path = Get-KeyVaultStorePath
Write-Host "Store: $path"
Write-Host ""

if ($ListAll) {
    Write-Host "All keys (placeholder? value preview):"
    Write-Host "----------------------------------------"
    foreach ($o in $all) {
        $preview = if ($o.Value.Length -gt 50) { $o.Value.Substring(0, 47) + "..." } else { $o.Value }
        $tag = if ($o.IsPlaceholder) { " PLACEHOLDER" } else { " ok" }
        Write-Host "  $($o.Key)$tag"
        Write-Host "    $preview"
    }
    Write-Host ""
}

Write-Host "Keys that look like placeholders (replace with real values):"
Write-Host "------------------------------------------------------------"
if ($placeholders.Count -eq 0) {
    Write-Host "  (none)"
} else {
    foreach ($p in $placeholders) {
        Write-Host "  $($p.Key)=$($p.Value)"
    }
}
Write-Host ""
Write-Host "Total: $($placeholders.Count) placeholder(s) out of $($all.Count) key(s)."
