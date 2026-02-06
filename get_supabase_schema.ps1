# PowerShell script to query Supabase schema via REST API
# This queries the information_schema to get table and column details

$supabaseUrl = "https://nqkbqtiramecvmmpaxzk.supabase.co"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa2JxdGlyYW1lY3ZtbXBheHprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyOTAyMSwiZXhwIjoyMDc5MjA1MDIxfQ.fjAeZYDupPgsOJImWELs30Er9amRMlhvRI2sb7dJfDg"

# Headers
$headers = @{
    "apikey" = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

# SQL query to get schema
$query = @"
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    CASE 
        WHEN pk.column_name IS NOT NULL THEN 'yes'
        ELSE 'no'
    END AS is_primary_key,
    CASE 
        WHEN c.is_nullable = 'YES' THEN 'yes'
        ELSE 'no'
    END AS is_nullable,
    c.column_default,
    c.udt_name AS postgres_type
FROM 
    information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    LEFT JOIN (
        SELECT 
            ku.table_name,
            ku.column_name
        FROM 
            information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku 
                ON tc.constraint_name = ku.constraint_name
        WHERE 
            tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = 'public'
    ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY 
    t.table_name,
    c.ordinal_position;
"@

# Use PostgREST RPC or direct query
# Note: Supabase REST API doesn't directly support information_schema queries
# We need to use a different approach

Write-Host "Querying Supabase schema..."
Write-Host "Note: This requires running the SQL query in Supabase SQL Editor"
Write-Host ""
Write-Host "SQL Query saved to: query_supabase_schema.sql"
Write-Host ""
Write-Host "Alternatively, we can query specific tables directly..."

# Get list of tables by querying pg_tables
$tablesQuery = "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

# Try to get bookings table structure as example
try {
    $bookingsUrl = "$supabaseUrl/rest/v1/bookings?limit=0"
    $response = Invoke-RestMethod -Uri $bookingsUrl -Method GET -Headers $headers
    Write-Host "Successfully connected to Supabase"
    Write-Host "Found bookings table"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host ""
    Write-Host "Please run the SQL query in Supabase SQL Editor:"
    Write-Host "1. Go to: https://supabase.com/dashboard/project/nqkbqtiramecvmmpaxzk/sql"
    Write-Host "2. Paste the query from query_supabase_schema.sql"
    Write-Host "3. Run it and copy the results"
}
