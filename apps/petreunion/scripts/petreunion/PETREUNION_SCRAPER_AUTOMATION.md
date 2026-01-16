# 🐾 PetReunion Scraper - Daily Automation Setup

## 🎯 Goal
Set up daily automated scraping for PetReunion database population.

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Install Scheduled Task

1. **Open PowerShell as Administrator:**
   - Right-click PowerShell
   - Select "Run as Administrator"

2. **Navigate to PetReunion directory:**
   ```powershell
   cd C:\gcc\cevict-app\cevict-monorepo\apps\petreunion
   ```

3. **Run the scheduler:**
   ```powershell
   .\schedule-daily-scraper.ps1
   ```

4. **Done!** Scraper will run daily at 2:00 AM.

---

## ⚠️ Important Note

**The scraper endpoint currently returns 501 (Not Implemented).**

This is expected - the actual scraping logic needs to be implemented. However, the automation framework is set up and ready. Once the scraper logic is implemented, it will automatically run daily.

---

## 📊 What Gets Scheduled

- **Task Name:** `PetReunionDailyScraper`
- **Schedule:** Daily at 2:00 AM
- **Action:** Calls `/api/petreunion/populate-database` endpoint
- **Logs:** `logs/scraper-YYYY-MM-DD.log`

---

## 🔧 Manual Control

### Run Scraper Now:
```powershell
.\run-daily-scraper.ps1
```

### Start Scheduled Task:
```powershell
Start-ScheduledTask -TaskName "PetReunionDailyScraper"
```

### Stop Scheduled Task:
```powershell
Stop-ScheduledTask -TaskName "PetReunionDailyScraper"
```

### View Task in Task Scheduler:
```powershell
taskschd.msc
```
Then look for: **PetReunionDailyScraper**

---

## 📝 Logs

### View Today's Log:
```powershell
Get-Content logs\scraper-$(Get-Date -Format 'yyyy-MM-dd').log
```

### View All Logs:
```powershell
Get-ChildItem logs\scraper-*.log | Sort-Object LastWriteTime -Descending
```

### Watch Logs in Real-Time:
```powershell
Get-Content logs\scraper-$(Get-Date -Format 'yyyy-MM-dd').log -Wait -Tail 20
```

---

## 🔧 Configuration

### Change Schedule Time:

Edit the scheduled task:
```powershell
# Get current trigger
$task = Get-ScheduledTask -TaskName "PetReunionDailyScraper"
$trigger = $task.Triggers[0]

# Create new trigger (e.g., 3:00 AM)
$newTrigger = New-ScheduledTaskTrigger -Daily -At "3:00AM"

# Update task
Set-ScheduledTask -TaskName "PetReunionDailyScraper" -Trigger $newTrigger
```

### Change PetReunion URL:

Edit `run-daily-scraper.ps1`:
```powershell
# Change this line:
$PetReunionUrl = "https://petreunion.vercel.app"
# To your URL (e.g., http://localhost:3003 for local)
```

Or set environment variable:
```powershell
$env:PETREUNION_URL = "http://localhost:3003"
```

---

## 🚨 Troubleshooting

### Task Won't Run:
1. **Check task is enabled:**
   ```powershell
   Get-ScheduledTask -TaskName "PetReunionDailyScraper" | Select-Object State
   ```

2. **Check last run result:**
   ```powershell
   Get-ScheduledTaskInfo -TaskName "PetReunionDailyScraper"
   ```

3. **Check logs for errors:**
   ```powershell
   Get-Content logs\scraper-*.log | Select-String "ERROR"
   ```

### API Returns 501:
- **This is expected!** The scraper logic is not yet implemented.
- The automation is ready - it will work once scraper is implemented.
- Check logs to confirm the automation is calling the endpoint.

### Network Errors:
- Check PetReunion URL is correct
- Verify PetReunion is deployed and accessible
- Check firewall/network connectivity

---

## ✅ Verification Checklist

- [ ] Task created in Task Scheduler
- [ ] Task scheduled for daily at 2:00 AM
- [ ] Scraper script created (`run-daily-scraper.ps1`)
- [ ] Logs directory created
- [ ] Test run completed (even if returns 501)
- [ ] Logs show automation is working

---

## 🎯 Success Criteria

**You'll know it's working when:**
- ✅ Task runs daily at 2:00 AM
- ✅ Logs are created each day
- ✅ Logs show API calls (even if 501)
- ✅ Once scraper is implemented, it runs automatically

---

## 📞 Next Steps

Once the scraper logic is implemented:
1. The automation will automatically start working
2. Check logs daily to verify scraping
3. Monitor database for new pets
4. Adjust schedule if needed

---

**The automation framework is ready! Once scraper logic is implemented, it will run automatically every day!** 🚀

