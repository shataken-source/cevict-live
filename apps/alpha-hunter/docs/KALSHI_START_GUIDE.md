# 🎯 Complete Guide: Starting Kalshi Trader

## Prerequisites Checklist

Before starting, ensure you have:
- ✅ Kalshi account (demo or production)
- ✅ Kalshi API credentials (API Key ID + Private Key)
- ✅ Anthropic API key (for AI analysis)
- ✅ Supabase credentials (for data persistence)
- ✅ Node.js and pnpm installed

---

## Step 1: Navigate to Alpha Hunter Directory

```bash
cd C:\cevict-live\apps\alpha-hunter
```

---

## Step 2: Install Dependencies (if not already done)

```bash
pnpm install
```

---

## Step 3: Configure Environment Variables

### Create/Edit `.env.local` file:

```bash
# Windows PowerShell
notepad .env.local

# Or use your preferred editor
code .env.local
```

### Required Kalshi Configuration:

```env
# === KALSHI PREDICTION MARKETS ===
KALSHI_API_KEY_ID=your_api_key_id_here
KALSHI_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----
KALSHI_ENV=demo  # Use 'demo' for testing, 'production' for live trading

# === REQUIRED FOR AI ANALYSIS ===
ANTHROPIC_API_KEY=sk-ant-your-key-here

# === REQUIRED FOR DATA PERSISTENCE ===
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ-your-service-role-key-here

# === OPTIONAL: PROGNO INTEGRATION ===
PROGNO_BASE_URL=https://prognoultimatev2-cevict-projects.vercel.app
BOT_API_KEY=your-bot-api-key

# === RISK MANAGEMENT ===
DAILY_PROFIT_TARGET=250
MAX_DAILY_LOSS=100
MAX_SINGLE_TRADE=10
MAX_OPEN_POSITIONS=5
MIN_CONFIDENCE=70
MIN_EXPECTED_VALUE=8

# === EXECUTION SETTINGS ===
AUTO_EXECUTE=false  # Set to 'true' for autonomous trading
```

**Important Notes:**
- For `KALSHI_PRIVATE_KEY`: The key should include `\n` for newlines (the code will convert them)
- For demo mode: Set `KALSHI_ENV=demo` (no real money)
- **Production trading is intentionally blocked** in this repo. Do NOT set `KALSHI_ENV=production`.

---

## Step 4: Initialize Fund Manager (Optional but Recommended)

Set up initial Kalshi balance in the fund manager:

```bash
# This will be done automatically when you start, but you can manually set it
# The fund manager will sync with your actual Kalshi balance
```

---

## Step 5: Test Kalshi Connection

```bash
# Run the test suite to verify everything is configured
pnpm run test
```

Look for:
- ✅ Kalshi: Connected
- ✅ AI Brain: Claude connected
- ✅ PROGNO: Connected

---

## Step 6: Start Kalshi Trader

### Option A: Start Kalshi Trainer (Recommended)

```bash
pnpm run kalshi
```

This will:
- Initialize the Kalshi trader
- Connect to Kalshi API
- Start scanning for opportunities every 5 minutes
- Execute trades based on AI analysis
- Run continuously until you press Ctrl+C

### Option B: Start with Unified Trader (Kalshi + Crypto)

```bash
pnpm run unified
```

This runs both Kalshi and Crypto trading together.

### Option C: Start Daily Hunter (Full System)

```bash
pnpm run daily
```

This runs the complete Alpha Hunter system including Kalshi.

---

## Step 7: Monitor Performance

### View Performance Report

```bash
# In a new terminal window
cd C:\cevict-live\apps\alpha-hunter
pnpm run report
```

### Check Status

```bash
pnpm start status
```

---

## Complete Command Sequence (Copy & Paste)

```bash
# 1. Navigate to directory
cd C:\cevict-live\apps\alpha-hunter

# 2. Install dependencies (if needed)
pnpm install

# 3. Verify .env.local exists and has Kalshi credentials
# (Edit manually if needed)

# 4. Test connection
pnpm run test

# 5. Start Kalshi trader
pnpm run kalshi
```

---

## What Happens When You Start

1. **Initialization:**
   - Connects to Kalshi API
   - Checks balance
   - Connects to Claude AI
   - Connects to PROGNO (if configured)

2. **Trading Loop (every 5 minutes):**
   - Scans Kalshi markets for opportunities
   - Analyzes with AI (Claude)
   - Checks PROGNO data for sports insights
   - Calculates expected value and edge
   - Places bets if confidence ≥ 70% and edge ≥ 8%
   - Tracks positions and P&L

3. **Safety Features:**
   - Respects max bet size ($10 default)
   - Limits concurrent positions (5 max)
   - Checks daily loss limits
   - Validates fund allocation

---

## Troubleshooting

### "Kalshi not configured, using simulated balance"
- Check that `KALSHI_API_KEY_ID` and `KALSHI_PRIVATE_KEY` are set in `.env.local`
- Verify the private key format (should include `\n` for newlines)

### "AI Brain: ⚠️ No AI"
- Set `ANTHROPIC_API_KEY` in `.env.local`

### "PROGNO: Offline"
- This is optional - Kalshi will work without PROGNO
- To enable: Set `PROGNO_BASE_URL` and `BOT_API_KEY`

### Connection Errors
- Verify `KALSHI_ENV` is set correctly (`demo` or `production`)
- Check your internet connection
- Verify API credentials are correct

---

## Stopping the Trader

Press `Ctrl+C` in the terminal where Kalshi is running.

The trader will:
- Finish current cycle
- Show final statistics
- Close gracefully

---

## Quick Reference Commands

```bash
# Start Kalshi
pnpm run kalshi

# View report
pnpm run report

# Check status
pnpm start status

# Run tests
pnpm run test

# Start unified (Kalshi + Crypto)
pnpm run unified

# Start daily hunter (full system)
pnpm run daily
```

---

## Environment Variables Quick Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `KALSHI_API_KEY_ID` | ✅ Yes | Your Kalshi API key ID |
| `KALSHI_PRIVATE_KEY` | ✅ Yes | Your Kalshi private key (with `\n`) |
| `KALSHI_ENV` | ✅ Yes | `demo` or `production` |
| `ANTHROPIC_API_KEY` | ✅ Yes | Claude API key for AI |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Supabase service role key |
| `PROGNO_BASE_URL` | ⚪ Optional | PROGNO API URL |
| `AUTO_EXECUTE` | ⚪ Optional | `true` for auto-trading |
| `MAX_SINGLE_TRADE` | ⚪ Optional | Max bet size (default: 10) |
| `MIN_CONFIDENCE` | ⚪ Optional | Min confidence % (default: 70) |

---

**Ready to start? Run: `pnpm run kalshi`** 🚀

