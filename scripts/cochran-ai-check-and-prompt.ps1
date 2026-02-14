# Cochran AI: check if running; if not, ask user whether to start it.
# Use with Task Scheduler (run once or twice per day, "Run only when user is logged on" so the prompt appears).
# Requires: Cochran AI app at apps/local-agent (or set $CochranAiRoot).

$ErrorActionPreference = 'Stop'
$port = if ($env:LOCAL_AGENT_PORT) { $env:LOCAL_AGENT_PORT } else { '3847' }
$base = "http://localhost:$port"
$CochranAiRoot = if ($env:COCHRAN_AI_ROOT) { $env:COCHRAN_AI_ROOT } else { "C:\cevict-live\apps\local-agent" }

function Test-CochranAiRunning {
  try {
    $null = Invoke-RestMethod -Uri "$base/health" -TimeoutSec 3 -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

function Start-CochranAi {
  $scriptDir = Join-Path $CochranAiRoot "."
  $distPath = Join-Path $scriptDir "dist\index.js"
  if (-not (Test-Path $distPath)) {
    [System.Windows.Forms.MessageBox]::Show(
      "Cochran AI not built. Run: cd $CochranAiRoot; pnpm build",
      "Cochran AI",
      [System.Windows.Forms.MessageBoxButtons]::OK
    )
    return
  }
  $env:LOCAL_AGENT_DATA = if ($env:LOCAL_AGENT_DATA) { $env:LOCAL_AGENT_DATA } else { "C:\Cevict_Vault\local-agent" }
  Start-Process -FilePath "node" -ArgumentList "dist/index.js" -WorkingDirectory $CochranAiRoot -WindowStyle Hidden
  Start-Sleep -Seconds 2
  if (Test-CochranAiRunning) {
    [System.Windows.Forms.MessageBox]::Show("Cochran AI is now running on port $port.", "Cochran AI", [System.Windows.Forms.MessageBoxButtons]::OK)
  } else {
    [System.Windows.Forms.MessageBox]::Show("Cochran AI may still be starting. If it doesn't respond, run start-agent.ps1 from apps/local-agent.", "Cochran AI", [System.Windows.Forms.MessageBoxButtons]::OK)
  }
}

# Load Windows Forms for message box (needed when run by Task Scheduler)
Add-Type -AssemblyName System.Windows.Forms

if (Test-CochranAiRunning) {
  # Optional: uncomment next line to confirm it's running when the task fires
  # [System.Windows.Forms.MessageBox]::Show("Cochran AI is already running.", "Cochran AI", [System.Windows.Forms.MessageBoxButtons]::OK)
  exit 0
}

$result = [System.Windows.Forms.MessageBox]::Show(
  "Cochran AI isn't running. Start it now?",
  "Cochran AI",
  [System.Windows.Forms.MessageBoxButtons]::YesNo,
  [System.Windows.Forms.MessageBoxIcon]::Question
)

if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
  Start-CochranAi
}

exit 0
