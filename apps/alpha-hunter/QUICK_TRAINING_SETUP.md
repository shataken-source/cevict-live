# Quick Training Setup - Kalshi Sandbox

## 🚀 Three Steps to Increase Training Limits

### Step 1: Increase Daily Spending Limit to $1,000

**Run this SQL in Supabase:**

```sql
-- Update main config
UPDATE bot_config
SET config_value = jsonb_set(config_value, '{dailySpendingLimit}', '1000')
WHERE config_key = 'trading';

-- Update all strategy params
UPDATE bot_strategy_params
SET daily_spending_limit = 1000, updated_at = NOW()
WHERE platform = 'kalshi';

-- Create defaults if missing
INSERT INTO bot_strategy_params (platform, bot_category, daily_spending_limit, min_confidence, min_edge, max_trade_usd)
VALUES
  ('kalshi', 'crypto', 1000, 55, 2, 10),
  ('kalshi', 'politics', 1000, 55, 2, 10),
  ('kalshi', 'economics', 1000, 55, 2, 10),
  ('kalshi', 'weather', 1000, 55, 2, 10),
  ('kalshi', 'entertainment', 1000, 55, 2, 10),
  ('kalshi', 'sports', 1000, 55, 2, 10),
  ('kalshi', 'world', 1000, 55, 2, 10),
  ('kalshi', 'unknown', 1000, 55, 2, 10)
ON CONFLICT (platform, bot_category) DO UPDATE
SET daily_spending_limit = 1000, updated_at = NOW();
```

**Or use the file:** `apps/alpha-hunter/increase_training_limits.sql`

---

### Step 2: Review Old Positions (Optional)

**Run this to see what's blocking new trades:**

```sql
-- View all open positions
SELECT 
  market_id,
  symbol as market_title,
  bot_category,
  opened_at,
  EXTRACT(EPOCH FROM (NOW() - opened_at))/24/3600 as days_open
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open'
ORDER BY opened_at ASC
LIMIT 20;
```

**Or use the file:** `apps/alpha-hunter/review_old_positions.sql`

---

### Step 3: Restart Bot (or wait for next cycle)

The bot will automatically:
- ✅ Load new $1,000 limit from database
- ✅ Reset daily spending at midnight (or restart resets in-memory counter)
- ✅ Start placing trades with new higher limit

---

## 📊 Expected Results

**Before:**
- Daily limit: $10
- Trades blocked: 4,890
- Trades placed: 0

**After:**
- Daily limit: **$1,000** 🚀
- Much more room for trades
- Bot can learn with real trade execution
- ~100-200 trades possible per day

---

## ✅ Verification

After running SQL, verify with:

```sql
SELECT config_value->>'dailySpendingLimit' FROM bot_config WHERE config_key = 'trading';
-- Should show: 1000

SELECT bot_category, daily_spending_limit FROM bot_strategy_params WHERE platform = 'kalshi';
-- All should show: 1000
```

---

**Ready to train!** 🎓💰
