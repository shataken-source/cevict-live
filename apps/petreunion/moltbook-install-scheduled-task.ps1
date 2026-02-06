# Install a Windows Task Scheduler job that runs moltbook-scheduled-check.ps1 every 6 hours.
# Run this script ONCE (e.g. from an elevated PowerShell or as your user). The task runs
# even when you're not logged in if "Run whether user is logged on or not" is set; we use
# "Run only when user is logged on" so .env.local is available and the file is written to your repo.

$scriptDir = $PSScriptRoot
$runScript = Join-Path $scriptDir "moltbook-scheduled-run.ps1"
$taskName = "MoltbookScheduledCheck"
$description = "Fetches Moltbook feed, then wakes Cursor and sends 'check moltbook' so the Agent runs."

if (-not (Test-Path $runScript)) { Write-Error "Not found: $runScript"; exit 1 }

# Run wrapper (check + wake)
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval ([TimeSpan]::FromHours(6)) -RepetitionDuration ([TimeSpan]::FromDays(365))
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -NoProfile -File `"$runScript`"" -WorkingDirectory $scriptDir
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Register (overwrites if task already exists)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description $description -Force | Out-Null

Write-Host "Installed scheduled task: $taskName"
Write-Host "  Runs: every 6 hours (first run in ~1 minute)"
Write-Host "  1. moltbook-scheduled-check.ps1  -> MOLTBOOK_CHECK_LATEST.md"
Write-Host "  2. moltbook-wake-cursor.ps1      -> focus Cursor, Ctrl+I, 'check moltbook', Enter"
Write-Host "  If Cursor not running: starts Cursor with $repoRoot"
Write-Host ""
Write-Host "Keystrokes go to the active window — schedule for when you're not typing elsewhere."
Write-Host "To remove: Unregister-ScheduledTask -TaskName $taskName"
