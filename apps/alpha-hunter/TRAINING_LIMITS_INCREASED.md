# Kalshi Training Limits Increased

**Date:** January 20, 2026  
**Action:** Increased daily spending limits for training session

---

## ✅ Changes Made

### 1. Daily Spending Limit: $10 → **$1,000**

**Updated:**
- Main trading config: `dailySpendingLimit = 1000`
- All Kalshi strategy params: `daily_spending_limit = 1000`
- All categories (crypto, politics, economics, weather, entertainment, sports, world, unknown)

**Impact:**
- Bot can now place up to $1,000 in trades per day
- Much more room for learning and training
- Will allow many more trades to execute

---

## 📋 How to Apply

### Option 1: Run SQL in Supabase (Recommended)

1. Go to: **Supabase Dashboard → SQL Editor**
2. Open: `apps/alpha-hunter/increase_training_limits.sql`
3. Copy and paste the SQL
4. Click **Run**
5. Verify the changes with the SELECT queries at the end

### Option 2: Restart Bot (Auto-loads new config)

The bot will automatically load the new config from Supabase on next cycle or restart.

---

## 🔄 Daily Spending Reset

**Automatic Reset:**
- Daily spending counter resets automatically at midnight
- No manual action needed
- Bot tracks this with `dayKey` variable

**Current Status:**
- If spending limit was hit, it will reset at midnight
- Or restart the bot to reset the in-memory counter (if same day)

---

## 📊 Review Old Positions

**File:** `apps/alpha-hunter/review_old_positions.sql`

This script helps you:
1. View all 171 open positions
2. Find positions open >7 days
3. Count positions by category
4. Optionally close old positions to free correlation slots

**To run:**
1. Open in Supabase SQL Editor
2. Run the SELECT queries to review
3. Optionally uncomment the UPDATE to close old positions

---

## 🎯 Expected Behavior After Changes

### Before:
- Daily limit: $10
- Trades blocked: 4,890
- Trades placed: 0

### After:
- Daily limit: $1,000
- Much more room for trades
- Bot can place ~100-200 trades per day (depending on trade size)
- More learning data
- Better training session

---

## ⚠️ Important Notes

1. **Sandbox Mode Only** - This is safe, it's demo money
2. **Training Purpose** - Increased for learning over next few days
3. **Auto-Reset** - Daily counter resets at midnight automatically
4. **Position Limits** - Still respects max open positions and other safety checks
5. **Correlation Checks** - Still active (prevents duplicate positions)

---

## 🚀 Next Steps

1. ✅ Run the SQL to increase limits
2. ✅ Review old positions (optional)
3. ✅ Restart bot or wait for next cycle
4. ✅ Monitor new trades being placed
5. ✅ Watch learning improve over next few days

---

**Status:** Ready to train! Bot will now have $1,000/day to learn with! 🎓💰
