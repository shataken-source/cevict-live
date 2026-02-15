# DevOps Agent Launcher (PowerShell)
$scriptDir = $PSScriptRoot

$hasQt = python -c "import PyQt6" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing PyQt6..."
    pip install -r "$scriptDir\requirements.txt"
}

Start-Process pythonw -ArgumentList "$scriptDir\devops_agent.py" -WindowStyle Hidden
Write-Host "DevOps Agent started in system tray."
