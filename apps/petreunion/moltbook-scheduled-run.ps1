# Wrapper for the scheduled task: (1) fetch feed, (2) wake Cursor and send "check moltbook".
# All output goes to moltbook-scheduled-run.log so you can see errors if the window flashes and closes.

$scriptDir = $PSScriptRoot
$repoRoot = Split-Path (Split-Path $scriptDir)
$logPath = Join-Path $scriptDir "moltbook-scheduled-run.log"

Start-Transcript -Path $logPath -Append
try {
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Starting scheduled run."
    & "$scriptDir\moltbook-scheduled-check.ps1"
    # Touch trigger file so Cursor rule can see "new feed data" even when focus/keys didn't land
    $triggerFile = Join-Path $scriptDir "MOLTBOOK_TRIGGER.txt"
    Set-Content -Path $triggerFile -Value ("Feed updated " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Trigger file updated. Waking Cursor..."
    & "$scriptDir\moltbook-wake-cursor.ps1" -OpenFolder $repoRoot
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Done."
} catch {
    Write-Host "ERROR: $_"
} finally {
    Stop-Transcript
}
