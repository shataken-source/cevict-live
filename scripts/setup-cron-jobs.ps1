#!/usr/bin/env powershell
# CEVICT Data Pipeline - Windows Task Scheduler Setup
# Run this as Administrator to create scheduled tasks

param(
    [switch]$Remove,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Task definitions
$tasks = @(
    @{
        Name = "CEVICT-Progno-Daily"
        Description = "Progno: Generate daily predictions at 6:00 AM"
        Command = "powershell.exe"
        Arguments = "-ExecutionPolicy Bypass -Command `"cd C:\cevict-live\apps\progno; npx tsx cron\daily-run.ts`""
        TriggerTime = "06:00"
    },
    @{
        Name = "CEVICT-AlphaHunter-Daily"
        Description = "Alpha-Hunter: Fetch Kalshi markets at 7:00 AM"
        Command = "powershell.exe"
        Arguments = "-ExecutionPolicy Bypass -Command `"cd C:\cevict-live\apps\alpha-hunter; npx tsx cron\daily-run.ts`""
        TriggerTime = "07:00"
    },
    @{
        Name = "CEVICT-Sportsbook-Import"
        Description = "Sportsbook-Terminal: Import picks at 7:30 AM"
        Command = "powershell.exe"
        Arguments = "-ExecutionPolicy Bypass -Command `"cd C:\cevict-live\apps\sportsbook-terminal; npx tsx cron\daily-import.ts`""
        TriggerTime = "07:30"
    },
    @{
        Name = "CEVICT-Sportsbook-CacheRefresh"
        Description = "Sportsbook-Terminal: Refresh cache every 10 minutes"
        Command = "powershell.exe"
        Arguments = "-ExecutionPolicy Bypass -Command `"cd C:\cevict-live\apps\sportsbook-terminal; node -e 'fetch(`"http://localhost:3433/api/import-kalshi-sports`").then(()=>console.log(`"Cache refreshed`"))'`""
        Interval = 10  # minutes
    }
)

function Remove-CEVICTTasks {
    Write-Host "Removing existing CEVICT tasks..." -ForegroundColor Yellow
    foreach ($task in $tasks) {
        $existing = schtasks /query /tn $task.Name 2>&1
        if ($LASTEXITCODE -eq 0) {
            schtasks /delete /tn $task.Name /f | Out-Null
            Write-Host "  Removed: $($task.Name)" -ForegroundColor Gray
        }
    }
    Write-Host "All CEVICT tasks removed." -ForegroundColor Green
}

function Install-CEVICTTasks {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "CEVICT Data Pipeline - Task Scheduler Setup" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan

    # Check if running as admin
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
        Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "Creating scheduled tasks...`n" -ForegroundColor Green

    foreach ($task in $tasks) {
        # Check if task exists
        $existing = schtasks /query /tn $task.Name 2>&1
        if ($LASTEXITCODE -eq 0 -and -not $Force) {
            Write-Host "Task already exists: $($task.Name)" -ForegroundColor Yellow
            Write-Host "  Use -Force to overwrite existing tasks" -ForegroundColor Gray
            continue
        }

        # Remove existing if force
        if ($LASTEXITCODE -eq 0 -and $Force) {
            schtasks /delete /tn $task.Name /f | Out-Null
        }

        Write-Host "Creating task: $($task.Name)" -ForegroundColor Green
        Write-Host "  Description: $($task.Description)" -ForegroundColor Gray

        try {
            if ($task.Interval) {
                # Create interval-based task (every N minutes)
                schtasks /create /tn $task.Name /tr `"$($task.Command) $($task.Arguments)`" /sc minute /mo $task.Interval /ru SYSTEM /f | Out-Null
            } else {
                # Create daily task at specific time
                schtasks /create /tn $task.Name /tr `"$($task.Command) $($task.Arguments)`" /sc daily /st $task.TriggerTime /ru SYSTEM /f | Out-Null
            }
            
            Write-Host "  ✓ Created successfully" -ForegroundColor Green
        }
        catch {
            Write-Host "  ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Setup Complete!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan

    # Show created tasks
    Write-Host "Created tasks:" -ForegroundColor Yellow
    foreach ($task in $tasks) {
        $info = schtasks /query /tn $task.Name /fo LIST /v 2>&1 | Select-String "Task Name|Next Run Time|Status"
        if ($info) {
            Write-Host "  - $($task.Name): $($task.TriggerTime ? "Daily at $($task.TriggerTime)" : "Every $($task.Interval) min")" -ForegroundColor Gray
        }
    }

    Write-Host "`nTo view all tasks, run: schtasks /query /fo TABLE" -ForegroundColor Cyan
    Write-Host "To remove all tasks, run: .\setup-cron-jobs.ps1 -Remove" -ForegroundColor Cyan
}

# Main execution
if ($Remove) {
    Remove-CEVICTTasks
} else {
    Install-CEVICTTasks
}
