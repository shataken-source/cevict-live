# Apply syndicated_picks migration to Supabase
# Uses the Supabase REST API to execute SQL directly

$SUPABASE_URL = "https://rdbuwyefbgnbuhmjrizo.supabase.co"
$SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkYnV3eWVmYmduYnVobWpyaXpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyOTg3OSwiZXhwIjoyMDc5MjA1ODc5fQ.JQBc_tHs2rZ9seyy8SygTzroB2ZVZo5JfrC8nriXo6I"

$SQL = Get-Content "$PSScriptRoot\001_syndicated_picks.sql" -Raw

$headers = @{
    "apikey"        = $SERVICE_KEY
    "Authorization" = "Bearer $SERVICE_KEY"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=minimal"
}

$body = @{ query = $SQL } | ConvertTo-Json -Depth 5

Write-Host "Applying migration to Supabase..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod `
        -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop

    Write-Host "Migration applied successfully!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json)
} catch {
    # Supabase doesn't expose exec_sql by default — use the SQL editor endpoint
    Write-Host "exec_sql not available, trying pg endpoint..." -ForegroundColor Yellow

    $pgHeaders = @{
        "apikey"        = $SERVICE_KEY
        "Authorization" = "Bearer $SERVICE_KEY"
        "Content-Type"  = "application/json"
    }

    # Split into individual statements and run each via a simple fetch
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "Manual option: Copy 001_syndicated_picks.sql into the Supabase SQL Editor at:" -ForegroundColor Yellow
    Write-Host "  https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/sql" -ForegroundColor Cyan
}
