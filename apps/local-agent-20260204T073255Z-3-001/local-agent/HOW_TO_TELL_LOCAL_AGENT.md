# 📡 How to Tell Local Agent

## Quick Methods

### Method 1: API Call (Easiest) ⚡

```bash
POST http://localhost:3847/cursor-accept/start
```

**PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3847/cursor-accept/start" -Method POST
```

**cURL:**
```bash
curl -X POST http://localhost:3847/cursor-accept/start
```

### Method 2: Natural Language (GUI Genius) 🧠

```bash
POST http://localhost:3847/gui/ai-execute
Body: {
  "instruction": "Fix the accept button - auto-click it when it appears"
}
```

**PowerShell:**
```powershell
$body = @{instruction="Fix the accept button"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3847/gui/ai-execute" -Method POST -Body $body -ContentType "application/json"
```

### Method 3: Trading Dashboard GUI 🎨

1. Open **http://localhost:3011**
2. Click **Command Runner** button (bottom-right, Terminal icon)
3. Type: `"Fix the accept button"`
4. Press Enter or click Play button

### Method 4: Direct Command Line 💻

If Local Agent is running in a terminal:
- Just type commands in that terminal
- Or use the API endpoints

## Common Commands

### Fix Accept Button
```
"Fix the accept button"
"Auto-click accept button"
"Start accept button watcher"
```

### Check Status
```
GET http://localhost:3847/cursor-accept/start
```

### Stop Watcher
```
POST http://localhost:3847/cursor-accept/stop
```

### Force Click Now
```
POST http://localhost:3847/cursor-accept/click-now
```

## Natural Language Examples

Local Agent understands these:

- "Fix the accept button"
- "Auto-click accept button when it appears"
- "Start watching for accept button"
- "Make accept button auto-click"
- "Stop the accept button from popping up"

## Make Sure Local Agent is Running

```bash
cd apps/local-agent
pnpm dev
```

Then use any method above!

---

**Easiest: Just use the Trading Dashboard GUI and type your command!** 🎯

