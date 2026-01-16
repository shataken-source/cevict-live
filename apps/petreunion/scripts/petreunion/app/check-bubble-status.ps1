# Check PetReunion Bubble Status and Show How to Access

# FIXED PORT: PetReunion Forge API runs on port 3001
$FORGE_PORT = 3001
$baseUrl = "http://localhost:$FORGE_PORT/api/bubble"

Write-Host "=== PetReunion Bubble Status Check ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Connecting to PetReunion Forge API on port $FORGE_PORT..." -ForegroundColor Yellow

Write-Host ""
Write-Host "Fetching all bubbles..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/create" -Method GET
    
    if ($response.success -and $response.bubbles) {
        Write-Host ""
        Write-Host "=== ALL BUBBLES ===" -ForegroundColor Green
        Write-Host ""
        
        $bubbleName = "PetReunion Complete Website Redesign"
        $found = $false
        
        foreach ($bubble in $response.bubbles) {
            $isPetReunion = ($bubble.name -eq $bubbleName -or $bubble.name -like "*PetReunion*")
            
            if ($isPetReunion) {
                $found = $true
                Write-Host "✅ FOUND: $($bubble.name)" -ForegroundColor Green
                Write-Host "   ID: $($bubble.id)" -ForegroundColor Cyan
                Write-Host "   Agents: $($bubble.agents -join ', ')" -ForegroundColor Gray
            } else {
                Write-Host "   $($bubble.name) (ID: $($bubble.id))" -ForegroundColor Gray
            }
        }
        
        Write-Host ""
        
        if ($found) {
            Write-Host "=== ✅ SUCCESS! ===" -ForegroundColor Green
            Write-Host ""
            Write-Host "Your PetReunion bubble exists!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📱 TO VIEW IT IN THE FORGE UI:" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "   1. Open your browser" -ForegroundColor Cyan
            Write-Host "   2. Go to: http://localhost:$FORGE_PORT/auspicio/forge" -ForegroundColor White -BackgroundColor DarkBlue
            Write-Host ""
            Write-Host "   3. In the 'Select Bubble' dropdown at the top" -ForegroundColor Cyan
            Write-Host "   4. Choose: 'PetReunion Complete Website Redesign'" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "   5. You should see:" -ForegroundColor Cyan
            Write-Host "      - Build Progress panel" -ForegroundColor Gray
            Write-Host "      - Agent Status (ARCHITECT, ENGINEER, VALIDATOR)" -ForegroundColor Gray
            Write-Host "      - Log Console (agent messages)" -ForegroundColor Gray
            Write-Host "      - Command Input (send new commands)" -ForegroundColor Gray
            Write-Host ""
        } else {
            Write-Host "=== ❌ NOT FOUND ===" -ForegroundColor Red
            Write-Host ""
            Write-Host "PetReunion bubble does NOT exist yet!" -ForegroundColor Red
            Write-Host ""
            Write-Host "Create it now:" -ForegroundColor Yellow
            Write-Host "  .\create-forge-bubble.ps1" -ForegroundColor Cyan
            Write-Host ""
        }
        
        Write-Host ""
        Write-Host "=== QUICK ACCESS ===" -ForegroundColor Cyan
        Write-Host "Forge UI: http://localhost:$FORGE_PORT/auspicio/forge" -ForegroundColor White -BackgroundColor DarkBlue
        Write-Host ""
        
    } else {
        Write-Host "[ERROR] Could not retrieve bubbles." -ForegroundColor Red
        Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor DarkRed
    }
    
} catch {
    Write-Host "[ERROR] Failed to check bubbles: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure the PetReunion Forge API is running on port $FORGE_PORT" -ForegroundColor Yellow
}

