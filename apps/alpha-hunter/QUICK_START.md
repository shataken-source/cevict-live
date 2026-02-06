# Alpha-Hunter Kalshi Sandbox - Quick Start

**Status:** Code complete, needs Supabase setup + demo API keys

---

## ✅ What's Already Done

- ✅ Sandbox autopilot (`kalshi-sandbox-autopilot.ts`) - fully implemented
- ✅ Safety gates (demo-only, production blocked)
- ✅ Settlement worker (processes resolved trades)
- ✅ Learning updater (adjusts strategy based on wins/losses)
- ✅ Auth handling (gracefully degrades to analysis-only if keys missing)
- ✅ Supabase integration (predictions, trades, learning)

---

## 🚀 Quick Start (3 Steps)

### Step 1: Run Supabase Migrations

The bot needs these tables in Supabase:

```sql
-- Run both migration files in your Supabase SQL editor:
-- 1. database/migrations/001_bot_memory_tables.sql
-- 2. database/migrations/002_bot_config_and_strategy_params.sql
```

**Or use Supabase CLI:**
```powershell
cd C:\cevict-live\apps\alpha-hunter
# If you have supabase CLI installed:
supabase db push
```

**Tables created:**
- `bot_predictions` - AI predictions for markets
- `trade_history` - All trades (open/closed)
- `bot_learnings` - Learning data per category
- `bot_metrics` - Performance metrics
- `bot_config` - Trading configuration (defaults seeded)
- `bot_strategy_params` - Adaptive strategy per category

---

### Step 2: Get Kalshi Demo API Keys

1. **Sign up for Kalshi demo account:** https://demo.kalshi.com
2. **Create API keypair:**
   - Go to API settings in demo account
   - Generate new keypair
   - Download private key (`.pem` or `.txt` file)
3. **Save keys:**
   - Option A: Update `apps/alpha-hunter/.env.local`:
     ```
     KALSHI_ENV=demo
     KALSHI_API_KEY_ID=your-demo-key-id-here
     KALSHI_PRIVATE_KEY_PATH=C:\Cevict_Vault\kalshi-demo-key.pem
     ```
   - Option B: Use vault JSON (see `src/lib/secret-store.ts`)

**⚠️ Important:**
- Must be **demo** keys (not production)
- Private key file must exist and be readable
- If file has `.crdownload` extension, rename it first

---

### Step 3: Run the Bot

```powershell
cd C:\cevict-live\apps\alpha-hunter
npm run kalshi:sandbox
```

**What it does:**
- Connects to Kalshi demo API
- Fetches markets and creates predictions
- Places demo orders (if auth OK)
- Settles trades every 2 minutes
- Updates learning every 5 minutes
- Runs continuously

**If auth fails:**
- Bot continues in "analysis-only" mode
- Logs predictions but doesn't place orders
- Retries auth every 2 minutes
- Check logs for specific error messages

---

## 🔍 Troubleshooting

### "KALSHI_ENV=production" Error
**Fix:** Set `KALSHI_ENV=demo` in `apps/alpha-hunter/.env.local` (not repo root)

### "authentication_error NOT_FOUND"
**Causes:**
- Using production keys in demo environment
- Key ID doesn't match private key
- Private key file not found or corrupted

**Fix:**
1. Verify you're using **demo** keys
2. Check `KALSHI_PRIVATE_KEY_PATH` points to correct file
3. Ensure file exists and is readable
4. Try `npm run debug-key` to test key loading

### "Missing Supabase tables"
**Fix:** Run migrations (Step 1 above)

### Bot runs but no trades placed
**Check:**
- Auth status in logs (should see "✅ Kalshi demo auth OK")
- Predictions exist in Supabase (`bot_predictions` table)
- Strategy params allow trades (min confidence, min edge thresholds)
- Daily spending limit not exceeded

---

## 📊 Monitoring

**Check Supabase tables:**
- `bot_predictions` - See what the bot is predicting
- `trade_history` - See all trades (filter `outcome='open'` for active)
- `bot_metrics` - Performance metrics per category
- `bot_strategy_params` - Current strategy settings (adaptive)

**Logs:**
- Console output shows:
  - Auth status
  - Trades placed
  - Settlement results
  - Learning updates

---

## 🎯 What Happens Next

Once running:
1. **Bot seeds predictions** from Kalshi markets (if none exist)
2. **Bot places demo orders** based on predictions with high confidence/edge
3. **Settlement worker** checks for resolved trades every 2 minutes
4. **Learning updater** adjusts strategy every 5 minutes based on:
   - Win rate per category
   - PnL per category
   - Updates `bot_strategy_params` within bounds

**Goal:** Bot learns which categories/markets are profitable and adjusts strategy automatically.

---

## 🔒 Safety

- ✅ **Production trading blocked** - `execution-gate.ts` enforces demo-only
- ✅ **Demo environment enforced** - Refuses `KALSHI_ENV=production`
- ✅ **Analysis-only mode** - Continues running even if auth fails (no trades)
- ✅ **Daily limits** - Configurable spending/loss limits

---

## 📝 Configuration

Edit Supabase `bot_config` table or use defaults:
- `maxTradeSize`: $5 per trade
- `minConfidence`: 55%
- `minEdge`: 2%
- `dailySpendingLimit`: $50/day
- `kalshiInterval`: 60 seconds between cycles

Or update `bot_strategy_params` per category for adaptive thresholds.

---

## 🆘 Need Help?

- Check `database/SETUP_SUPABASE_MEMORY.md` for Supabase setup details
- Check `src/intelligence/kalshi-trader.ts` for API integration
- Check `src/services/kalshi/execution-gate.ts` for safety mechanisms
- Run `npm run debug-key` to test key loading

---

**Ready to go?** Run Step 1 (migrations) → Step 2 (keys) → Step 3 (run) 🚀
