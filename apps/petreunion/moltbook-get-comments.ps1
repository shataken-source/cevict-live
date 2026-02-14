# GET comments on our post; output JSON to stdout for the agent to read
. (Join-Path $PSScriptRoot "Get-MoltbookKey.ps1")
$key = Get-MoltbookKey
if (-not $key) { Write-Error "No Moltbook API key found"; exit 1 }
$uri = "https://www.moltbook.com/api/v1/posts/86fd9ec8-2e86-43c4-842e-a7eefbb6e88b/comments?sort=new&limit=25"
$r = Invoke-RestMethod -Uri $uri -Headers @{ Authorization = "Bearer $key" }
$r | ConvertTo-Json -Depth 6
