# CEVICT Data Pipeline - Cron Jobs Quick Reference

## Manual Execution Commands

Run these commands when you need to manually trigger the data pipeline:

### 1. PROGNO - Generate Predictions
```powershell
cd C:\cevict-live\apps\progno
npm run simulate
```
**Output:** Creates `predictions-YYYY-MM-DD.json` in archive folder

### 2. PROGNOSTICATION - Already Running
Ensure server is running on port 3005:
```powershell
cd C:\cevict-live\apps\prognostication
npm run dev
```

### 3. ALPHA-HUNTER - Fetch Kalshi Markets
```powershell
cd C:\cevict-live\apps\alpha-hunter
npm run live
```
**Note:** Runs continuously. Let it run for 5-10 minutes, then Ctrl+C to stop.

### 4. SPORTSBOOK-TERMINAL - Import Picks
```powershell
cd C:\cevict-live\apps\sportsbook-terminal
node cron\daily-import.ts
```
**Output:** Imports picks to Supabase kalshi_bets table

---

## Using the New Cron Jobs

### Option 1: Run Individual Cron Scripts

```powershell
# Progno daily predictions
cd C:\cevict-live\apps\progno
npx tsx cron\daily-run.ts

# Alpha-hunter Kalshi fetch
cd C:\cevict-live\apps\alpha-hunter
npx tsx cron\daily-run.ts

# Sportsbook-terminal import
cd C:\cevict-live\apps\sportsbook-terminal
npx tsx cron\daily-import.ts
```

### Option 2: Set up Windows Task Scheduler

Run the setup script as Administrator:
```powershell
cd C:\cevict-live\scripts
powershell -ExecutionPolicy Bypass -File setup-cron-jobs.ps1
```

This creates scheduled tasks that run automatically:
- **06:00 AM** - Progno generates predictions
- **07:00 AM** - Alpha-hunter fetches Kalshi markets
- **07:30 AM** - Sportsbook-terminal imports all picks

### Option 3: Use npm Scripts

Add these to each app's `package.json`:

**apps/progno/package.json:**
```json
"scripts": {
  "cron:daily": "tsx cron/daily-run.ts"
}
```

**apps/alpha-hunter/package.json:**
```json
"scripts": {
  "cron:daily": "tsx cron/daily-run.ts"
}
```

**apps/sportsbook-terminal/package.json:**
```json
"scripts": {
  "cron:daily": "tsx cron/daily-import.ts"
}
```

Then run:
```bash
npm run cron:daily
```

---

## Monitoring

### Check Logs

All cron jobs log to:
```
C:\cevict-archive\{app-name}\logs\cron-YYYY-MM-DD.log
```

View today's logs:
```powershell
Get-Content C:\cevict-archive\progno\logs\cron-$(Get-Date -Format "yyyy-MM-dd").log
Get-Content C:\cevict-archive\alpha-hunter\logs\cron-$(Get-Date -Format "yyyy-MM-dd").log
Get-Content C:\cevict-archive\sportsbook-terminal\logs\cron-$(Get-Date -Format "yyyy-MM-dd").log
```

### Verify Data Flow

Check Supabase tables:
```sql
-- Check kalshi_bets
SELECT COUNT(*) FROM kalshi_bets WHERE status = 'open';

-- Check bot_predictions (from alpha-hunter)
SELECT COUNT(*) FROM bot_predictions WHERE platform = 'kalshi' AND actual_outcome IS NULL;

-- Check syndicated_picks (from progno)
SELECT COUNT(*) FROM syndicated_picks WHERE status = 'active';
```

---

## Troubleshooting

### If Progno fails to generate predictions:
```powershell
cd C:\cevict-live\apps\progno
# Check API keys
node scripts\check-api-status.ts
# Try manual run
npm run simulate
```

### If Alpha-hunter can't fetch Kalshi markets:
```powershell
cd C:\cevict-live\apps\alpha-hunter
# Check Kalshi setup
npm run setup-kalshi
# Debug the key
npm run debug-key
```

### If Sportsbook-terminal can't import:
```powershell
# Check if prognostication API is running
curl http://localhost:3005/api/health
# Check if picks are available
curl http://localhost:3005/api/kalshi/picks
```

---

## Data Flow Timeline

```
06:00 - Progno generates predictions (takes ~2-5 min)
06:05 - Predictions archived to C:\cevict-archive\Probabilityanalyzer\predictions\
06:15 - Prognostication processes predictions (automatic if server running)
07:00 - Alpha-hunter fetches Kalshi markets (takes ~5 min)
07:05 - Alpha-hunter saves to bot_predictions table
07:06 - Alpha-hunter syncs to Prognostication API
07:30 - Sportsbook-terminal imports all picks (takes ~2 min)
07:32 - Cache file updated at data\kalshi-picks.json
07:35 - All picks available in frontend
```

---

## Files Created

| File | Purpose |
|------|---------|
| `CRON_SCHEDULE.md` | Master schedule documentation |
| `apps/progno/cron/daily-run.ts` | Progno daily predictions cron |
| `apps/alpha-hunter/cron/daily-run.ts` | Alpha-hunter Kalshi fetch cron |
| `apps/sportsbook-terminal/cron/daily-import.ts` | Sportsbook import cron |
| `scripts/setup-cron-jobs.ps1` | Windows Task Scheduler setup |
| `CRON_QUICK_REFERENCE.md` | This quick reference file |

---

Last Updated: 2026-02-19
