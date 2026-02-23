# Crypto Trainer - Automated Scheduling

## 🎯 Choose Your Setup

### Option 1: Windows Scheduled Task (Recommended)
**Best for:** Running on a schedule (hourly, daily, etc.)

```powershell
# Run as Administrator
cd C:\cevict-live\apps\alpha-hunter

# Setup - choose schedule:
.\setup-cron.ps1 -Schedule hourly      # Every hour
.\setup-cron.ps1 -Schedule daily       # Once per day at 9 AM
.\setup-cron.ps1 -Schedule continuous  # Every 5 minutes
.\setup-cron.ps1 -Schedule startup     # At system startup

# Manage
.\setup-cron.ps1 -Status      # Check status
.\setup-cron.ps1 -Uninstall   # Remove task
```

### Option 2: Windows Service (Advanced)
**Best for:** 24/7 continuous operation with auto-restart

```powershell
# Run as Administrator
cd C:\cevict-live\apps\alpha-hunter

# Install
.\install-crypto-service.ps1

# Manage
.\install-crypto-service.ps1 -Start
.\install-crypto-service.ps1 -Stop
.\install-crypto-service.ps1 -Restart
.\install-crypto-service.ps1 -Status
.\install-crypto-service.ps1 -Uninstall
```

### Option 3: Manual (Current)
**Best for:** Testing and development

```bash
npm run train
```

## 📊 Comparison

| Feature | Scheduled Task | Windows Service | Manual |
|---------|---------------|-----------------|--------|
| Ease of Setup | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Auto-start on boot | ✅ | ✅ | ❌ |
| Auto-restart on crash | ❌ | ✅ | ❌ |
| Resource usage | Low | Medium | Low |
| Runs continuously | Optional | Yes | No |
| Easy to monitor | ✅ | ⚠️ | ✅ |

## 🎮 Recommended Setup

**For most users:**
```powershell
# Run every hour (safe, predictable)
.\setup-cron.ps1 -Schedule hourly
```

**For active trading:**
```powershell
# Run continuously (every 5 min)
.\setup-cron.ps1 -Schedule continuous
```

**For 24/7 operation:**
```powershell
# Install as service (always running)
.\install-crypto-service.ps1
```

## 📝 Logs

**Scheduled Task logs:**
- Event Viewer → Task Scheduler logs
- Or: `Get-ScheduledTask -TaskName "AlphaHunter-CryptoTrainer" | Get-ScheduledTaskInfo`

**Service logs:**
- Event Viewer → Windows Logs → Application
- Look for "AlphaHunterCrypto" source

**Manual logs:**
- Console output in terminal

## ⚙️ Current Configuration

Your bot is configured with:
- USDC Balance: $328.97
- Max Trade: $5
- Min Confidence: 70%
- Local AI: Ollama (llama3.2:3b)
- Auto-conversion: DISABLED

## 🚀 Quick Start

```powershell
# 1. Open PowerShell as Administrator
# 2. Navigate to alpha-hunter
cd C:\cevict-live\apps\alpha-hunter

# 3. Setup hourly schedule
.\setup-cron.ps1 -Schedule hourly

# 4. Check it's working
.\setup-cron.ps1 -Status

# Done! Bot will run every hour automatically
```

## 🛑 Stopping the Bot

**Scheduled Task:**
```powershell
.\setup-cron.ps1 -Uninstall
```

**Service:**
```powershell
.\install-crypto-service.ps1 -Stop
# or permanently remove:
.\install-crypto-service.ps1 -Uninstall
```

**Manual:**
```
Ctrl+C in terminal
```

## 💡 Tips

1. **Start with hourly** - Test for a day before going continuous
2. **Monitor first week** - Check logs daily to ensure it's working
3. **Set profit targets** - Bot will stop when daily target hit ($15 currently)
4. **Keep Ollama running** - Make sure Ollama service is always running for AI analysis
5. **Check USDC balance** - Ensure you have enough for trades

## 🔧 Troubleshooting

**Task not running?**
- Check Task Scheduler: `taskschd.msc`
- Verify admin permissions
- Check network connectivity

**Service not starting?**
- Check Event Viewer logs
- Verify Node.js and tsx are in PATH
- Run manually first to test

**No trades executing?**
- Confidence too low (need >70%)
- Market conditions neutral
- This is normal - bot is conservative!
