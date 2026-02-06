# Quick Fix Steps - 171 Positions + $10 Limit

## 🚨 Current Issues

1. **Bot sees 171 positions** (should be 2)
2. **Spending limit is $10** (should be $1,000)

---

## ✅ Solution: Run One SQL Script

**File:** `apps/alpha-hunter/FIX_NOW.sql`

**This script will:**
1. ✅ Diagnose position counts (shows what's in database)
2. ✅ Fix NULL outcomes (sets them to proper status)
3. ✅ Increase spending limit to $1,000
4. ✅ Verify all changes

---

## 📋 Steps

### 1. Run the Fix Script

1. Open **Supabase SQL Editor**
2. Copy entire contents of `apps/alpha-hunter/FIX_NOW.sql`
3. Paste and click **Run**
4. Review the results

### 2. Check Results

**Look for:**
- **Part 1 Results:** Shows outcome counts (how many open, closed, NULL)
- **Part 4 Results:** 
  - Final open positions count (should match what bot sees after restart)
  - Spending limit should show `1000`

### 3. Restart Bot

```bash
npm run kalshi:sandbox
```

**Expected output:**
```
📋 Syncing [correct number] existing open positions from Supabase...
✅ Position sync complete - [correct number] positions tracked
```

**And trades should show:**
```
Spending limit: $1000.00/$1000
```

---

## 🎯 Expected After Fix

**Before:**
- Bot syncs: 171 positions ❌
- Daily limit: $10 ❌
- Trades blocked: 4,890

**After:**
- Bot syncs: Correct number ✅
- Daily limit: $1,000 ✅
- Can place trades ✅

---

## 🔍 If Still Seeing 171

If after running the fix, the bot still sees 171:

1. **Check Part 1 results** - How many actually have `outcome='open'`?
2. **If it's actually 171** - These are legitimate open positions
3. **Options:**
   - Close old positions (use `close_old_positions.sql`)
   - Accept that there are 171 open positions
   - Check if there are duplicates (same market_id multiple times)

---

**Status:** Run `FIX_NOW.sql`, then restart bot! 🔧
