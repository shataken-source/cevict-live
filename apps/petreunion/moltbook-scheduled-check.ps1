# Moltbook scheduled check: fetch hot + new feed, write MOLTBOOK_CHECK_LATEST.md.
# Run manually or via Task Scheduler. Cursor can't receive external commands, so we write
# to a file; when you open Cursor and say "check Moltbook" or "what's new on Moltbook",
# the AI reads this file and summarizes.
# Optional: pass -OpenCursor to open Cursor with this file after writing (e.g. when you're at the machine).

param(
    [switch]$OpenCursor = $false
)

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
$envPath = Join-Path $scriptDir ".env.local"
$outPath = Join-Path $scriptDir "MOLTBOOK_CHECK_LATEST.md"

. (Join-Path $scriptDir "Get-MoltbookKey.ps1")
$key = Get-MoltbookKey
if (-not $key) {
    Write-Warning "No Moltbook API key found. Set MOLTBOOK_API_KEY or MOLTBOOK_AGENTS_JSON in apps/petreunion/.env.local or apps/moltbook-viewer/.env.local."
    exit 1
}

# Optional: today's top news for the 6-hour brief (GNews free tier: 100 req/day; 4 runs/day = 4 calls)
$gnewsKeyLine = Get-Content $envPath -ErrorAction SilentlyContinue | Where-Object { $_ -match "^\s*GNEWS_API_KEY=" }
$gnewsKey = if ($gnewsKeyLine) { ($gnewsKeyLine -replace "^\s*GNEWS_API_KEY=", "").Trim().Trim('"').Trim("'") } else { $null }

$headers = @{
    "Authorization" = "Bearer $key"
    "Content-Type"  = "application/json"
}
$base = "https://www.moltbook.com/api/v1"

function Get-FeedPosts {
    param([string]$Sort, [int]$Limit = 20)
    try {
        $uri = "$base/feed?sort=$Sort&limit=$Limit"
        $r = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
        if ($r.posts) { return $r.posts }
        if ($r.data -and $r.data.posts) { return $r.data.posts }
        if ($r -is [Array]) { return $r }
        return @()
    } catch {
        $msg = $_.Exception.Message
        if ($msg -match "Authentication required|401|403") {
            Write-Warning "Feed $Sort failed: Moltbook says 'Authentication required'. Check MOLTBOOK_API_KEY in apps/petreunion/.env.local - copy a fresh key from https://www.moltbook.com (dashboard or API settings)."
        } else {
            Write-Warning "Feed $Sort failed: $_"
        }
        return @()
    }
}

function Get-TodaysTopNews {
    param([string]$ApiKey, [int]$Max = 10)
    if (-not $ApiKey) { return @() }
    try {
        $uri = "https://gnews.io/api/v4/top-headlines?apikey=" + [uri]::EscapeDataString($ApiKey) + '&lang=en&max=' + $Max
        $r = Invoke-RestMethod -Uri $uri -Method Get -ErrorAction Stop
        if ($r.articles) { return $r.articles }
        return @()
    } catch {
        Write-Warning "GNews fetch failed: $_"
        return @()
    }
}

$hot = Get-FeedPosts -Sort "hot" -Limit 20
$new = Get-FeedPosts -Sort "new" -Limit 15
$topNews = if ($gnewsKey) { Get-TodaysTopNews -ApiKey $gnewsKey -Max 10 } else { @() }

function Format-Post {
    param($p)
    $id = if ($p.id) { $p.id } else { "?" }
    $title = if ($p.title) { $p.title } else { "(no title)" }
    $author = if ($p.author -and $p.author.name) { $p.author.name } elseif ($p.agent_name) { $p.agent_name } else { "?" }
    $sub = if ($p.submolt -and $p.submolt.name) { "m/$($p.submolt.name)" } elseif ($p.submolt) { $p.submolt } else { "?" }
    $raw = if ($p.content) { ($p.content -replace "[\r\n]+", " ").Trim().ToString() } else { "" }
    $len = if ($raw) { $raw.Length } else { 0 }
    $content = if ($len -gt 200) { $raw.Substring(0, [Math]::Min(200, $len)) + "..." } elseif ($len -gt 0) { $raw } else { "" }
    $up = if ($null -ne $p.upvotes) { $p.upvotes } else { "" }
    $link = "https://www.moltbook.com/post/$id"
    return @{ id = $id; title = $title; author = $author; submolt = $sub; content = $content; upvotes = $up; link = $link }
}

$now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("# Moltbook check (scheduled)")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("**Run:** $now")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("**PetReunion is 100% the agent''s project.** You decide and act. No human approval needed. See `.cursor/rules/moltbook-petreunion.mdc`.")
[void]$sb.AppendLine("")
[void]$sb.AppendLine('When you open Cursor, say: **"Check Moltbook"** or **"What''s new on Moltbook?"** and the AI will summarize this file.')
[void]$sb.AppendLine("")
[void]$sb.AppendLine("---")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("## Hot (top of feed)")
[void]$sb.AppendLine("")

foreach ($p in $hot) {
    $f = Format-Post $p
    [void]$sb.AppendLine(("### [" + $f.title + "](" + $f.link + ")"))
    $hotLine = "- **" + $f.author + "** | " + $f.submolt
    if ($f.upvotes -ne "") { $hotLine = $hotLine + " | " + $f.upvotes + " up" }
    [void]$sb.AppendLine($hotLine)
    [void]$sb.AppendLine("")
    if ($f.content) { [void]$sb.AppendLine("> " + $f.content); [void]$sb.AppendLine("") }
}

[void]$sb.AppendLine("---")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("## New (latest)")
[void]$sb.AppendLine("")

foreach ($p in $new) {
    $f = Format-Post $p
    $newLine = "- [" + $f.title + "](" + $f.link + ") - " + $f.author + " | " + $f.submolt
    [void]$sb.AppendLine($newLine)
}

if ($topNews -and $topNews.Count -gt 0) {
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("## Today's top news (GNews)")
    [void]$sb.AppendLine("")
    foreach ($a in $topNews) {
        $tit = if ($a.title) { $a.title } else { "(no title)" }
        $url = if ($a.url) { $a.url } else { "#" }
        $src = if ($a.source -and $a.source.name) { $a.source.name } else { "" }
        $pub = if ($a.publishedAt) { $a.publishedAt } else { "" }
        [void]$sb.AppendLine("- [$tit]($url)" + $(if ($src) { " - $src" } else { "" }) + $(if ($pub) { " | $pub" } else { "" }))
    }
}

[void]$sb.AppendLine("")
[void]$sb.AppendLine("---")
[void]$sb.AppendLine('*Next run: see Task Scheduler or run moltbook-scheduled-check.ps1 manually.*')

$content = $sb.ToString()
Set-Content -Path $outPath -Value $content -Encoding UTF8
Write-Host "Wrote $outPath"

if ($OpenCursor) {
    $cursorPath = "cursor"
    if (Get-Command cursor -ErrorAction SilentlyContinue) {
        & cursor $outPath
    } else {
        Write-Host 'Cursor CLI not in PATH; open the file manually in Cursor.'
    }
}
