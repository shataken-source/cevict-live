. (Join-Path $PSScriptRoot "Get-MoltbookKey.ps1")
$k = Get-MoltbookKey
if (-not $k) { Write-Host "No key"; exit 1 }
try {
  $r = Invoke-RestMethod -Uri "https://www.moltbook.com/api/v1/agents/status" -Headers @{ Authorization = "Bearer $k" }
  Write-Host "Status:" ($r | ConvertTo-Json -Compress)
} catch {
  Write-Host "HTTP:" $_.Exception.Response.StatusCode.value__
  if ($_.ErrorDetails.Message) { Write-Host "Body:" $_.ErrorDetails.Message }
}
