# Run Moltbook semantic searches for keywords relevant to us. Writes MOLTBOOK_SEARCH_RESULTS.md.
# Run from apps/petreunion (needs .env.local with MOLTBOOK_API_KEY).
# Optional: run after moltbook-scheduled-check.ps1 so "check Moltbook" sees both hot/new feed and keyword hits.

param([int]$LimitPerQuery = 8)

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
$outPath = Join-Path $scriptDir "MOLTBOOK_SEARCH_RESULTS.md"
. (Join-Path $scriptDir "Get-MoltbookKey.ps1")
$key = Get-MoltbookKey
if (-not $key) { Write-Warning "No Moltbook API key found (petreunion or moltbook-viewer .env.local)"; exit 1 }

$headers = @{ "Authorization" = "Bearer $key" }
$base = "https://www.moltbook.com/api/v1"

# Rotate a subset so we don't hit rate limits; run 5 per execution
$queries = @(
    "lost pet reunion found pet",
    "probability prediction calibration",
    "NFL NBA NHL NCAAB NCAAF sports prediction",
    "prediction market odds Kalshi",
    "pet shelter adoption stray"
)

$allPosts = @{}
function Add-Result {
    param($p)
    $id = if ($p.type -eq "comment" -and $p.post_id) { $p.post_id } else { $p.id }
    if (-not $id) { return }
    $linkId = if ($p.type -eq "comment" -and $p.post_id) { $p.post_id } else { $p.id }
    $dedupeKey = $p.id
    if ($allPosts.ContainsKey($dedupeKey)) { return }
    $title = if ($p.title) { $p.title } elseif ($p.post -and $p.post.title) { $p.post.title } else { "(comment)" }
    $content = if ($p.content) { $t = ($p.content -replace "[\r\n]+", " ").Trim(); if ($t.Length -gt 150) { $t.Substring(0, 150) + "..." } else { $t } } else { "" }
    $allPosts[$dedupeKey] = @{
        id = $p.id
        title = $title
        content = $content
        author = if ($p.author -and $p.author.name) { $p.author.name } else { "?" }
        submolt = if ($p.submolt -and $p.submolt.name) { "m/$($p.submolt.name)" } elseif ($p.submolt) { $p.submolt } else { "?" }
        upvotes = $p.upvotes
        created_at = $p.created_at
        link = "https://www.moltbook.com/post/$linkId"
        similarity = $p.similarity
    }
}

foreach ($q in $queries) {
    try {
        $uri = "$base/search?q=" + [uri]::EscapeDataString($q) + "&limit=$LimitPerQuery"
        $r = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
        $results = $r.results
        if (-not $results -and $r.data -and $r.data.results) { $results = $r.data.results }
        if ($results) {
            foreach ($p in $results) { Add-Result -p $p }
        }
    } catch {
        try {
            $uri = "$base/search?q=" + [uri]::EscapeDataString($q) + "&type=posts&limit=$LimitPerQuery"
            $r = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
            $results = $r.results; if (-not $results -and $r.data -and $r.data.results) { $results = $r.data.results }
            if ($results) { foreach ($p in $results) { Add-Result -p $p } }
        } catch { Write-Warning "Search '$q' failed: $_" }
    }
    Start-Sleep -Milliseconds 500
}

$sorted = $allPosts.Values | Sort-Object { $_.created_at } -Descending
$now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("# Moltbook keyword search results")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("**Run:** $now  |  **Queries:** " + ($queries -join "; "))
[void]$sb.AppendLine("")
[void]$sb.AppendLine('Use these when you "check Moltbook" - reply or add to MOLTBOOK_IDEAS / Agent TODO if relevant.')
[void]$sb.AppendLine("")
[void]$sb.AppendLine("---")
[void]$sb.AppendLine("")

$sep = " | "
foreach ($p in $sorted) {
    [void]$sb.AppendLine("### [$($p.title)]($($p.link))")
    $upStr = if ($null -ne $p.upvotes) { $sep + $p.upvotes + " up" } else { "" }
    [void]$sb.AppendLine("- **$($p.author)**$sep$($p.submolt)$upStr")
    if ($p.similarity) { [void]$sb.AppendLine("- Similarity: $($p.similarity)") }
    [void]$sb.AppendLine("")
    if ($p.content) { [void]$sb.AppendLine("> $($p.content)"); [void]$sb.AppendLine("") }
}

$body = $sb.ToString()
if ($sorted.Count -eq 0) {
    $body += "`n`n---`n*No results (search API may have returned 500; try again later). Keywords used: " + ($queries -join ", ") + "*`n"
}
Set-Content -Path $outPath -Value $body -Encoding UTF8
Write-Host ("Wrote " + $outPath + " (" + $sorted.Count + " posts)")
