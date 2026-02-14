# Wrapper for the scheduled task: (1) fetch feed, (2) wake Cursor and send "check moltbook".
# All output goes to moltbook-scheduled-run.log so you can see errors if the window flashes and closes.

$scriptDir = $PSScriptRoot
$repoRoot = Split-Path (Split-Path $scriptDir)
$logPath = Join-Path $scriptDir "moltbook-scheduled-run.log"

Start-Transcript -Path $logPath -Append
try {
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Starting scheduled run."
    # Free ports 3010 (moltbook-viewer) and 3006 (petreunion) so next run doesn't hit "Port already in use"
    $cleanupScript = Join-Path $repoRoot "scripts\agent-cleanup-ports.ps1"
    if (Test-Path $cleanupScript) {
        & $cleanupScript
    }
    & "$scriptDir\moltbook-scheduled-check.ps1"
    # Keyword search (lost pet, prediction, Kalshi, shelter, etc.) -> MOLTBOOK_SEARCH_RESULTS.md for "check Moltbook"
    $searchScript = Join-Path $scriptDir "moltbook-search-keywords.ps1"
    if (Test-Path $searchScript) {
        try { & $searchScript } catch { Write-Host "Keyword search failed: $_" }
    }
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
