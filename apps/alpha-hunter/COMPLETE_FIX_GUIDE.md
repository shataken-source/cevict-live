# Complete Fix Guide - 171 Positions Issue

## 🚨 Current Status

**Bot reports:** 171 open positions  
**Database query shows:** 2 open positions  
**Spending limit:** Still $10 (not updated)

---

## 🔍 Step 1: Diagnose the Issue

**Run this SQL FIRST to see what's actually in the database:**

```sql
-- See all outcome counts
SELECT 
  COALESCE(outcome::text, 'NULL') as outcome_status,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi'
GROUP BY outcome
ORDER BY count DESC;
```

**This will tell us:**
- How many records have `outcome = 'open'`
- How many have `outcome IS NULL`
- How many have other values

**File:** `apps/alpha-hunter/DIAGNOSE_171_POSITIONS.sql`

---

## ✅ Step 2: Fix Based on Diagnosis

### If there are NULL outcomes:

```sql
-- Fix NULL outcomes
UPDATE trade_history
SET outcome = 'closed', updated_at = NOW()
WHERE platform = 'kalshi' AND outcome IS NULL AND closed_at IS NOT NULL;

UPDATE trade_history
SET outcome = 'open', updated_at = NOW()
WHERE platform = 'kalshi' AND outcome IS NULL AND closed_at IS NULL;
```

### If there are 171 records with outcome='open':

**This means there are actually 171 open positions in the database!**

**Options:**
1. **Close old positions** - Run `close_old_positions.sql` to close positions older than 7 days
2. **Verify they're real** - Check if these are legitimate open positions
3. **Check for duplicates** - See if same market_id appears multiple times

---

## ✅ Step 3: Increase Spending Limit

**Run this SQL (if not done yet):**

```sql
-- Update main config
UPDATE bot_config
SET config_value = jsonb_set(config_value, '{dailySpendingLimit}', '1000')
WHERE config_key = 'trading';

-- Update all strategy params
UPDATE bot_strategy_params
SET daily_spending_limit = 1000, updated_at = NOW()
WHERE platform = 'kalshi';
```

**File:** `apps/alpha-hunter/increase_training_limits.sql`

---

## ✅ Step 4: Restart Bot

After fixing the database:

1. **Stop the bot** (Ctrl+C)
2. **Restart:** `npm run kalshi:sandbox`
3. **Verify:** Bot should sync correct number of positions

---

## 🎯 Expected Results

**After fix:**
- Bot syncs: **Correct number** (2 or actual count)
- Daily limit: **$1,000** ✅
- Can place new trades ✅

---

## 📋 Quick Checklist

- [ ] Run `DIAGNOSE_171_POSITIONS.sql` to see actual counts
- [ ] Fix NULL outcomes (if found)
- [ ] Run `increase_training_limits.sql` (if not done)
- [ ] Restart bot
- [ ] Verify bot shows correct position count

---

**Status:** Run diagnosis first, then apply appropriate fix! 🔧
