# 💾 Bot Memory System - Supabase Setup Guide

## Why Supabase Memory?

Without persistent memory, your bots "forget" everything after a restart:
- ❌ No long-term learning
- ❌ Can't track historical accuracy
- ❌ Lose pattern recognition
- ❌ No performance analysis

**With Supabase memory:**
- ✅ Bots remember predictions across restarts
- ✅ Track accuracy by category over time
- ✅ Learn from winning/losing patterns
- ✅ Build up expertise from thousands of trades
- ✅ Analytics dashboards and performance tracking

---

## Step 1: Get Your Supabase Credentials

### Option A: Existing Supabase Project (Recommended)

If you already use Supabase for `progno`, reuse those credentials:

```bash
# From progno's .env.local
NEXT_PUBLIC_SUPABASE_URL=https://nqkbqtiramecvmmpaxzk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_key...
```

### Option B: Create New Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Project Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2: Add to .env.local

Add these lines to `apps/alpha-hunter/.env.local`:

```env
# === SUPABASE (MEMORY PERSISTENCE) ===
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key...
```

---

## Step 3: Run the SQL Migration

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `migrations/001_bot_memory_tables.sql`
5. Paste and click **Run**

This creates 5 tables:
- `bot_predictions` - All predictions made by bots
- `trade_history` - Executed trades with outcomes
- `bot_learnings` - Patterns and insights learned
- `bot_metrics` - Aggregated performance by category
- `trading_sessions` - Session-level stats

---

## Step 4: Verify Installation

Run this query in Supabase SQL Editor:

```sql
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('bot_predictions', 'trade_history', 'bot_learnings', 'bot_metrics', 'trading_sessions')
ORDER BY table_name;
```

You should see 5 tables listed.

---

## Step 5: Test the Integration

Start your bot:

```bash
npm run live
```

Look for this line in the logs:

```
💾 Bot Memory System: ENABLED (Supabase connected)
```

If you see:

```
⚠️ Bot Memory System: DISABLED (Supabase not configured)
```

Then check your `.env.local` file for typos.

---

## What Gets Saved Automatically?

### 1. Bot Predictions

Every time a bot analyzes a market:

```typescript
{
  bot_category: "sports",
  market_title: "Will Chiefs win Super Bowl?",
  prediction: "yes",
  probability: 68,
  confidence: 72,
  edge: 5.2,
  reasoning: ["Strong offensive line", "Home field advantage"],
  factors: ["Recent performance", "Injury report"]
}
```

### 2. Trade Records

Every executed trade:

```typescript
{
  platform: "kalshi",
  symbol: "Chiefs Super Bowl",
  entry_price: 62,
  amount: 5.00,
  fees: 0.15,
  bot_category: "sports",
  outcome: "open"
}
```

### 3. Learning Patterns

When bots discover successful patterns:

```typescript
{
  bot_category: "sports",
  pattern_type: "winning_pattern",
  pattern_description: "Home team favorites in playoffs win 68% of time",
  success_rate: 68,
  times_observed: 24
}
```

### 4. Performance Metrics

Updated after each prediction:

```typescript
{
  bot_category: "sports",
  total_predictions: 147,
  correct_predictions: 98,
  accuracy: 66.7,
  total_pnl: +$243.50,
  avg_edge: 4.8
}
```

---

## Viewing Your Data

### Quick Analytics Queries

**1. Bot Performance Leaderboard:**

```sql
SELECT
  bot_category,
  total_predictions,
  accuracy,
  total_pnl
FROM bot_metrics
WHERE total_predictions > 10
ORDER BY accuracy DESC;
```

**2. Recent Winning Trades:**

```sql
SELECT
  platform,
  symbol,
  pnl,
  bot_category,
  opened_at
FROM trade_history
WHERE outcome = 'win'
ORDER BY opened_at DESC
LIMIT 20;
```

**3. Top Patterns by Success Rate:**

```sql
SELECT
  bot_category,
  pattern_description,
  success_rate,
  times_observed
FROM bot_learnings
WHERE times_observed >= 5
ORDER BY success_rate DESC
LIMIT 20;
```

**4. Category Performance Summary:**

```sql
SELECT * FROM bot_performance_summary
ORDER BY accuracy DESC;
```

---

## Advanced Features

### 1. Load Historical Patterns

Bots automatically load their previous learnings on startup:

```typescript
const patterns = await botMemory.loadPatterns('sports');
// Returns: ["Home favorites win 68%", "Underdogs cover 52%", ...]
```

### 2. Check Historical Performance

Before making a bet, check how the bot performed on similar markets:

```typescript
const perf = await botMemory.getHistoricalPerformance(
  'sports',
  ['chiefs', 'playoffs']
);
// Returns: { accuracy: 72, avgEdge: 4.5, totalPredictions: 28 }
```

### 3. Update Outcomes

When markets resolve, update the predictions:

```sql
-- Mark a prediction as won
UPDATE bot_predictions
SET actual_outcome = 'win', pnl = 4.50
WHERE market_id = 'CHIEFS-SB-2025';

-- Mark a trade as won
UPDATE trade_history
SET outcome = 'win', exit_price = 95, pnl = 4.50, closed_at = NOW()
WHERE market_id = 'CHIEFS-SB-2025';
```

---

## Performance Impact

### Memory Usage

- 0.5KB per prediction
- 0.3KB per trade
- 1KB per pattern

**1000 predictions = ~0.5MB**

### Speed

- Saves happen asynchronously (non-blocking)
- No impact on trading performance
- Supabase has 99.9% uptime

### Costs

**Free tier:**
- 500MB database
- 2GB bandwidth
- 50K rows

**Estimated usage:**
- 1000 predictions/day = ~100 rows/day
- **Free tier lasts ~1.3 years**

---

## Troubleshooting

### "Supabase not configured"

Check your `.env.local`:
```bash
# Make sure both are set:
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### "Permission denied"

Make sure you're using the **service_role** key, not the **anon** key:
- ✅ `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (service_role - long)
- ❌ `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (anon - short)

### Tables don't exist

Run the migration again:
```bash
# In Supabase SQL Editor, run:
database/migrations/001_bot_memory_tables.sql
```

---

## Next Steps

1. ✅ Add Supabase credentials
2. ✅ Run SQL migration
3. ✅ Restart your bot
4. ✅ Watch predictions get saved
5. 📊 Build analytics dashboards
6. 🧠 Let bots learn from history
7. 📈 Track long-term performance

---

## Benefits Over Time

**Week 1:**
- Basic tracking working
- 100-500 predictions saved

**Month 1:**
- Patterns emerging
- Accuracy tracking reliable
- ~3,000 predictions

**Month 3:**
- Strong pattern recognition
- Bot categories show specialization
- 10,000+ predictions
- Clear edge identification

**Month 6:**
- Deep learning from history
- Highly specialized bots
- 20,000+ predictions
- Strong competitive advantage

---

**Your bots now have long-term memory! 🧠💾**

