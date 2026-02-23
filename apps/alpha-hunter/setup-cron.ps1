# Setup Scheduled Task for Crypto Trainer
# Simpler alternative to Windows Service - runs on a schedule

param(
    [string]$Schedule = "hourly", # hourly, daily, startup, continuous
    [switch]$Uninstall,
    [switch]$Status
)

$TaskName = "AlphaHunter-CryptoTrainer"
$WorkingDir = "C:\cevict-live\apps\alpha-hunter"
$ScriptPath = "$WorkingDir\src\crypto-trainer.ts"

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (!$isAdmin) {
    Write-Host "[ERROR] This script requires administrator privileges" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Status
if ($Status) {
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($task) {
        Write-Host "[STATUS] Scheduled Task Status" -ForegroundColor Green
        Write-Host "   Name: $($task.TaskName)"
        Write-Host "   State: $($task.State)"
        Write-Host "   Last Run: $($task.LastRunTime)"
        Write-Host "   Next Run: $($task.NextRunTime)"
        Write-Host "   Last Result: $($task.LastTaskResult)"

        # Show trigger info
        $triggers = $task.Triggers
        Write-Host "   Triggers:"
        foreach ($trigger in $triggers) {
            Write-Host "     - $($trigger.CimClass.CimClassName)"
        }
    }
    else {
        Write-Host "[ERROR] Scheduled task not found" -ForegroundColor Red
    }
    exit 0
}

# Uninstall
if ($Uninstall) {
    Write-Host "[UNINSTALL] Removing scheduled task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "[SUCCESS] Task removed" -ForegroundColor Green
    exit 0
}

# Install
Write-Host "[SETUP] Setting up Crypto Trainer Scheduled Task" -ForegroundColor Cyan
Write-Host ""

# Remove existing task
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[WARNING] Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create action (WindowStyle Hidden prevents popup)
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command `"cd '$WorkingDir'; npm run train`"" `
    -WorkingDirectory $WorkingDir

# Create trigger based on schedule
switch ($Schedule.ToLower()) {
    "hourly" {
        $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1)
        Write-Host "[SCHEDULE] Every hour" -ForegroundColor Cyan
    }
    "daily" {
        $trigger = New-ScheduledTaskTrigger -Daily -At "9:00AM"
        Write-Host "[SCHEDULE] Daily at 9:00 AM" -ForegroundColor Cyan
    }
    "startup" {
        $trigger = New-ScheduledTaskTrigger -AtStartup
        Write-Host "[SCHEDULE] At system startup" -ForegroundColor Cyan
    }
    "continuous" {
        # Run every 5 minutes indefinitely
        $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
        Write-Host "[SCHEDULE] Every 5 minutes (continuous)" -ForegroundColor Cyan
    }
    default {
        Write-Host "[ERROR] Invalid schedule: $Schedule" -ForegroundColor Red
        Write-Host "   Valid options: hourly, daily, startup, continuous" -ForegroundColor Yellow
        exit 1
    }
}

# Create settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2)

# Register task
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Alpha Hunter crypto trading bot with local AI analysis" | Out-Null

Write-Host "[SUCCESS] Scheduled task created!" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Task Details:" -ForegroundColor Cyan
Write-Host "   Name: $TaskName"
Write-Host "   Schedule: $Schedule"
Write-Host "   Working Dir: $WorkingDir"
Write-Host ""
Write-Host "[INFO] Management Commands:" -ForegroundColor Cyan
Write-Host "   Status:  .\setup-cron.ps1 -Status"
Write-Host "   Remove:  .\setup-cron.ps1 -Uninstall"
Write-Host "   View in Task Scheduler: taskschd.msc"
Write-Host ""

# Ask to run now
$run = Read-Host "Run task now for testing? (Y/n)"
if ($run -ne 'n' -and $run -ne 'N') {
    Write-Host "[START] Starting task..." -ForegroundColor Yellow
    Start-ScheduledTask -TaskName $TaskName
    Start-Sleep -Seconds 2
    Write-Host "[SUCCESS] Task started! Check Task Scheduler for status." -ForegroundColor Green
}
