# URGENT: Fix Position Sync Issue

## 🚨 Problem

**After restart, bot still sees 171 positions:**
```
📋 Syncing 171 existing open positions from Supabase...
✅ Position sync complete - 171 positions tracked
```

**But database query shows only 2 open positions!**

---

## 🔍 Root Cause

The `getOpenTradeRecords()` function queries:
```typescript
.eq('platform', 'kalshi')
.eq('outcome', 'open')
```

**Possible issues:**
1. **NULL outcomes** - Positions with `outcome IS NULL` might be included
2. **Different Supabase project** - Bot might be connected to different database
3. **Stale data** - Database might have old records that need cleanup

---

## ✅ Solution: Clean Up NULL Outcomes

**Run this SQL to fix:**

```sql
-- Set NULL outcomes to proper status
UPDATE trade_history
SET outcome = 'closed'
WHERE platform = 'kalshi'
  AND outcome IS NULL
  AND closed_at IS NOT NULL;

UPDATE trade_history
SET outcome = 'open'
WHERE platform = 'kalshi'
  AND outcome IS NULL
  AND closed_at IS NULL;
```

**Or use:** `apps/alpha-hunter/fix_position_sync.sql`

---

## 📋 Steps

1. **Run fix_position_sync.sql** in Supabase
   - This will set NULL outcomes to proper status
   - Verify count matches (should be 2)

2. **Restart bot again**
   - Bot will re-sync
   - Should see only 2 positions now

3. **Verify**
   - Check bot output: Should say "Syncing 2 positions"
   - Bot can now place trades

---

## 🎯 Expected After Fix

**Before:**
- Bot syncs: 171 positions ❌
- Trades blocked: 4,890

**After:**
- Bot syncs: 2 positions ✅
- Can place new trades ✅
- Daily limit: $1,000 ✅

---

**Status:** Run the SQL fix, then restart bot! 🔧
