# Windows Service Setup - 24/7 Bot

This guide will help you install the Alpha-Hunter bot as a Windows service that runs 24/7, auto-restarts on failure, and continues running even when your laptop is closed.

## Quick Start

1. **Open PowerShell as Administrator**
   - Right-click PowerShell
   - Select "Run as Administrator"

2. **Navigate to the bot directory**
   ```powershell
   cd C:\cevict-live\apps\alpha-hunter
   ```

3. **Run the installer**
   ```powershell
   .\install-windows-service.ps1
   ```

4. **Done!** The bot is now running as a Windows service.

## What This Does

✅ **Installs NSSM** (Non-Sucking Service Manager) if not already installed  
✅ **Creates Windows Service** named "AlphaHunter247"  
✅ **Auto-starts on boot** - Bot starts automatically when Windows starts  
✅ **Auto-restarts on failure** - If the bot crashes, it restarts automatically  
✅ **Runs in background** - No terminal window needed  
✅ **Runs when laptop closed** - Service continues even when lid is closed  
✅ **Logs everything** - All output saved to `logs/service-output.log`

## Service Management

### Check Status
```powershell
Get-Service -Name AlphaHunter247
```

### Start Service
```powershell
Start-Service -Name AlphaHunter247
```

### Stop Service
```powershell
Stop-Service -Name AlphaHunter247
```

### View Logs
```powershell
# View output log
Get-Content logs\service-output.log -Tail 50

# View error log
Get-Content logs\service-error.log -Tail 50
```

### Restart Service
```powershell
Restart-Service -Name AlphaHunter247
```

## Uninstall

To remove the service:

```powershell
# Run as Administrator
.\uninstall-windows-service.ps1
```

Or manually:
```powershell
Stop-Service -Name AlphaHunter247
& "$env:ProgramFiles\nssm\nssm.exe" remove AlphaHunter247 confirm
```

## Troubleshooting

### Service Won't Start

1. **Check logs:**
   ```powershell
   Get-Content logs\service-error.log
   ```

2. **Verify .env.local exists:**
   ```powershell
   Test-Path C:\cevict-live\.env.local
   ```

3. **Check Node.js is in PATH:**
   ```powershell
   node --version
   npm --version
   ```

### Service Keeps Restarting

If the service restarts repeatedly, check the error log:
```powershell
Get-Content logs\service-error.log
```

Common issues:
- Missing API keys in `.env.local`
- Node.js modules not installed (run `npm install`)
- Port conflicts

### Laptop Still Goes to Sleep

The service will pause if Windows goes to sleep. To prevent sleep:

1. **Power Settings:**
   - Open "Power & Sleep Settings"
   - Set "When plugged in, PC goes to sleep" to **Never**
   - Set "When plugged in, turn off screen" to your preference

2. **Or use this command:**
   ```powershell
   powercfg /change standby-timeout-ac 0
   ```

## Manual Service Configuration

If you need to modify the service settings:

```powershell
$nssm = "$env:ProgramFiles\nssm\nssm.exe"

# Edit service settings
& $nssm edit AlphaHunter247

# Or set specific options:
& $nssm set AlphaHunter247 AppRestartDelay 10000
& $nssm set AlphaHunter247 AppExit Default Restart
```

## Notes

- The service runs as **LocalSystem** (highest privileges)
- Logs are rotated automatically by NSSM
- The bot will use the `.env.local` file from `C:\cevict-live\.env.local`
- Make sure your laptop is **plugged in** or has sufficient battery for 24/7 operation

