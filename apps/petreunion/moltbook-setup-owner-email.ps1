# POST /api/v1/agents/me/setup-owner-email
. (Join-Path $PSScriptRoot "Get-MoltbookKey.ps1")
$key = Get-MoltbookKey
if (-not $key) { Write-Error "No Moltbook API key"; exit 1 }
$body = @{ email = "shataken@gmail.com" } | ConvertTo-Json
try {
  $r = Invoke-RestMethod -Uri "https://www.moltbook.com/api/v1/agents/me/setup-owner-email" -Method Post `
    -Headers @{ "Authorization" = "Bearer $key"; "Content-Type" = "application/json" } `
    -Body $body -ContentType "application/json; charset=utf-8"
  Write-Host ($r | ConvertTo-Json -Depth 5)
} catch {
  Write-Host "HTTP:" $_.Exception.Response.StatusCode.value__
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  $stream = $_.Exception.Response.GetResponseStream()
  if ($stream) { $reader = New-Object System.IO.StreamReader($stream); $stream.Position = 0; Write-Host $reader.ReadToEnd(); $reader.Close() }
  exit 1
}
