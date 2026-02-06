# Complete Fix: Kalshi Bot Spending Limits

## 🔍 The Problem

The bot has **TWO** spending limits:

1. **Daily Limit** - Should be $1000 (currently showing $50)
2. **Per-Window Limit** - $10 per 5 minutes (hardcoded, causing "$10.00/$10" blocks)

## ✅ The Fix

### Step 1: Run SQL Fix

**Run this in Supabase:**
```sql
-- File: apps/alpha-hunter/VERIFY_AND_FIX_COMPLETE.sql
```

This will:
- ✅ Check current state
- ✅ Force update `bot_config` to $1000
- ✅ Update ALL `bot_strategy_params` to $1000
- ✅ Create missing "derivatives" category
- ✅ Show verification results

### Step 2: Code Fix (Already Done)

I've updated `apps/alpha-hunter/src/services/trade-safety.ts`:
- Changed `MAX_SPEND_PER_WINDOW` from `$10` to `$200`
- This allows $200 per 5-minute window (enough for $1000/day)

### Step 3: Restart Bot

**After running the SQL:**
1. Stop the bot (Ctrl+C)
2. Restart: `npm run kalshi:sandbox`

## 📋 Expected Results

**After restart, you should see:**
```
💰 Daily limit for world: $1000 (params: 1000, config: 1000, using: strategy_params)
💰 Daily limit for derivatives: $1000 (params: 1000, config: 1000, using: strategy_params)
```

**Trades should now:**
- ✅ Use $1000 daily limit (not $50)
- ✅ Allow $200 per 5-minute window (not $10)
- ✅ Place trades successfully

## ⚠️ Important Notes

1. **Both limits must be fixed:**
   - Daily limit: Fixed via SQL (database)
   - Per-window limit: Fixed in code (already done)

2. **Bot must restart** to pick up:
   - New database values
   - New code changes

3. **If you still see $50:**
   - The SQL didn't run or didn't work
   - Check the verification queries in the SQL file
   - Make sure `bot_config` shows `1000`, not `50`

---

**Status:** 
- ✅ Code fix done (MAX_SPEND_PER_WINDOW = $200)
- ⏳ SQL fix needs to be run
- ⏳ Bot needs restart after SQL
