# 🐾 PetReunion - Schedule Daily Scraper
# Sets up Windows scheduled task to run PetReunion scraper daily

$ErrorActionPreference = "Stop"

Write-Host "🐾 PetReunion - Daily Scraper Scheduler" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Configuration
$ScriptDir = $PSScriptRoot
$TaskName = "PetReunionDailyScraper"
$PetReunionUrl = "https://petreunion.vercel.app"  # Or http://localhost:3003 if running locally

# Create PowerShell script that calls the API
$ScraperScript = Join-Path $ScriptDir "run-daily-scraper.ps1"

# Create the scraper runner script
$scraperContent = @"
# PetReunion Daily Scraper Runner
# This script calls the PetReunion scraper API endpoint

`$ErrorActionPreference = "Continue"
`$LogDir = Join-Path `$PSScriptRoot "logs"
`$LogFile = Join-Path `$LogDir "scraper-`$(Get-Date -Format 'yyyy-MM-dd').log"

if (-not (Test-Path `$LogDir)) {
    New-Item -ItemType Directory -Path `$LogDir -Force | Out-Null
}

function Write-Log {
    param([string]`$Message, [string]`$Level = "INFO")
    `$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    `$LogMessage = "[`$Timestamp] [`$Level] `$Message"
    Add-Content -Path `$LogFile -Value `$LogMessage
    Write-Host `$LogMessage
}

Write-Log "Starting PetReunion daily scraper..." "INFO"

# Call the populate-database endpoint
try {
    `$response = Invoke-RestMethod -Uri "$PetReunionUrl/api/petreunion/populate-database" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body (@{
            maxCities = 10
            delayBetweenCities = 5000
        } | ConvertTo-Json) `
        -ErrorAction Stop
    
    if (`$response.success) {
        Write-Log "✅ Scraper completed successfully" "INFO"
        Write-Log "   Stats: `$(`$response.stats | ConvertTo-Json -Compress)" "INFO"
    }
    else {
        Write-Log "⚠️  Scraper returned: `$(`$response.error)" "WARN"
        
        # Check if it's a 501 (not implemented) - that's expected for now
        if (`$response.error -like "*not yet implemented*") {
            Write-Log "   Note: Scraper logic is not yet implemented. This is expected." "INFO"
        }
    }
}
catch {
    `$statusCode = `$_.Exception.Response.StatusCode.value__
    if (`$statusCode -eq 501) {
        Write-Log "⚠️  Scraper endpoint returns 501 (Not Implemented)" "WARN"
        Write-Log "   This is expected - scraper logic needs to be implemented" "INFO"
    }
    else {
        Write-Log "❌ Scraper failed: `$(`$_.Exception.Message)" "ERROR"
        Write-Log "   Status Code: `$statusCode" "ERROR"
    }
}

Write-Log "Daily scraper run complete" "INFO"
"@

Set-Content -Path $ScraperScript -Value $scraperContent
Write-Host "✅ Created scraper runner script: $ScraperScript" -ForegroundColor Green

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "⚠️  Task '$TaskName' already exists!" -ForegroundColor Yellow
    $response = Read-Host "   Do you want to remove and recreate it? (Y/N)"
    if ($response -eq "Y" -or $response -eq "y") {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "   ✅ Task removed" -ForegroundColor Green
    }
    else {
        Write-Host "   Keeping existing task. Exiting." -ForegroundColor Yellow
        exit 0
    }
}

# Create scheduled task action
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScraperScript`"" `
    -WorkingDirectory $ScriptDir

# Create trigger (daily at 2:00 AM)
$trigger = New-ScheduledTaskTrigger -Daily -At "2:00AM"

# Create settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2)  # 2 hour timeout

# Create principal
$principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType S4U `
    -RunLevel Highest

# Register the task
Write-Host "📝 Creating scheduled task..." -ForegroundColor Yellow
try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "PetReunion Daily Scraper - Runs daily at 2:00 AM to populate database" | Out-Null
    
    Write-Host "   ✅ Task created successfully!" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ Failed to create task: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Installation Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Configuration:" -ForegroundColor Cyan
Write-Host "   Task Name: $TaskName" -ForegroundColor White
Write-Host "   Schedule: Daily at 2:00 AM" -ForegroundColor White
Write-Host "   Script: $ScraperScript" -ForegroundColor White
Write-Host "   API Endpoint: $PetReunionUrl/api/petreunion/populate-database" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Note: The scraper endpoint currently returns 501 (Not Implemented)" -ForegroundColor Yellow
Write-Host "   This is expected - the scraper logic needs to be implemented." -ForegroundColor Yellow
Write-Host "   The automation is set up and will run once the scraper is implemented." -ForegroundColor Yellow
Write-Host ""
Write-Host "🔍 To manage the task:" -ForegroundColor Cyan
Write-Host "   - Open Task Scheduler (taskschd.msc)" -ForegroundColor White
Write-Host "   - Look for task: '$TaskName'" -ForegroundColor White
Write-Host "   - To test: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host ""

