<#
.SYNOPSIS
Triggers the Progno daily-results cron endpoint.

.DESCRIPTION
Grades yesterday's predictions and writes results-YYYY-MM-DD.json.
Designed for Task Scheduler. Silent on success, verbose on failure.

.PARAMETER Date
Optional. Date to grade (YYYY-MM-DD). Default: yesterday.
Example: .\Run-DailyResults.ps1 -Date "2026-02-04"

.EXAMPLE
.\Run-DailyResults.ps1
.\Run-DailyResults.ps1 -Date "2026-02-04"
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$Date
)

$ErrorActionPreference = "Stop"

# --- CONFIG ---
$BaseUrl = "http://localhost:3008"
$LogPath = "$PSScriptRoot\daily-results.log"
# --------------

function Write-Log {
    param([string]$Message)
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    Add-Content -Path $LogPath -Value "[$timestamp] $Message"
}

$Url = "$BaseUrl/api/cron/daily-results"
if ($Date) { $Url += "?date=$Date" }

$headers = @{}
if ($env:CRON_SECRET) {
    $headers["Authorization"] = "Bearer $env:CRON_SECRET"
}

try {
    $response = Invoke-RestMethod -Method GET -Uri $Url -Headers $headers -TimeoutSec 60
    Write-Log "SUCCESS: daily-results executed. $($response.message)"
    if ($response.summary) {
        $s = $response.summary
        Write-Log "  Graded: $($s.graded) | Correct: $($s.correct) | Pending: $($s.pending) | WinRate: $($s.winRate)%"
    }
}
catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    if ($_.ErrorDetails) {
        Write-Log "DETAILS: $($_.ErrorDetails.Message)"
    }
}
