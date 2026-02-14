# Register a Task Scheduler task that runs Cochran AI check (and prompt to start) once or twice per day.
# Run this script once to create the task. Requires running as the user who will see the prompt (not admin required).
# The task runs only when the user is logged on so the "Start it now?" dialog can appear.

$taskName = "CochranAiCheckAndPrompt"
$scriptPath = "C:\cevict-live\scripts\cochran-ai-check-and-prompt.ps1"
$trigger1 = "09:00"   # 9 AM
$trigger2 = "14:00"   # 2 PM

# Ensure script exists
if (-not (Test-Path $scriptPath)) {
  Write-Error "Script not found: $scriptPath"
  exit 1
}

# Task Run: outer quotes for schtasks; backtick-escaped inner quotes around script path
$taskRun = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

# Remove existing tasks if present
foreach ($tn in @($taskName, "CochranAiCheckAndPrompt_2PM")) {
  $null = schtasks /Query /TN $tn /FO LIST 2>$null
  if ($LASTEXITCODE -eq 0) { schtasks /Delete /TN $tn /F | Out-Null }
}

# Create daily task at 9 AM ("Run only when user is logged on" is default)
schtasks /Create /TN $taskName /TR $taskRun /SC DAILY /ST $trigger1 /RI 0 /F | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to create task with first trigger."
  exit 1
}

# Second task for 2 PM
$taskName2 = "CochranAiCheckAndPrompt_2PM"
schtasks /Create /TN $taskName2 /TR $taskRun /SC DAILY /ST $trigger2 /RI 0 /F | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Warning "First task created (9 AM). Failed to create 2 PM task. You can add a second trigger manually in Task Scheduler."
} else {
  Write-Host "Created two scheduled tasks:"
  Write-Host "  - $taskName  (daily at 9:00 AM)"
  Write-Host "  - $taskName2 (daily at 2:00 PM)"
  Write-Host "Each run checks if Cochran AI is running and, if not, asks whether to start it."
  Write-Host "To change times or disable: Task Scheduler -> Task Scheduler Library -> find CochranAiCheck*"
}
