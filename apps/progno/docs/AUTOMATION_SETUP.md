# 🤖 Progno Automation Setup

## ✅ What's Been Created

### 1. **All Leagues Automation**
- ✅ **NEW:** API endpoint: `/api/admin/thursday` - Complete weekly cycle (recommended)
- ✅ **NEW:** Script: `cron-thursday.ts` - Thursday complete cycle (recommended)
- ✅ API endpoint: `/api/admin/all-leagues` - Runs analysis for all leagues (legacy)
- ✅ API endpoint: `/api/admin/tuesday` - Updates scores for all leagues (legacy)
- ✅ Script: `cron-all-leagues-friday.ts` - Friday automation for all leagues (legacy)
- ✅ Script: `cron-tuesday.ts` - Tuesday automation for all leagues (legacy)

### 2. **Existing Cron Jobs**
- ✅ `cron-friday.ts` - Friday job (NFL only)
- ✅ `cron-monday.ts` - Monday job (NFL only)
- ✅ API endpoints: `/api/admin/friday` and `/api/admin/monday`

### 3. **Commands to Add**
Commands that should be added to your command storage:
- Start Progno dev server
- Run Friday analysis (all leagues)
- Run Tuesday score updates (all leagues)
- Run weekly analysis script

## 🚀 How to Use

### ⭐ RECOMMENDED: Thursday Complete Cycle (New!)

**One script does everything:**
1. Updates final scores from previous week
2. Learns from completed games
3. Loads odds and makes picks for week ahead

**Via API:**
```bash
curl -X POST http://localhost:3008/api/admin/thursday
```

**Via Script:**
```bash
cd apps/progno
ODDS_API_KEY=your_key pnpm dlx tsx app/scripts/cron-thursday.ts
```

### Option 1: API Endpoints (Legacy - Still Available)

**Friday - Analyze All Leagues:**
```bash
curl -X POST http://localhost:3008/api/admin/all-leagues
```

**Tuesday - Update All Leagues Scores:**
```bash
curl -X POST http://localhost:3008/api/admin/tuesday
```

**Thursday - Complete Cycle (Recommended):**
```bash
curl -X POST http://localhost:3008/api/admin/thursday
```

### Option 2: Scripts (Command Line)

**Thursday - Complete Cycle (Recommended):**
```bash
cd apps/progno
ODDS_API_KEY=your_key pnpm dlx tsx app/scripts/cron-thursday.ts
```

**Friday - All Leagues (Legacy):**
```bash
cd apps/progno
ODDS_API_KEY=your_key pnpm dlx tsx app/scripts/cron-all-leagues-friday.ts
```

**Tuesday - All Leagues (Legacy):**
```bash
cd apps/progno
ODDS_API_KEY=your_key pnpm dlx tsx app/scripts/cron-tuesday.ts
```

### Option 3: UI Buttons
- Use the "🚀 Load All Leagues Odds" button in Weekly Analysis
- Use the "📊 Update All Leagues Scores (Tue)" button

## 📋 Commands to Store

Add these to your command storage:

1. **Start Progno:**
   ```
   cd apps/progno && pnpm dev
   ```

2. **Run Friday Analysis (All Leagues):**
   ```
   cd apps/progno && ODDS_API_KEY=your_key pnpm dlx tsx app/scripts/cron-all-leagues-friday.ts
   ```

3. **Run Tuesday Updates (All Leagues):**
   ```
   cd apps/progno && ODDS_API_KEY=your_key pnpm dlx tsx app/scripts/cron-tuesday.ts
   ```

4. **Run Friday Analysis via API:**
   ```
   curl -X POST http://localhost:3008/api/admin/all-leagues
   ```

5. **Run Tuesday Updates via API:**
   ```
   curl -X POST http://localhost:3008/api/admin/tuesday
   ```

## 🤖 Bot Automation Setup

To set up automated cron jobs, you can:

1. **Use Vercel Cron Jobs** (if deployed):
   - Add to `vercel.json`:
   ```json
   {
     "crons": [
       {
         "path": "/api/admin/thursday",
         "schedule": "0 12 * * 4"
       }
     ]
   }
   ```

   **Or use separate Friday/Tuesday (legacy):**
   ```json
   {
     "crons": [
       {
         "path": "/api/admin/all-leagues",
         "schedule": "0 12 * * 5"
       },
       {
         "path": "/api/admin/tuesday",
         "schedule": "0 12 * * 2"
       }
     ]
   }
   ```

2. **Use Windows Task Scheduler** (local):
   - Create tasks to run the scripts on Friday and Tuesday

3. **Use GitHub Actions** (CI/CD):
   - Create workflows that run on schedule

## 📊 What Gets Saved

**Thursday (Complete Cycle):**
- `results-all-leagues-{date}.json` - Score updates and learning metrics (Phase 1)
- `odds-{league}-{date}.json` - Odds for each league (Phase 2)
- `picks-{league}-{date}.json` - Picks for each league (Phase 2)
- `odds-all-leagues-{date}.json` - Combined odds (Phase 2)
- `picks-all-leagues-{date}.json` - Combined picks (Phase 2)

**Friday (Legacy):**
- `odds-{league}-{date}.json` - Odds for each league
- `picks-{league}-{date}.json` - Picks for each league
- `odds-all-leagues-{date}.json` - Combined odds
- `picks-all-leagues-{date}.json` - Combined picks

**Tuesday (Legacy):**
- `results-all-leagues-{date}.json` - Score updates and metrics

---

**Ready to automate!** The bots are set up - just need to schedule them!

