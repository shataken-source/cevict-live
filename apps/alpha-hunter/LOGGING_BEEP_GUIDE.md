# Logging & Beep Notifications Guide

## 🔔 Features

Your crypto trainer now includes:
- **Trade logging** - All trades written to file with timestamps
- **Beep notifications** - Computer beeps when trades execute
- **Configurable** - Enable/disable via `.env.local`

## ⚙️ Configuration

Edit `.env.local`:

```env
# Enable/disable beep notifications
BEEP_ON_TRADE=true

# Enable/disable trade logging
LOG_TRADES=true

# Log file location (relative to project root)
LOG_FILE=trades.log
```

## 🔊 Beep Patterns

**Trade Executed (Buy/Sell):**
- 2 quick beeps (800Hz, 200ms each)
- Indicates a new position opened

**Trade Closed - WIN:**
- 3 quick beeps (800Hz, 100ms apart)
- Indicates profitable trade closed

**Trade Closed - LOSS:**
- 1 longer low beep (400Hz, 300ms)
- Indicates losing trade closed

**Error:**
- 5 rapid beeps (800Hz, 100ms apart)
- Indicates system error

## 📝 Log File Format

**Location:** `C:\cevict-live\apps\alpha-hunter\trades.log`

**Entry Types:**

```
[2026-02-23T06:25:00.000Z] TRADE EXECUTED: BUY 0.00007692 BTC-USDC @ $65000.00 | Total: $5.00 | Confidence: 85% | Reason: Strong upward momentum

[2026-02-23T06:30:00.000Z] TRADE CLOSED: BTC-USDC | Entry: $65000.00 → Exit: $65195.00 | P&L: ✅ $0.15 (0.30%) | Duration: 5m

[2026-02-23T06:35:00.000Z] CYCLE: Balance: $328.97 | Open: 0 | Session P&L: $0.15 | Total Trades: 1

[2026-02-23T06:40:00.000Z] ERROR: Coinbase API timeout
```

## 📊 Viewing Logs

**Real-time monitoring:**
```powershell
# Watch log file in real-time
Get-Content trades.log -Wait -Tail 20
```

**View recent trades:**
```powershell
# Last 50 lines
Get-Content trades.log -Tail 50

# Search for wins
Select-String -Path trades.log -Pattern "WIN"

# Search for specific pair
Select-String -Path trades.log -Pattern "BTC-USDC"
```

**Filter by date:**
```powershell
# Today's trades
Get-Content trades.log | Select-String "2026-02-23"
```

## 🎯 What Gets Logged

**Every Trade Execution:**
- Action (BUY/SELL)
- Pair (BTC-USDC, ETH-USDC, SOL-USDC)
- Amount
- Price
- Total USD value
- Confidence score
- AI reasoning

**Every Trade Close:**
- Entry and exit prices
- Profit/loss (dollar and percent)
- Duration (how long position was held)
- Win/loss indicator

**Every Cycle:**
- Current USDC balance
- Number of open trades
- Session P&L
- Total trades executed

**Errors:**
- API failures
- Network issues
- Trading errors

## 🔧 Troubleshooting

**No beeps?**
- Check `BEEP_ON_TRADE=true` in `.env.local`
- Ensure volume is not muted
- PowerShell beep requires system speaker enabled

**No log file?**
- Check `LOG_TRADES=true` in `.env.local`
- Verify write permissions in project directory
- Check `LOG_FILE` path is correct

**Log file too large?**
```powershell
# Archive old logs
Move-Item trades.log trades-backup-$(Get-Date -Format 'yyyy-MM-dd').log

# Or clear it
Clear-Content trades.log
```

## 💡 Tips

1. **Keep logs for analysis** - Review patterns to improve strategy
2. **Monitor in separate window** - Use `Get-Content -Wait` while bot runs
3. **Archive weekly** - Prevent log file from growing too large
4. **Disable beeps at night** - Set `BEEP_ON_TRADE=false` if running 24/7
5. **Check logs after errors** - Helps diagnose issues

## 📈 Log Analysis Examples

**Calculate win rate:**
```powershell
$wins = (Select-String -Path trades.log -Pattern "WIN").Count
$losses = (Select-String -Path trades.log -Pattern "LOSS").Count
$winRate = ($wins / ($wins + $losses)) * 100
Write-Host "Win Rate: $winRate%"
```

**Total profit:**
```powershell
# Extract all P&L values and sum them
$trades = Select-String -Path trades.log -Pattern "P&L: [✅❌] \$([0-9.]+)"
# Manual calculation needed - log format makes this easy to read
```

**Most traded pair:**
```powershell
$btc = (Select-String -Path trades.log -Pattern "BTC-USDC").Count
$eth = (Select-String -Path trades.log -Pattern "ETH-USDC").Count
$sol = (Select-String -Path trades.log -Pattern "SOL-USDC").Count
Write-Host "BTC: $btc | ETH: $eth | SOL: $sol"
```

## 🚀 Current Setup

Your bot is configured with:
- ✅ Logging enabled
- ✅ Beeps enabled
- 📁 Log file: `trades.log`
- 🔄 Runs every 5 minutes via scheduled task
- 🤖 Uses local AI (Ollama)
- 💰 Max $5 per trade
- 🎯 Min 70% confidence

The bot will beep and log every time it trades!
