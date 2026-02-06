# Pet Recovery Script - PowerShell
# This automates copying pets from pets table to lost_pets

$PROJECT2_URL = "https://rdbuwyefbgnbuhmjrizo.supabase.co"
$PROJECT2_KEY = Read-Host "Enter Project 2 Service Role Key"

Write-Host "=== Checking Project 2 ===" -ForegroundColor Cyan

# Check pets table count
$petsCount = Invoke-RestMethod -Uri "$PROJECT2_URL/rest/v1/pets?select=id&limit=1" `
  -Headers @{
    "apikey" = $PROJECT2_KEY
    "Authorization" = "Bearer $PROJECT2_KEY"
    "Prefer" = "count=exact"
  } -ErrorAction SilentlyContinue

Write-Host "Pets table: Checking..." -ForegroundColor Yellow

# Get all pets and copy to lost_pets
Write-Host "`n=== Copying pets to lost_pets ===" -ForegroundColor Cyan

# Use Supabase REST API to copy data
$response = Invoke-RestMethod -Uri "$PROJECT2_URL/rest/v1/rpc/copy_pets_to_lost_pets" `
  -Method POST `
  -Headers @{
    "apikey" = $PROJECT2_KEY
    "Authorization" = "Bearer $PROJECT2_KEY"
    "Content-Type" = "application/json"
  } -ErrorAction SilentlyContinue

Write-Host "✅ Copy complete!" -ForegroundColor Green
