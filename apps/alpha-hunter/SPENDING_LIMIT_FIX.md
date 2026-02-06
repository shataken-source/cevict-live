# Fix: Kalshi Bot Not Picking Up $1000 Daily Limit

## 🔍 Problem

The database shows `daily_spending_limit = 1000` in `bot_strategy_params`, but the bot is still using $10.

## 🎯 Root Cause

The bot uses this logic:
```typescript
const dailyLimit = params?.daily_spending_limit ?? config.trading.dailySpendingLimit;
```

It reads from `bot_strategy_params` first, then falls back to `bot_config`. If:
1. The `bot_category` doesn't match what's in the database
2. The query fails silently
3. The bot hasn't restarted to reload config

Then it will use the old fallback value from `bot_config`.

## ✅ Solution

### Step 1: Run the Fix SQL

**Run this in Supabase SQL Editor:**
```sql
-- File: apps/alpha-hunter/FIX_SPENDING_LIMIT_NOW.sql
```

This will:
- ✅ Update `bot_config` to $1000 (fallback)
- ✅ Update ALL `bot_strategy_params` to $1000 (primary)
- ✅ Create missing strategy params for all categories
- ✅ Show verification results

### Step 2: Restart the Bot

**The bot needs to restart to:**
- Reload config from database
- Clear any cached values
- Start using the new $1000 limit

**To restart:**
1. Stop the current bot process (Ctrl+C)
2. Restart: `npm run kalshi:sandbox`

### Step 3: Verify It's Working

**After restart, you should see:**
```
💰 Daily limit for [category]: $1000 (from strategy_params)
```

**Or if it's using fallback:**
```
💰 Daily limit for [category]: $1000 (from bot_config)
```

**If you still see $10:**
- Check the debug output to see which source it's using
- Run `DEBUG_SPENDING_LIMIT.sql` to verify database values
- Make sure the bot_category matches what's in the database

---

## 🐛 Debug: Check What Bot Sees

**Run this to see what the bot should be reading:**
```sql
-- File: apps/alpha-hunter/DEBUG_SPENDING_LIMIT.sql
```

This shows:
- What's in `bot_config` (fallback)
- What's in `bot_strategy_params` (primary)
- What the final limit will be for each category

---

## 📋 Expected Behavior After Fix

**Before:**
- Daily limit: $10
- Trades blocked: "Spending limit: $10.00/$10"

**After:**
- Daily limit: $1,000
- Trades can execute up to $1,000/day
- Bot will show: "Daily limit for [category]: $1000"

---

## ⚠️ Important Notes

1. **Both sources must be updated** - The bot checks `bot_strategy_params` first, but falls back to `bot_config` if the query fails or returns null.

2. **Bot must restart** - The bot loads config on startup. If it's already running, it won't see the new values until restart.

3. **Category matching** - The `bot_category` from predictions must match what's in `bot_strategy_params`. Common categories: `crypto`, `politics`, `economics`, `weather`, `entertainment`, `sports`, `world`, `unknown`.

4. **Daily reset** - The spending counter resets at midnight automatically, or when the bot restarts (if same day).

---

**Status:** Run `FIX_SPENDING_LIMIT_NOW.sql` and restart the bot! 🚀
