$ErrorActionPreference = "Stop"

param(
  [string]$TaskName = "PetReunion-PawBoostRendered",
  [string]$Time = "03:15",
  [string]$States = "AL",
  [int]$MaxPets = 200,
  [int]$MaxPages = 5,
  [string]$MatcherUrl = "https://petreunion.org"
)

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$runner = Join-Path $here "Run-PawBoostRendered.ps1"

if (-not (Test-Path $runner)) {
  throw "Missing runner script: $runner"
}

# Build task command. Use -NoProfile to reduce surprises.
$taskCmd = @(
  "`"$env:ProgramFiles\PowerShell\7\pwsh.exe`"",
  "-NoProfile",
  "-ExecutionPolicy Bypass",
  "-File `"$runner`"",
  "-States `"$States`"",
  "-MaxPets $MaxPets",
  "-MaxPages $MaxPages",
  "-MatcherUrl `"$MatcherUrl`""
) -join " "

Write-Host "Creating/Updating scheduled task:"
Write-Host "  Name: $TaskName"
Write-Host "  Time: $Time"
Write-Host "  Cmd:  $taskCmd"

# Create (or replace) the task for the current user
schtasks.exe /Create /TN $TaskName /TR $taskCmd /SC DAILY /ST $Time /F | Out-Host

Write-Host "Installed. To run immediately:"
Write-Host "  schtasks.exe /Run /TN `"$TaskName`""

