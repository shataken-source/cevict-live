# Search "file values" and list top 10; also list 10 posts with fewest replies (from feed).
$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
. (Join-Path $scriptDir "Get-MoltbookKey.ps1")
$key = Get-MoltbookKey
if (-not $key) { Write-Error "No Moltbook API key found"; exit 1 }

$headers = @{ "Authorization" = "Bearer $key" }
$base = "https://www.moltbook.com/api/v1"

# 1) Search "file values"
$searchUri = "$base/search?q=" + [uri]::EscapeDataString("file values") + "&type=posts&limit=15"
$searchResp = Invoke-RestMethod -Uri $searchUri -Headers $headers -Method Get
$searchResults = $searchResp.results; if (-not $searchResults -and $searchResp.data.results) { $searchResults = $searchResp.data.results }
$top10Search = if ($searchResults) { $searchResults | Select-Object -First 10 } else { @() }

# 2) Feed (new) for few-reply posts - feed has comment_count
$feedUri = "$base/feed?sort=new&limit=60"
$feedResp = Invoke-RestMethod -Uri $feedUri -Headers $headers -Method Get
$posts = $feedResp.posts; if (-not $posts -and $feedResp.data.posts) { $posts = $feedResp.data.posts }
if (-not $posts) { $posts = @() }
$withCount = $posts | ForEach-Object { $_ | Add-Member -NotePropertyName comment_count_num -NotePropertyValue ([int]($_.comment_count)) -PassThru }
$fewReplies = $withCount | Sort-Object comment_count_num | Select-Object -First 10

# Output
$out = [System.Text.StringBuilder]::new()
[void]$out.AppendLine("# Moltbook: 'file values' search + 10 posts with few replies")
[void]$out.AppendLine("")
[void]$out.AppendLine("## Top 10 search results for 'file values'")
[void]$out.AppendLine("")
if ($top10Search.Count -eq 0) {
    [void]$out.AppendLine("(No results)")
} else {
    $i = 1
    foreach ($p in $top10Search) {
        $id = if ($p.post_id) { $p.post_id } else { $p.id }
        $title = if ($p.title) { $p.title } else { "(no title)" }
        $author = if ($p.author -and $p.author.name) { $p.author.name } else { "?" }
        $link = "https://www.moltbook.com/post/$id"
        [void]$out.AppendLine("$i. **$title** - $author")
        [void]$out.AppendLine("   $link")
        [void]$out.AppendLine("")
        $i++
    }
}
[void]$out.AppendLine("---")
[void]$out.AppendLine("")
[void]$out.AppendLine("## 10 posts with fewest replies (from new feed)")
[void]$out.AppendLine("")
$j = 1
foreach ($p in $fewReplies) {
    $title = if ($p.title) { $p.title } else { "(no title)" }
    $author = if ($p.author -and $p.author.name) { $p.author.name } else { "?" }
    $cnt = $p.comment_count_num
    $link = "https://www.moltbook.com/post/$($p.id)"
    [void]$out.AppendLine("$j. **$title** - $author ($cnt replies)")
    [void]$out.AppendLine("   $link")
    [void]$out.AppendLine("")
    $j++
}

$text = $out.ToString()
Set-Content -Path (Join-Path $scriptDir "MOLTBOOK_FILE_VALUES_RESULTS.md") -Value $text -Encoding UTF8
Write-Host $text
