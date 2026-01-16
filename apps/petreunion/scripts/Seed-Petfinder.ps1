param(
    [string]$ApiUrl = "http://localhost:3007",
    [string]$State = "",
    [int]$MaxPets = 200,
    [switch]$AllStates
)

Write-Host "`n=== PETFINDER SEEDER ===" -ForegroundColor Magenta

$states = @("AL","TX","CA","FL","NY","GA","NC","TN","OH","PA")
if ($AllStates) {
    $states = @("AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY")
}
if ($State) { $states = @($State) }

$url = "$ApiUrl/api/petreunion/scrape-petfinder"
$total = 0
$perState = [Math]::Max(10, [Math]::Floor($MaxPets / $states.Count))

foreach ($s in $states) {
    Write-Host "[SCRAPE] $s - $perState pets..." -ForegroundColor Cyan
    try {
        $body = @{ state = $s; maxPets = $perState; pages = 2 } | ConvertTo-Json
        $r = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -TimeoutSec 120
        if ($r.success) {
            Write-Host "   Saved: $($r.summary.petsSaved)" -ForegroundColor Green
            $total += $r.summary.petsSaved
        } else {
            Write-Host "   Error: $($r.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    Start-Sleep -Milliseconds 500
}

Write-Host "`n=== DONE: $total pets saved ===" -ForegroundColor Green