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

if (-not (Test-Path $envPath)) {
    Write-Warning "No .env.local at $envPath. Set MOLTBOOK_API_KEY there."
    exit 1
}

$keyLine = Get-Content $envPath | Where-Object { $_ -match "MOLTBOOK_API_KEY=" }
if (-not $keyLine) {
    Write-Warning "MOLTBOOK_API_KEY not found in .env.local"
    exit 1
}
$key = ($keyLine -replace "MOLTBOOK_API_KEY=", "").Trim().Trim('"').Trim("'")

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
        Write-Warning "Feed $Sort failed: $_"
        return @()
    }
}

$hot = Get-FeedPosts -Sort "hot" -Limit 20
$new = Get-FeedPosts -Sort "new" -Limit 15

function Format-Post {
    param($p)
    $id = if ($p.id) { $p.id } else { "?" }
    $title = if ($p.title) { $p.title } else { "(no title)" }
    $author = if ($p.author -and $p.author.name) { $p.author.name } elseif ($p.agent_name) { $p.agent_name } else { "?" }
    $sub = if ($p.submolt -and $p.submolt.name) { "m/$($p.submolt.name)" } elseif ($p.submolt) { $p.submolt } else { "?" }
    $raw = if ($p.content) { ($p.content -replace "[\r\n]+", " ").Trim() } else { "" }
    $content = if ($raw.Length -gt 200) { $raw.Substring(0, 200) + "..." } elseif ($raw.Length -gt 0) { $raw } else { "" }
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
[void]$sb.AppendLine('When you open Cursor, say: **"Check Moltbook"** or **"What''s new on Moltbook?"** and the AI will summarize this file.')
[void]$sb.AppendLine("")
[void]$sb.AppendLine("---")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("## Hot (top of feed)")
[void]$sb.AppendLine("")

foreach ($p in $hot) {
    $f = Format-Post $p
    [void]$sb.AppendLine("### [$($f.title)]($($f.link))")
    [void]$sb.AppendLine("- **$($f.author)** · $($f.submolt)" + $(if ($f.upvotes -ne "") { " · $($f.upvotes) up" } else { "" }))
    [void]$sb.AppendLine("")
    if ($f.content) { [void]$sb.AppendLine("> $($f.content)"); [void]$sb.AppendLine("") }
}

[void]$sb.AppendLine("---")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("## New (latest)")
[void]$sb.AppendLine("")

foreach ($p in $new) {
    $f = Format-Post $p
    [void]$sb.AppendLine("- [$($f.title)]($($f.link)) — $($f.author) · $($f.submolt)")
}

[void]$sb.AppendLine("")
[void]$sb.AppendLine("---")
[void]$sb.AppendLine("*Next run: see Task Scheduler or run `moltbook-scheduled-check.ps1` manually.*")

$content = $sb.ToString()
Set-Content -Path $outPath -Value $content -Encoding UTF8
Write-Host "Wrote $outPath"

if ($OpenCursor) {
    $cursorPath = "cursor"
    if (Get-Command cursor -ErrorAction SilentlyContinue) {
        & cursor $outPath
    } else {
        Write-Host "Cursor CLI not in PATH; open the file manually in Cursor."
    }
}
