# PetReunion Scraper - Production Hardening

## 🎯 Three Critical Fixes Applied

### 1. **Trailing Slash Protection** ✅
**Problem:** If `$env:PETREUNION_URL` is set to `https://petreunion.org/`, the script would create `https://petreunion.org//api/...` causing 404 or redirect errors.

**Fix:**
```powershell
$PetReunionUrl = $PetReunionUrl.TrimEnd('/')
```

### 2. **Timeout Protection** ✅
**Problem:** `Invoke-RestMethod` has no default timeout. If the scraper hangs, PowerShell sessions pile up as "ghost processes."

**Fix:**
```powershell
Invoke-RestMethod -TimeoutSec 300  # 5-minute hard limit
```

### 3. **Log Cleanup** ✅
**Problem:** Creates a new log file every day (`scraper-2026-01-06.log`). After a year = 365 files.

**Fix:** Auto-delete logs older than 14 days
```powershell
Get-ChildItem $LogDir -Filter "scraper-*.log" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-14) } | 
    Remove-Item
```

---

## 📊 Optional: Supabase Integration

To track scraper runs alongside Alpha-Hunter trading logs:

### 1. **Create the Table**
Run the migration in your Supabase project:
```bash
psql $DATABASE_URL < supabase/migrations/create_scraper_logs.sql
```
Or via Supabase Studio SQL editor.

### 2. **Enable Logging in Script**
In `run-daily-scraper.ps1`, find this line (around line 54):
```powershell
# === OPTIONAL: LOG TO SUPABASE ===
# Uncomment to track scraper runs alongside Alpha-Hunter trades
# Log-ToSupabase -Status "success" -Stats $response.stats
```

Change to:
```powershell
# === OPTIONAL: LOG TO SUPABASE ===
Log-ToSupabase -Status "success" -Stats $response.stats
```

### 3. **Set Environment Variables**
The scraper will auto-detect if these are set (same ones Alpha-Hunter uses):
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If not set, it silently skips Supabase logging.

---

## 🚀 Running the Hardened Scraper

### Manual Run
```powershell
cd C:\cevict-live\apps\petreunion
.\run-daily-scraper.ps1
```

### Scheduled Task (Windows)
```powershell
# Run daily at 3 AM
$action = New-ScheduledTaskAction -Execute "pwsh.exe" -Argument "-File C:\cevict-live\apps\petreunion\run-daily-scraper.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -TaskName "PetReunion Daily Scraper" -Action $action -Trigger $trigger
```

---

## 📈 What Gets Logged to Supabase

Example log entry:
```json
{
  "id": "uuid",
  "timestamp": "2026-01-06T03:00:00Z",
  "service": "petreunion-scraper",
  "status": "success",
  "stats": {
    "cities_processed": 10,
    "pets_added": 47,
    "duplicates_skipped": 3,
    "duration_seconds": 142
  },
  "host": "DESKTOP-ABC123"
}
```

You can then query scraper health in the same dashboard as your Alpha-Hunter trades:
```sql
-- Recent scraper runs
SELECT timestamp, status, stats->>'cities_processed' as cities
FROM scraper_logs 
ORDER BY timestamp DESC 
LIMIT 10;

-- Success rate last 7 days
SELECT 
  status,
  COUNT(*) as runs,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM scraper_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY status;
```

---

## ⚠️ Troubleshooting

### "Timeout after 5 minutes"
- Scraper is processing too many cities or APIs are slow
- **Solution:** Reduce `maxCities` from 10 to 5 in the script

### Logs filling up despite cleanup
- Check if script has write permissions to `logs/` folder
- **Solution:** Run `icacls .\logs /grant Users:F`

### Supabase logging fails (non-critical)
- Script will continue and just log to file
- Check that `SUPABASE_SERVICE_ROLE_KEY` is correct
- Verify table exists: `SELECT * FROM scraper_logs LIMIT 1;`

---

## 🔗 Integration with Alpha-Hunter

Both systems now share:
- ✅ Same Supabase instance
- ✅ Same logging patterns
- ✅ Same timeout safeguards
- ✅ Same log rotation strategy

You can build a unified dashboard showing:
- Trading activity (Alpha-Hunter)
- Data pipeline health (PetReunion scraper)
- System uptime/errors across all services

