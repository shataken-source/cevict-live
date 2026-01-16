# Trigger all agents in PetReunion bubble to start working

# FIXED PORT: PetReunion Forge API runs on port 3001
$FORGE_PORT = 3001
$baseUrl = "http://localhost:$FORGE_PORT/api/bubble"

Write-Host "Connecting to PetReunion Forge API on port $FORGE_PORT..." -ForegroundColor Yellow

# --- SAFE REQUEST FUNCTION ---
function SafeRequest {
    param(
        [string]$Method,
        [string]$Url,
        $Body
    )

    try {
        if ($Body) {
            return Invoke-RestMethod -Uri $Url -Method $Method -Body ($Body | ConvertTo-Json -Depth 10) -ContentType "application/json"
        } else {
            return Invoke-RestMethod -Uri $Url -Method $Method
        }
    }
    catch {
        Write-Host "Request failed for $Url" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor DarkRed
        return $null
    }
}

# Get bubble ID - find PetReunion bubble
Write-Host "Finding PetReunion bubble..." -ForegroundColor Yellow

$bubblesResponse = SafeRequest -Method GET -Url "$baseUrl/create"

if (-not $bubblesResponse -or -not $bubblesResponse.success) {
    Write-Host "[ERROR] Could not retrieve bubbles." -ForegroundColor Red
    if ($bubblesResponse) {
        Write-Host "Response: $($bubblesResponse | ConvertTo-Json)" -ForegroundColor DarkRed
    }
    exit 1
}

# Consistent bubble name - must match create script
$bubbleName = "PetReunion Complete Website Redesign"

$bubble = $bubblesResponse.bubbles | Where-Object { 
    $_.name -eq $bubbleName -or $_.name -like "*PetReunion*" 
} | Select-Object -First 1

if (!$bubble) {
    Write-Host "[ERROR] No PetReunion bubble found!" -ForegroundColor Red
    Write-Host "Attempting to create bubble automatically..." -ForegroundColor Yellow
    
    # Try to create the bubble automatically
    $createScript = Join-Path $PSScriptRoot "create-forge-bubble.ps1"
    if (Test-Path $createScript) {
        Write-Host "Running create-forge-bubble.ps1..." -ForegroundColor Cyan
        & $createScript
        
        # Wait a moment for bubble to be created
        Start-Sleep -Seconds 2
        
        # Try to find it again
        $bubblesResponse = SafeRequest -Method GET -Url "$baseUrl/bubbles"
        if ($bubblesResponse -and $bubblesResponse.success) {
            $bubble = $bubblesResponse.bubbles | Where-Object { 
                $_.name -eq $bubbleName -or $_.name -like "*PetReunion*" 
            } | Select-Object -First 1
        }
    }
    
    if (!$bubble) {
        Write-Host "[ERROR] Could not find or create PetReunion bubble!" -ForegroundColor Red
        Write-Host "Please run create-forge-bubble.ps1 manually first." -ForegroundColor Yellow
        exit 1
    }
}

$bubbleId = $bubble.id
Write-Host "[OK] Found bubble: $($bubble.name) (ID: $bubbleId)" -ForegroundColor Green
Write-Host ""

# Messages to send to each agent
$messages = @(
    @{
        toAgent = "ARCHITECT"
        task = "You are coordinating the PetReunion redesign. Read the bubble description completely. Break down the work and send specific tasks to ENGINEER (for code), VALIDATOR (for quality checks), and coordinate with all team members. Start by creating a work breakdown structure and assigning tasks. Send messages to other agents to get them working."
    },
    @{
        toAgent = "ENGINEER"
        task = "ARCHITECT is coordinating the PetReunion redesign. Wait for ARCHITECT to assign you specific coding tasks. When you receive tasks, create production-ready React/TypeScript components, Tailwind CSS configurations, and complete page implementations. All code must be TypeScript-compliant and accessible."
    },
    @{
        toAgent = "VALIDATOR"
        task = "ARCHITECT is coordinating the PetReunion redesign. Your job is to ensure ALL deliverables are 100% complete (not 10%). Verify code quality, check that all legal content is ready, ensure documentation is comprehensive, and validate that everything is implementable. Report any gaps to ARCHITECT."
    }
)

Write-Host "=== Sending Messages to Agents ===" -ForegroundColor Cyan
Write-Host ""

foreach ($msg in $messages) {
    Write-Host "Sending to $($msg.toAgent)..." -ForegroundColor Yellow
    
    $response = SafeRequest -Method POST -Url "$baseUrl/message" -Body @{
        bubbleId = $bubbleId
        fromAgent = "USER"
        toAgent = $msg.toAgent
        messageType = "request"
        payload = @{
            task = $msg.task
            commandText = $msg.task
            projectName = $bubbleName
        }
        priority = "high"
    }
    
    if ($response -and $response.success) {
        Write-Host "  [OK] Message sent to $($msg.toAgent)" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Failed to send message to $($msg.toAgent)" -ForegroundColor Red
        if ($response) {
            Write-Host "  Error: $($response.error)" -ForegroundColor DarkRed
        }
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "=== Triggering Agent Processing ===" -ForegroundColor Cyan

Start-Sleep -Seconds 2

$process = SafeRequest -Method POST -Url "$baseUrl/process" -Body @{ bubbleId = $bubbleId }

if ($process -and $process.processed -gt 0) {
    Write-Host "[OK] Processing triggered! ($($process.processed) message(s) processed)" -ForegroundColor Green
    Write-Host ""
    Write-Host "[INFO] Check the Forge UI to see agent responses!" -ForegroundColor Yellow
    Write-Host "       Agents should now be working and coordinating." -ForegroundColor Cyan
} else {
    Write-Host "[WARN] No messages processed. Agents may need more time or messages." -ForegroundColor Yellow
    if ($process) {
        Write-Host "Response: $($process | ConvertTo-Json)" -ForegroundColor DarkYellow
    }
}

Write-Host ""
Write-Host "[TIP] Run this script again if agents go idle, or check the Forge UI for status." -ForegroundColor Gray
