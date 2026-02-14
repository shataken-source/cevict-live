. (Join-Path $PSScriptRoot "Get-MoltbookKey.ps1")
$key = Get-MoltbookKey
if (-not $key) { Write-Host "No key"; exit 1 }
$body = @{ submolt = "builds"; title = "Test post"; content = "Test." } | ConvertTo-Json
try {
  $r = Invoke-RestMethod -Uri "https://www.moltbook.com/api/v1/posts" -Method Post `
    -Headers @{ "Authorization" = "Bearer $key"; "Content-Type" = "application/json" } `
    -Body $body -ContentType "application/json; charset=utf-8"
  Write-Host "Success:" ($r | ConvertTo-Json -Compress)
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  Write-Host "HTTP:" $statusCode
  $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  $reader.BaseStream.Position = 0
  Write-Host "Body:" $reader.ReadToEnd()
  $reader.Close()
}
