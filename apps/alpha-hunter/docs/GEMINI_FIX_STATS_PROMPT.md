# GEMINI: Fix Prognostication Stats Not Updating

## PROBLEM
The Prognostication dashboard at http://localhost:3005 shows stats (accuracy, ROI, active, analyzed) but they are NOT updating in real-time. The numbers stay at 0 or don't change.

## CURRENT ARCHITECTURE

### Data Flow:
1. **Alpha-Hunter Bot** (`apps/alpha-hunter/src/live-trader-24-7.ts`)
   - Runs every 60 seconds
   - Creates predictions and saves to Supabase `bot_predictions` table
   - Calls `ensurePredictionsInSupabase()` to save predictions

2. **Prognostication Stats API** (`apps/prognostication/app/api/stats/route.ts`)
   - Calculates stats from Supabase:
     - Accuracy: from `bot_metrics` table (correct_predictions / total_predictions)
     - ROI: from `trade_history` table (total_pnl / total_spent)
     - Active: count of open predictions from `bot_predictions` (actual_outcome IS NULL)
     - Analyzed: total count from `bot_predictions`

3. **Frontend** (`apps/prognostication/app/page.tsx`)
   - Fetches from `/api/stats` every 30 seconds
   - Updates state with real data

## VERIFICATION STEPS (DO THESE FIRST)

1. **Check if bot is saving predictions:**
   ```powershell
   # Run in apps/alpha-hunter directory
   # Check Supabase directly
   cd C:\cevict-live\apps\alpha-hunter
   # Look for console logs showing "saved to Supabase" or check Supabase dashboard
   ```

2. **Check if stats API returns data:**
   ```powershell
   curl http://localhost:3005/api/stats
   # Should return JSON with accuracy, roi, active, analyzed
   ```

3. **Check Supabase tables have data:**
   - `bot_predictions` table should have rows
   - `bot_metrics` table should have rows (for accuracy calculation)
   - `trade_history` table should have rows (for ROI calculation)

4. **Check browser console:**
   - Open http://localhost:3005
   - F12 → Console tab
   - Look for errors or failed fetch requests to `/api/stats`

## DIAGNOSTIC COMMANDS

```powershell
# 1. Verify bot is running
Get-Process node | Where-Object { $_.Path -like "*alpha-hunter*" }

# 2. Check if Prognostication is running
netstat -ano | Select-String "3005" | Select-String "LISTENING"

# 3. Test stats API directly
Invoke-WebRequest -Uri "http://localhost:3005/api/stats" | Select-Object -ExpandProperty Content

# 4. Check Supabase connection
# Look in bot logs for Supabase errors
Get-Content C:\cevict-live\apps\alpha-hunter\logs\service-output.log -Tail 50
```

## LIKELY ISSUES

1. **bot_metrics table is empty** → Accuracy will be 0
2. **trade_history table is empty** → ROI will be 0
3. **bot_predictions not being saved** → Active/Analyzed will be 0
4. **Stats API query failing** → Returns default zeros
5. **Frontend not fetching** → Check browser console for errors

## FIX REQUIREMENTS

1. **Verify data exists in Supabase:**
   - Check `bot_predictions` has rows with `confidence >= 50`
   - Check `bot_metrics` has rows (if empty, create initial entries)
   - Check `trade_history` has rows (if empty, ROI will be 0)

2. **Fix stats calculation:**
   - If `bot_metrics` is empty, calculate from `bot_predictions` directly
   - If `trade_history` is empty, return 0 for ROI (expected if no trades yet)
   - Ensure queries use correct table names and column names

3. **Verify frontend is fetching:**
   - Check `useEffect` in `page.tsx` is calling `/api/stats`
   - Check for CORS or network errors
   - Verify state is updating

4. **Test the fix:**
   - Make a test prediction
   - Wait 30 seconds
   - Check if stats update on dashboard
   - Verify API returns correct values

## EXPECTED BEHAVIOR AFTER FIX

- Stats API returns real numbers (not all zeros)
- Dashboard updates every 30 seconds
- Numbers change as bot creates more predictions
- Active count increases as predictions are created
- Analyzed count increases over time

## VERIFICATION COMMAND

After fixing, run this to verify:

```powershell
# 1. Check API returns data
$stats = Invoke-RestMethod -Uri "http://localhost:3005/api/stats"
Write-Host "Accuracy: $($stats.accuracy)%"
Write-Host "ROI: $($stats.roi)%"
Write-Host "Active: $($stats.active)"
Write-Host "Analyzed: $($stats.analyzed)"

# 2. Wait 60 seconds, check again
Start-Sleep -Seconds 60
$stats2 = Invoke-RestMethod -Uri "http://localhost:3005/api/stats"
Write-Host "After 60s - Active: $($stats2.active) (was $($stats.active))"

# 3. If numbers changed, fix is working!
if ($stats2.active -ne $stats.active) {
    Write-Host "✅ STATS ARE UPDATING!" -ForegroundColor Green
} else {
    Write-Host "❌ Stats still not updating" -ForegroundColor Red
}
```

## YOUR TASK

1. **Diagnose:** Run verification steps above to find where the data flow breaks
2. **Fix:** Update the code to ensure stats calculate correctly from actual Supabase data
3. **Verify:** Run verification command to confirm stats update in real-time
4. **Report:** Show me the before/after API responses and confirm the fix works

