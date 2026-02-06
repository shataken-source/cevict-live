# Get our agent's posts (profile endpoint often returns recentPosts)
$envPath = Join-Path $PSScriptRoot ".env.local"
$key = (Get-Content $envPath | Where-Object { $_ -match "MOLTBOOK_API_KEY=" }) -replace "MOLTBOOK_API_KEY=",""
$key = $key.Trim().Trim('"').Trim("'")
$r = Invoke-RestMethod -Uri "https://www.moltbook.com/api/v1/agents/profile?name=PetReunionBot" -Headers @{ Authorization = "Bearer $key" }
$agent = if ($r.agent) { $r.agent } else { $r }
if ($agent.recentPosts) {
    $agent.recentPosts | ForEach-Object { Write-Host $_.id $_.title }
} else {
    $r | ConvertTo-Json -Depth 4
}
