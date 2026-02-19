#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Probability Analyzer Scheduler Runner
    
.DESCRIPTION
    This script runs the scheduler to process predictions and results.
    It should be called by Windows Task Scheduler on a schedule.
    
.EXAMPLE
    .\run-scheduler.ps1
    
    Run the scheduler once manually
    
.EXAMPLE
    .\run-scheduler.ps1 -SetupTask
    
    Create the Windows Task Scheduler job
#>

param(
    [switch]$SetupTask,
    [switch]$RunNow,
    [switch]$RemoveTask,
    [string]$TaskName = "ProbabilityAnalyzer-Scheduler",
    [string]$Schedule = "DAILY",
    [string]$Time = "06:00"
)

$ErrorActionPreference = "Stop"

# Paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$SchedulerScript = Join-Path $ScriptDir "scheduler.ts"
$LogDir = Join-Path $ProjectDir "logs"

# Ensure log directory exists
if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] $Level`: $Message"
    Write-Host $logLine
    
    $logFile = Join-Path $LogDir "scheduler-runner-$(Get-Date -Format 'yyyy-MM-dd').log"
    Add-Content -Path $logFile -Value $logLine
}

function Test-Node {
    try {
        $nodeVersion = node --version 2>$null
        $tsNodeVersion = npx ts-node --version 2>$null
        return $true
    } catch {
        Write-Log "Node.js or ts-node not found. Please install: npm install -g ts-node typescript" "ERROR"
        return $false
    }
}

function Install-Dependencies {
    Write-Log "Checking dependencies..."
    Set-Location $ProjectDir
    
    # Check if node_modules exists
    if (!(Test-Path (Join-Path $ProjectDir "node_modules"))) {
        Write-Log "Installing dependencies..."
        npm install
    }
    
    # Ensure ts-node is available
    $tsNodePath = Join-Path $ProjectDir "node_modules\.bin\ts-node.cmd"
    if (!(Test-Path $tsNodePath)) {
        Write-Log "Installing ts-node..."
        npm install --save-dev ts-node typescript @types/node
    }
}

function Invoke-Scheduler {
    Write-Log "=========================================="
    Write-Log "Starting Probability Analyzer Scheduler"
    Write-Log "=========================================="
    
    Set-Location $ProjectDir
    
    # Load environment variables from .env if exists
    $envFile = Join-Path $ProjectDir ".env"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^([^#][^=]*)=(.*)$') {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                [Environment]::SetEnvironmentVariable($key, $value, "Process")
            }
        }
        Write-Log "Loaded environment from .env"
    }
    
    # Run the scheduler
    try {
        $tsNodePath = Join-Path $ProjectDir "node_modules\.bin\ts-node.cmd"
        if (Test-Path $tsNodePath) {
            & $tsNodePath --esm $SchedulerScript 2>&1 | ForEach-Object {
                Write-Log $_
            }
        } else {
            # Fallback to npx
            npx ts-node --esm $SchedulerScript 2>&1 | ForEach-Object {
                Write-Log $_
            }
        }
        
        $exitCode = $LASTEXITCODE
        if ($exitCode -eq 0) {
            Write-Log "Scheduler completed successfully" "SUCCESS"
        } else {
            Write-Log "Scheduler exited with code $exitCode" "ERROR"
        }
        
        return $exitCode
    } catch {
        Write-Log "Error running scheduler: $_" "ERROR"
        return 1
    }
}

function Install-TaskSchedulerJob {
    Write-Log "Creating Windows Task Scheduler job..."
    
    # Check if running as admin
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (!$currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Log "This script needs to run as Administrator to create scheduled tasks" "ERROR"
        Write-Log "Please run PowerShell as Administrator and try again" "ERROR"
        return $false
    }
    
    # Remove existing task if exists
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Log "Removing existing task: $TaskName"
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }
    
    # Create the action
    $action = New-ScheduledTaskAction `
        -Execute "powershell.exe" `
        -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`" -RunNow"
    
    # Create the trigger
    switch ($Schedule.ToUpper()) {
        "HOURLY" { 
            $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1)
        }
        "EVERY4HOURS" { 
            $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 4)
        }
        default { 
            # Daily at specified time
            $triggerTime = [DateTime]::Parse($Time)
            $trigger = New-ScheduledTaskTrigger -Daily -At $triggerTime
        }
    }
    
    # Create the settings
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RunOnlyIfNetworkAvailable `
        -WakeToRun
    
    # Create the principal (run whether logged in or not)
    $principal = New-ScheduledTaskPrincipal `
        -UserId "SYSTEM" `
        -LogonType ServiceAccount `
        -RunLevel Highest
    
    # Register the task
    try {
        Register-ScheduledTask `
            -TaskName $TaskName `
            -Action $action `
            -Trigger $trigger `
            -Settings $settings `
            -Principal $principal `
            -Description "Probability Analyzer Scheduler - Processes predictions and results daily" `
            -Force
        
        Write-Log "Task '$TaskName' created successfully" "SUCCESS"
        Write-Log "Schedule: $Schedule at $Time"
        
        # Start the task immediately to test
        Start-ScheduledTask -TaskName $TaskName
        Write-Log "Task started for initial test run"
        
        # Wait a moment and check status
        Start-Sleep -Seconds 5
        $task = Get-ScheduledTask -TaskName $TaskName
        Write-Log "Task status: $($task.State)"
        
        return $true
    } catch {
        Write-Log "Failed to create task: $_" "ERROR"
        return $false
    }
}

function Remove-TaskSchedulerJob {
    Write-Log "Removing Windows Task Scheduler job: $TaskName"
    
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Log "Task removed successfully" "SUCCESS"
    } else {
        Write-Log "Task not found: $TaskName"
    }
}

# Main execution
if ($SetupTask) {
    Install-TaskSchedulerJob
} elseif ($RemoveTask) {
    Remove-TaskSchedulerJob
} elseif ($RunNow -or (!$SetupTask -and !$RemoveTask)) {
    # Run the scheduler
    if (!(Test-Node)) {
        exit 1
    }
    
    Install-Dependencies
    $exitCode = Invoke-Scheduler
    exit $exitCode
}
