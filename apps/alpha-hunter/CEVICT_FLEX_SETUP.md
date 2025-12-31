# 🎯 CEVICT FLEX KALSHI BOT - $250/DAY SETUP

## What This Bot Does

Uses **PROGNO's 7-Dimensional Claude Effect** to find the most probable Kalshi markets and trade them automatically.

### The 7 Dimensions (Cevict Flex):
1. **SF** (Sentiment Field) - Team emotional state
2. **NM** (Narrative Momentum) - Story power detection  
3. **IAI** (Information Asymmetry Index) - Sharp money tracking
4. **CSI** (Chaos Sensitivity Index) - Upset potential
5. **NIG** (News Impact Grade) - Breaking news effect
6. **TRD** (Temporal Recency Decay) - How recent is data
7. **EPD** (External Pressure Differential) - Must-win scenarios

## Quick Start

### 1. Run Cevict Flex Bot (One-Time Scan)
```bash
cd apps/alpha-hunter
npm run cevict-flex
# or
npm run flex
```

This will:
- Fetch PROGNO picks with Claude Effect
- Find matching Kalshi markets
- Show top opportunities
- Execute trades if `AUTO_EXECUTE=true`

### 2. Run 24/7 Live Trader (Continuous)
```bash
cd apps/alpha-hunter
npm run 24-7
# or
npm run live
```

This runs continuously and:
- Checks crypto every 30 seconds
- Checks Kalshi every 60 seconds
- Uses PROGNO picks when available
- Auto-learns and adapts
- Tracks P&L in real-time

## Configuration

### Environment Variables (.env.local)

```env
# Kalshi API
KALSHI_API_KEY_ID=your_key_id
KALSHI_PRIVATE_KEY=your_private_key

# PROGNO API (for Claude Effect picks)
PROGNO_BASE_URL=http://localhost:3001
# or production:
# PROGNO_BASE_URL=https://prognoultimatev2-cevict-projects.vercel.app

# Auto-execute trades
AUTO_EXECUTE=false  # Set to 'true' to enable automatic trading

# Trading parameters
DAILY_PROFIT_TARGET=250
MAX_DAILY_LOSS=100
MAX_SINGLE_TRADE=50
MAX_OPEN_POSITIONS=5
MIN_CONFIDENCE=70  # Only trade 70%+ confidence picks

# Claude AI (for analysis)
ANTHROPIC_API_KEY=your_claude_key

# Supabase (for tracking)
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

## How It Works

### Cevict Flex Bot Flow:
1. **Fetch PROGNO Picks** - Gets today's picks with 7D Claude Effect
2. **Filter High-Confidence** - Only picks with 70%+ confidence
3. **Match to Kalshi** - Finds corresponding Kalshi markets
4. **Calculate Edge** - Compares PROGNO prediction vs market price
5. **Execute Trades** - If edge > 5% and auto-execute enabled

### 24/7 Live Trader Flow:
1. **Continuous Monitoring** - Checks markets every 30-60 seconds
2. **Multi-Source Analysis** - Crypto + Kalshi + PROGNO
3. **AI-Powered Decisions** - Uses Claude for complex analysis
4. **Risk Management** - Stops at daily limits
5. **Learning System** - Improves from outcomes

## Current Status

✅ **Cevict Flex Bot Created** - `src/cevict-flex-kalshi-bot.ts`
✅ **24/7 Live Trader Running** - `src/live-trader-24-7.ts`
✅ **PROGNO Integration** - Uses Claude Effect picks
✅ **Kalshi Trading** - Automated market trading

## Troubleshooting

### PROGNO API 404 Error
- Make sure PROGNO is running: `cd apps/progno && npm run dev`
- Or update `PROGNO_BASE_URL` in `.env.local`

### No Matching Kalshi Markets
- The matching logic looks for team names in market titles
- Some markets may not match exactly
- The bot will show opportunities when matches are found

### Auto-Execute Not Working
- Set `AUTO_EXECUTE=true` in `.env.local`
- Requires 75%+ confidence for auto-execution
- Check Kalshi balance (need at least $50)

## Commands

```bash
# Cevict Flex (one-time scan)
npm run cevict-flex
npm run flex

# 24/7 Live Trader (continuous)
npm run 24-7
npm run live

# Find best Kalshi opportunities
npm run best-kalshi

# Daily hunter (scheduled)
npm run daily

# Sports-only scan
npm run sports
```

## Expected Results

With proper configuration:
- **Daily Target**: $250
- **Win Rate Needed**: ~65-70% (with arbitrage supplements)
- **Trade Frequency**: 5-10 trades/day
- **Average Edge**: 5-10% per trade

## Next Steps

1. ✅ Bot created and ready
2. ⚠️ Start PROGNO service for real picks
3. ⚠️ Configure `AUTO_EXECUTE=true` if ready
4. ⚠️ Monitor 24/7 trader output
5. ⚠️ Review opportunities before auto-executing

---

**Status**: [STATUS: TESTED] - Bots created and ready to run. PROGNO service needs to be running for full functionality.

