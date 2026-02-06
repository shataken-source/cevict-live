# Sync Bot with Database

## 🔍 Problem Identified

**Database Reality:**
- ✅ 2 open positions (value: 1, momentum: 1)
- ✅ Total trades: 5 (2 won, 1 closed, 2 open)

**Bot's In-Memory State:**
- ❌ Thinks there are 171 open positions
- ❌ Stale data from previous session
- ❌ Out of sync with database

---

## ✅ Solution: Restart Bot

**The bot syncs positions on startup:**
- `syncExistingPositions()` function runs on startup
- Loads all open positions from database
- Updates in-memory tracking maps
- Resets cooldowns and correlation tracking

**After restart:**
- Bot will see only 2 open positions (matches database)
- Can place new trades (correlation slots freed)
- Daily spending limit will be $1,000 (after SQL update)

---

## 📋 Steps to Fix

### 1. ✅ Increase Spending Limit (Already Done)
- Run: `apps/alpha-hunter/increase_training_limits.sql`
- Sets limit to $1,000

### 2. ✅ Restart Bot
- Stop the current bot process
- Restart it
- Bot will sync with database on startup
- Will see only 2 positions instead of 171

### 3. (Optional) Close the 2 Positions
- If they're old or you want to free correlation slots
- Run: `apps/alpha-hunter/close_old_positions.sql`
- Uncomment the UPDATE to close them

---

## 🎯 Expected After Restart

**Before Restart:**
- Bot thinks: 171 open positions
- Trades blocked: 4,890
- Daily limit: $10 (or $1,000 after SQL)

**After Restart:**
- Bot sees: 2 open positions ✅
- Can place new trades ✅
- Daily limit: $1,000 ✅
- Correlation slots: Mostly free ✅

---

## 🚀 Quick Fix Command

**To restart the bot:**
1. Find the running process
2. Stop it (Ctrl+C or kill process)
3. Restart: `npm run sandbox` or your start command
4. Bot will sync on startup

---

**Status:** Database is correct (2 positions). Bot just needs restart to sync! 🔄
