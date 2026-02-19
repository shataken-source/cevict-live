# Probability Analyzer Scheduler

Automated task scheduler for processing sports betting predictions and graded results.

## Overview

This scheduler automatically:
1. Processes prediction JSON files
2. Processes graded results JSON files  
3. Saves data to Supabase
4. Archives processed files to `C:\cevict-archive\Probabilityanalyzer`

## Files Created

- `scripts/scheduler.ts` - Main scheduler logic (TypeScript)
- `scripts/run-scheduler.ps1` - PowerShell runner for Windows Task Scheduler
- `database/scheduler-tables.sql` - Database schema for predictions/results

## Setup Instructions

### 1. Install Dependencies

```bash
cd c:\cevict-live\apps\sportsbook-terminal
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Or use these alternate variable names (scheduler checks both)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Create Database Tables

Run the SQL file in your Supabase SQL Editor:

```sql
-- Copy contents of database/scheduler-tables.sql
-- This creates:
-- - daily_predictions table
-- - graded_results table  
-- - scheduler_runs log table
-- - Performance views
```

### 4. Setup Windows Task Scheduler

**Option A: Automatic Setup (Run as Administrator)**

```powershell
# Open PowerShell as Administrator
cd c:\cevict-live\apps\sportsbook-terminal\scripts
.\run-scheduler.ps1 -SetupTask
```

This creates a daily task that runs at 6:00 AM.

**Option B: Manual Setup via Task Scheduler GUI**

1. Open Task Scheduler (taskschd.msc)
2. Click "Create Task"
3. **General Tab:**
   - Name: `ProbabilityAnalyzer-Scheduler`
   - Run whether user is logged on or not
   - Run with highest privileges
4. **Triggers Tab:**
   - New → Daily → Start at 6:00:00 AM
5. **Actions Tab:**
   - New → Start a program
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -WindowStyle Hidden -File "c:\cevict-live\apps\sportsbook-terminal\scripts\run-scheduler.ps1" -RunNow`
6. **Conditions Tab:**
   - Uncheck "Start the task only if the computer is on AC power"
7. **Settings Tab:**
   - Allow task to be run on demand
   - Run task as soon as possible after a scheduled start is missed

### 5. Test the Scheduler

```powershell
# Run manually to test
cd c:\cevict-live\apps\sportsbook-terminal\scripts
.\run-scheduler.ps1 -RunNow
```

## File Processing

### Input Directories

- **Predictions:** `public/predictions*.json`
- **Results:** `data/results/results*.json`

### Output/Archive

Processed files are moved to:
- `C:\cevict-archive\Probabilityanalyzer\predictions\`
- `C:\cevict-archive\Probabilityanalyzer\results\`

### Log Files

Logs are saved to:
- `logs/scheduler-YYYY-MM-DD.log`
- `logs/scheduler-runner-YYYY-MM-DD.log`

## Database Schema

### daily_predictions

| Column | Type | Description |
|--------|------|-------------|
| game_id | text | Unique game identifier |
| sport | text | Sport (NBA, NFL, etc) |
| pick_type | text | SPREAD/MONEYLINE/TOTAL/PROP |
| recommended_line | decimal | Betting line |
| odds | integer | American odds |
| confidence | decimal | Model confidence % |
| expected_value | decimal | Expected value % |
| prediction_date | date | Date of prediction |
| outcome | text | win/loss/pending |

### graded_results

| Column | Type | Description |
|--------|------|-------------|
| game_id | text | Unique game identifier |
| sport | text | Sport |
| status | text | win/loss/pending |
| actual_score | jsonb | Final score |
| result_date | date | Date of result |

### Views

- `prediction_performance` - Win rates by sport, pick_type, date
- `confidence_performance` - Win rates by confidence level

## Scheduler Options

### Change Schedule Time

```powershell
.\run-scheduler.ps1 -SetupTask -Time "08:00"
```

### Run Every 4 Hours

```powershell
.\run-scheduler.ps1 -SetupTask -Schedule EVERY4HOURS
```

### Remove Task

```powershell
.\run-scheduler.ps1 -RemoveTask
```

## Troubleshooting

### Check Task Status

```powershell
Get-ScheduledTask -TaskName "ProbabilityAnalyzer-Scheduler"
Get-ScheduledTaskInfo -TaskName "ProbabilityAnalyzer-Scheduler"
```

### View Recent Logs

```powershell
Get-Content logs\scheduler-$(Get-Date -Format 'yyyy-MM-dd').log -Tail 50
```

### Manual Database Check

```sql
-- Check today's predictions
SELECT prediction_date, sport, pick_type, COUNT(*) 
FROM daily_predictions 
WHERE prediction_date = CURRENT_DATE
GROUP BY prediction_date, sport, pick_type;

-- Check win rates by pick type
SELECT pick_type, 
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE outcome = 'win') as wins,
       ROUND(100.0 * COUNT(*) FILTER (WHERE outcome = 'win') / 
             NULLIF(COUNT(*) FILTER (WHERE outcome IN ('win', 'loss')), 0), 1) as win_rate
FROM daily_predictions
WHERE outcome IS NOT NULL
GROUP BY pick_type;
```

## Pick Type Display

The UI now shows colored badges for each pick type:
- **SPREAD** - Blue gradient
- **MONEYLINE** - Green gradient
- **TOTAL** - Pink/Yellow gradient
- **TEAM_TOTAL** - Orange gradient
- **PROP** - Teal/pink gradient

## Security Notes

- Store Supabase service key securely (use `.env` file, never commit)
- The scheduler runs with SYSTEM privileges when using Task Scheduler
- Archive directory should have appropriate permissions

## Support

For issues or questions, check:
1. Log files in `logs/` directory
2. Windows Event Viewer → Windows Logs → Application
3. Supabase Dashboard → Logs
