# Agent port cleanup: free 3010 (moltbook-viewer) and 3006 (petreunion dev)
# Run this at the start of the 6-hour cycle (e.g. in moltbook-scheduled-run.ps1) so the next run doesn't hit "Port already in use".
# Does NOT kill Cursor or all Node processes—only processes bound to these ports.

param(
    [int[]]$Ports = @(3010, 3006),
    [switch]$WhatIf
)

$ErrorActionPreference = "Continue"

foreach ($port in $Ports) {
    try {
        $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn) {
            $owningPid = $conn.OwningProcess
            $proc = Get-Process -Id $owningPid -ErrorAction SilentlyContinue
            $name = if ($proc) { $proc.ProcessName } else { "PID $owningPid" }
            if ($WhatIf) {
                Write-Host "[WhatIf] Would kill $name (PID $owningPid) on port $port"
            } else {
                Stop-Process -Id $owningPid -Force -ErrorAction SilentlyContinue
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Freed port $port (killed $name PID $owningPid)"
            }
        }
    } catch {
        Write-Host "Port $port : $_"
    }
}
