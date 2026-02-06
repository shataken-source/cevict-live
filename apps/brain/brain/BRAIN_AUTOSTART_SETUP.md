# 🧠 Brain - 24/7 Auto-Start Setup Guide

## 🎯 Goal
Get Brain (autonomous monitoring & self-healing) running 24/7 on your Dell laptop with auto-restart on crash.

---

## ⚡ Quick Setup (10 minutes)

### Step 1: Install Dependencies

1. **Navigate to Brain directory:**
   ```powershell
   cd C:\gcc\cevict-app\cevict-monorepo\apps\brain
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Build Brain:**
   ```powershell
   npm run build
   ```

---

### Step 2: Configure Environment Variables

1. **Create `.env.local` file:**
   ```powershell
   notepad .env.local
   ```

2. **Add required variables:**
   ```env
   # Required
   BRAIN_API_TOKEN=your-secret-token-here
   
   # Optional but recommended for alerts
   SINCH_SERVICE_PLAN_ID=your-sinch-plan-id
   SINCH_API_TOKEN=your-sinch-token
   SINCH_FROM=+1234567890
   ALERT_EMAIL_TO=alerts@yourdomain.com
   ALERT_SMS_TO=+1234567890
   
   # Optional - Health check overrides
   BRAIN_HEALTH_OVERRIDES={"progno":"https://progno.vercel.app/health","petreunion":"https://petreunion.vercel.app/health"}
   ```

3. **Generate BRAIN_API_TOKEN:**
   ```powershell
   # Generate a secure random token
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
   ```
   Copy the output and use it as your `BRAIN_API_TOKEN`.

---

### Step 3: Install as Windows Service (One-Time Setup)

1. **Open PowerShell as Administrator:**
   - Right-click PowerShell
   - Select "Run as Administrator"

2. **Navigate to Brain directory:**
   ```powershell
   cd C:\gcc\cevict-app\cevict-monorepo\apps\brain
   ```

3. **Run the installer:**
   ```powershell
   .\install-brain-service.ps1
   ```

4. **Follow the prompts** - It will create a Windows scheduled task

5. **Done!** Brain will start automatically on next boot.

---

### Step 4: Start It Now (Optional)

If you want to start it immediately without rebooting:

```powershell
Start-ScheduledTask -TaskName "Brain24-7"
```

Or manually run:
```powershell
.\start-brain-24-7.ps1
```

---

## 📊 Check Brain Status

### Quick Status Check:
```powershell
.\check-brain-status.ps1
```

This shows:
- ✅ Current status (running/stopped/error)
- 🔍 Port 3006 status
- 📅 Scheduled task status
- 🔐 Environment variables
- 📝 Recent log entries

---

## 🌐 Access Brain

Once running, access Brain at:
- **Dashboard:** http://localhost:3006
- **Metrics API:** http://localhost:3006/api/metrics
- **Health Check:** http://localhost:3006/health/brain
- **Admin Dashboard:** http://localhost:3006/admin/brain

---

## 🔧 Manual Control

### Start Brain:
```powershell
Start-ScheduledTask -TaskName "Brain24-7"
```

### Stop Brain:
```powershell
Stop-ScheduledTask -TaskName "Brain24-7"
```

### Restart Brain:
```powershell
Restart-ScheduledTask -TaskName "Brain24-7"
```

### View Task in Task Scheduler:
```powershell
taskschd.msc
```
Then look for: **Brain24-7**

---

## 📁 Files Created

### Scripts:
- **`start-brain-24-7.ps1`** - Main Brain runner with auto-restart
- **`install-brain-service.ps1`** - One-time installer (run as Admin)
- **`check-brain-status.ps1`** - Status checker

### Logs (created automatically):
- **`logs/brain-YYYY-MM-DD.log`** - Daily log files
- **`logs/brain-status.json`** - Current status JSON

---

## 🔍 Monitoring

### Check Logs:
```powershell
# View today's log
Get-Content logs\brain-$(Get-Date -Format 'yyyy-MM-dd').log -Tail 50

# View all logs
Get-ChildItem logs\brain-*.log | Sort-Object LastWriteTime -Descending
```

### Check Status File:
```powershell
Get-Content logs\brain-status.json | ConvertFrom-Json
```

### Watch Logs in Real-Time:
```powershell
Get-Content logs\brain-$(Get-Date -Format 'yyyy-MM-dd').log -Wait -Tail 20
```

### Check Metrics API:
```powershell
Invoke-RestMethod -Uri "http://localhost:3006/api/metrics" | ConvertTo-Json
```

---

## 🚨 Troubleshooting

### Brain Won't Start:
1. **Check Node.js is installed:**
   ```powershell
   node --version
   ```

2. **Check dependencies are installed:**
   ```powershell
   Test-Path node_modules
   ```

3. **Check if built:**
   ```powershell
   Test-Path .next
   ```
   If not, run: `npm run build`

4. **Check port 3006 is available:**
   ```powershell
   Get-NetTCPConnection -LocalPort 3006
   ```
   If in use, stop the process or change port in `package.json`

5. **Check environment variables:**
   ```powershell
   Test-Path .env.local
   Get-Content .env.local
   ```

6. **Check logs for errors:**
   ```powershell
   Get-Content logs\brain-*.log | Select-String "ERROR"
   ```

### Brain Keeps Crashing:
1. **Check logs** for specific error messages
2. **Verify environment variables** are set correctly
3. **Check network connectivity** (Brain needs internet for health checks)
4. **Verify all dependencies** are installed:
   ```powershell
   npm install
   ```

### Port 3006 Already in Use:
1. **Find what's using it:**
   ```powershell
   Get-NetTCPConnection -LocalPort 3006 | Select-Object OwningProcess
   ```

2. **Kill the process:**
   ```powershell
   Stop-Process -Id <PID> -Force
   ```

3. **Or change Brain's port** in `package.json`:
   ```json
   "start": "next start -p 3007"
   ```

### Task Scheduler Issues:
1. **Reinstall the task:**
   ```powershell
   # Remove old task
   Unregister-ScheduledTask -TaskName "Brain24-7" -Confirm:$false
   
   # Reinstall
   .\install-brain-service.ps1
   ```

2. **Check task is enabled:**
   ```powershell
   Get-ScheduledTask -TaskName "Brain24-7" | Select-Object State
   ```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Task created in Task Scheduler
- [ ] Brain starts on boot (or manually)
- [ ] Status file shows "running"
- [ ] Logs are being created
- [ ] Brain process is running (check with `check-brain-status.ps1`)
- [ ] Port 3006 is listening
- [ ] Dashboard accessible at http://localhost:3006
- [ ] Metrics API responding
- [ ] Brain auto-restarts after crash (test by killing process)

---

## 🎯 Success Criteria

**You'll know it's working when:**
- ✅ Brain runs 24/7 without manual intervention
- ✅ Auto-restarts if it crashes
- ✅ Logs show regular health checks
- ✅ Status file shows "running"
- ✅ Dashboard is accessible
- ✅ Metrics API returns data

---

## 🔗 Integration with Launchpad

Once Brain is running, configure Launchpad to connect:

1. **In Launchpad `.env.local`:**
   ```env
   BRAIN_BASE_URL=http://localhost:3006
   BRAIN_API_TOKEN=your-brain-api-token-here
   ```

2. **Launchpad will now:**
   - Show Brain status
   - Display metrics
   - Allow Brain control commands

---

## 📞 Need Help?

1. **Check status:** `.\check-brain-status.ps1`
2. **Check logs:** `Get-Content logs\brain-*.log -Tail 50`
3. **Check Task Scheduler:** `taskschd.msc`
4. **Test API:** `Invoke-RestMethod -Uri "http://localhost:3006/api/metrics"`

---

**Once this is set up, Brain will monitor all your apps 24/7 and auto-heal problems!** 🚀

