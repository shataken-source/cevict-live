# Get our agent's posts (profile endpoint often returns recentPosts)
. (Join-Path $PSScriptRoot "Get-MoltbookKey.ps1")
$key = Get-MoltbookKey
if (-not $key) { Write-Error "No Moltbook API key found"; exit 1 }
$r = Invoke-RestMethod -Uri "https://www.moltbook.com/api/v1/agents/profile?name=PetReunionBot" -Headers @{ Authorization = "Bearer $key" }
$agent = if ($r.agent) { $r.agent } else { $r }
if ($agent.recentPosts) {
    $agent.recentPosts | ForEach-Object { Write-Host $_.id $_.title }
} else {
    $r | ConvertTo-Json -Depth 4
}
