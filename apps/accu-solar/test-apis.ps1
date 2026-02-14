$base = "http://localhost:3122"

Write-Host "Testing Geocoding API..." -ForegroundColor Cyan
Write-Host "Query: tampa" -ForegroundColor Yellow
$resp = Invoke-WebRequest -Uri "$base/api/geocode?q=tampa" -UseBasicParsing -Method GET
$data = $resp.Content | ConvertFrom-Json
Write-Host "Response:" -ForegroundColor Green
$data | ConvertTo-Json -Depth 3 | Write-Host
Write-Host ""

Write-Host "Testing Weather API (San Francisco)..." -ForegroundColor Cyan
Write-Host "Query: lat=37.7749&lon=-122.4194" -ForegroundColor Yellow
$resp = Invoke-WebRequest -Uri "$base/api/weather?lat=37.7749&lon=-122.4194" -UseBasicParsing -Method GET
$data = $resp.Content | ConvertFrom-Json
Write-Host "Response:" -ForegroundColor Green
$data | ConvertTo-Json -Depth 3 | Write-Host
Write-Host ""

Write-Host "Testing Geocoding API (Huntsville)..." -ForegroundColor Cyan
Write-Host "Query: huntsville al" -ForegroundColor Yellow
$resp = Invoke-WebRequest -Uri "$base/api/geocode?q=huntsville%20al" -UseBasicParsing -Method GET
$data = $resp.Content | ConvertFrom-Json
Write-Host "Response:" -ForegroundColor Green
$data | ConvertTo-Json -Depth 3 | Write-Host
