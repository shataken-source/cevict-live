# GET comments on our post; output JSON to stdout for the agent to read
$envPath = Join-Path $PSScriptRoot ".env.local"
$key = (Get-Content $envPath | Where-Object { $_ -match "MOLTBOOK_API_KEY=" }) -replace "MOLTBOOK_API_KEY=",""
$key = $key.Trim().Trim('"').Trim("'")
$uri = "https://www.moltbook.com/api/v1/posts/86fd9ec8-2e86-43c4-842e-a7eefbb6e88b/comments?sort=new&limit=25"
$r = Invoke-RestMethod -Uri $uri -Headers @{ Authorization = "Bearer $key" }
$r | ConvertTo-Json -Depth 6
