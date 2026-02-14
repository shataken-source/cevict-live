# KeyVault GUI Launcher (PowerShell)
# Run this to start the KeyVault Manager in the system tray.

$scriptDir = $PSScriptRoot

# Check if PyQt6 is installed
$hasQt = python -c "import PyQt6" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing PyQt6..."
    pip install -r "$scriptDir\requirements.txt"
}

Start-Process pythonw -ArgumentList "$scriptDir\keyvault_gui.py" -WindowStyle Hidden
Write-Host "KeyVault Manager started in system tray."
