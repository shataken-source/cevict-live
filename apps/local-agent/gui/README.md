# DevOps Agent Documentation

**System tray command center for cevict-live operations. Git, Vercel, audits, organization, tools, and Cochran AI management — all from one GUI with a remote API for AI assistants.**

---

## Overview

DevOps Agent is a Python + PyQt6 desktop application that centralizes all your development operations. It combines:
- **Visual GUI** for interactive management
- **HTTP API** for remote/automated operations (e.g., Cascade calling to execute commands)
- **System tray** for always-available access

---

## Quick Start

### Launch
```powershell
# Method 1: Double-click
cd C:\cevict-live\apps\local-agent\gui
.\launch.bat

# Method 2: PowerShell
.\launch.ps1

# Method 3: Python directly
pythonw devops_agent.py
```

### System Tray
Look for the **blue gear icon** near your clock:
- **Left-click / Double-click** — Open window
- **Right-click** — Menu with quick actions
- **Close window** — Minimizes to tray (keeps running)

---

## Features by Tab

### ⎇ Git Tab

Full Git workflow without command line.

| Feature | Description |
|---------|-------------|
| **Live Status** | Current branch, modified files count |
| **Stage All** | `git add -A` checkbox |
| **Commit** | Write message, click commit |
| **Push** | Push to origin |
| **Commit & Push** | One-click stage → commit → push |
| **Recent Log** | `git log --oneline --graph` |

### ▲ Vercel Tab

Deploy apps and manage environment variables.

| Feature | Description |
|---------|-------------|
| **App Dropdown** | Auto-detects Next.js/Vercel apps |
| **Production Toggle** | Add `--prod` flag |
| **Deploy** | Run `npx vercel --yes` |
| **Build Only** | Run `npx next build` |
| **Push Env** | Push KeyVault secrets to Vercel |

### 🔍 Audit Tab

Find what's eating your disk and what can be removed.

| Feature | Description |
|---------|-------------|
| **Find Large Files** | Files > 1MB (excluding node_modules/.git) |
| **Find node_modules** | All `node_modules` with sizes |
| **Safe to Remove** | Build artifacts, caches, logs, temp files |
| **Unused Deps** | Scan imports vs package.json dependencies |

### 📁 Organize Tab

Visualize and clean up project structure.

| Feature | Description |
|---------|-------------|
| **Load Tree** | Browse `apps/` folder structure |
| **Disk Usage** | Per-app breakdown (total / node_modules / source) |
| **Empty Dirs** | Find empty folders that can be deleted |
| **Duplicate Names** | Files with same name across apps |

### 🛠 Tools Tab

Port management, process cleanup, maintenance.

| Feature | Description |
|---------|-------------|
| **Port Checker** | Check what's using a specific port |
| **Kill Port** | Terminate process on port |
| **Scan Common Ports** | Check 3000-3005, 3847, 4000, 5173, 8080 |
| **Kill Processes** | Kill all `node.exe`, `next-server`, or `electron` |
| **pnpm store prune** | Clean pnpm cache |
| **git gc** | Git garbage collection |
| **npm cache clean** | Clear npm cache |

### 🤖 Cochran Tab

Manage the Cochran AI learner agent.

| Feature | Description |
|---------|-------------|
| **Status Indicator** | Green (running) / Red (stopped) |
| **Start/Stop** | Control the learner server |
| **Get Refresher** | Last 5 sessions |
| **Rebuild Knowledge** | Re-index `C:\gcc` + `C:\cevict-live` |
| **Run Tasks** | Execute `COCHRAN_TASKS.json` |
| **Vector Search** | Check status, rebuild index |

---

## Remote API for AI Assistants

The DevOps Agent exposes an HTTP API on **port 8471** (separate from the GUI). This allows AI assistants like Cascade to execute long-running operations without consuming tokens waiting for output.

### Why use the API?

- **Save tokens** — Don't stream command output to the AI
- **Async operations** — Start a deploy, check back later
- **Structured results** — JSON responses instead of parsing text
- **Safety** — Operations run through a controlled interface

### Starting the API Server

The API server starts automatically when you launch the GUI. To run API-only (headless):

```powershell
cd C:\cevict-live\apps\local-agent\gui
python devops_agent_api.py  # API-only mode
```

Or with the GUI:
```powershell
pythonw devops_agent.py  # GUI + API both start
```

### API Base URL
```
http://localhost:8471
```

### Authentication
Currently local-only (localhost). No auth required for local development.

---

## API Endpoints

### Health Check
```http
GET /health
```
```json
{
  "status": "running",
  "service": "devops-agent",
  "version": "1.0.0",
  "port": 8471
}
```

### Git Operations

#### Get Status
```http
GET /git/status
```
```json
{
  "branch": "gcc-vessels",
  "clean": false,
  "changed_files": 3,
  "files": [" M apps/web/page.tsx", "?? apps/new/"]
}
```

#### Commit
```http
POST /git/commit
Content-Type: application/json

{
  "message": "feat: add new feature",
  "stage_all": true
}
```
```json
{
  "success": true,
  "commit_hash": "abc1234",
  "output": "[gcc-vessels abc1234] feat: add new feature\n 3 files changed, 45 insertions(+)"
}
```

#### Push
```http
POST /git/push
```
```json
{
  "success": true,
  "output": "Enumerating objects: 12...\nTo https://github.com/..."
}
```

#### Commit and Push
```http
POST /git/commit-and-push
Content-Type: application/json

{
  "message": "feat: deploy fix",
  "stage_all": true
}
```

#### Get Log
```http
GET /git/log?limit=10
```
```json
{
  "commits": [
    {"hash": "abc1234", "message": "feat: add feature", "date": "2026-02-14"}
  ]
}
```

---

### Vercel Operations

#### Deploy
```http
POST /vercel/deploy
Content-Type: application/json

{
  "app": "accu-solar",
  "production": false
}
```
```json
{
  "success": true,
  "deployment_url": "https://accu-solar-xyz.vercel.app",
  "output": "🔍 Inspect: https://vercel.com/..."
}
```

#### Build Only
```http
POST /vercel/build
Content-Type: application/json

{
  "app": "accu-solar"
}
```

#### Push Environment Variables
```http
POST /vercel/push-env
Content-Type: application/json

{
  "app": "accu-solar",
  "environment": "development",
  "dry_run": false
}
```

---

### Audit Operations

#### Find Large Files
```http
GET /audit/large-files?app=accu-solar&threshold_mb=1
```
```json
{
  "threshold_bytes": 1048576,
  "files": [
    {"path": "apps/accu-solar/public/video.mp4", "size": 5242880, "size_formatted": "5.0 MB"}
  ],
  "total_size": 5242880,
  "total_formatted": "5.0 MB"
}
```

#### Find node_modules
```http
GET /audit/node-modules
```
```json
{
  "locations": [
    {"path": "apps/accu-solar/node_modules", "size": 245000000, "size_formatted": "233.7 MB"}
  ],
  "total_size": 245000000,
  "total_formatted": "233.7 MB"
}
```

#### Safe to Remove
```http
GET /audit/safe-to-remove?app=accu-solar
```
```json
{
  "items": [
    {"type": ".next", "path": "apps/accu-solar/.next", "size": 85000000}
  ],
  "total_size": 85000000,
  "total_formatted": "81.1 MB"
}
```

#### Check Unused Dependencies
```http
GET /audit/unused-deps?app=accu-solar
```
```json
{
  "production": {"total": 12, "unused": ["lodash", "moment"]},
  "dev": {"total": 8, "unused": ["@types/x"]}
}
```

---

### Organize Operations

#### Disk Usage by App
```http
GET /organize/disk-usage
```
```json
{
  "apps": [
    {"name": "accu-solar", "total": 500000000, "total_formatted": "476.8 MB", "node_modules": 233000000, "source": 267000000}
  ],
  "grand_total": 500000000
}
```

#### Find Empty Directories
```http
GET /organize/empty-dirs
```
```json
{
  "empty_directories": ["apps/old-app/dist/", "docs/temp/"]
}
```

#### Find Duplicate File Names
```http
GET /organize/duplicate-names
```
```json
{
  "duplicates": {
    "utils.ts": ["apps/app1/utils.ts", "apps/app2/utils.ts"]
  }
}
```

---

### Tools / System Operations

#### Check Port
```http
GET /tools/port/{port}
```
```json
{
  "port": 3000,
  "in_use": true,
  "pid": 12345,
  "process": "node.exe"
}
```

#### Scan Common Ports
```http
GET /tools/ports-scan
```
```json
{
  "ports": [
    {"port": 3000, "status": "in_use", "pid": "12345", "process": "node.exe"},
    {"port": 3847, "status": "free"}
  ]
}
```

#### Kill Process on Port
```http
POST /tools/port/{port}/kill
```
```json
{
  "success": true,
  "message": "Killed process on port 3000"
}
```

#### Kill Processes by Name
```http
POST /tools/kill-process
Content-Type: application/json

{
  "name": "node"
}
```

#### Run Quick Command
```http
POST /tools/command
Content-Type: application/json

{
  "command": ["pnpm", "store", "prune"]
}
```
```json
{
  "success": true,
  "output": "Removed 1.2 GB from store"
}
```

---

### Cochran AI Operations

#### Check Cochran Status
```http
GET /cochran/status
```
```json
{
  "running": true,
  "port": 3847,
  "uptime": 3600,
  "data_dir": "C:\\Cevict_Vault\\local-agent"
}
```

#### Start Cochran
```http
POST /cochran/start
```

#### Stop Cochran
```http
POST /cochran/stop
```

#### Get Refresher
```http
GET /cochran/refresher?last=5
```
```json
{
  "sessions": [
    {"summary": "Fixed auth bug", "phase": "bughunt", "tags": ["auth"]}
  ]
}
```

#### Rebuild Knowledge
```http
POST /cochran/knowledge/rebuild
```

#### Run Pending Tasks
```http
POST /cochran/tasks/run
```

---

## Example: Cascade Using the API

Instead of running commands directly (which streams output and consumes tokens), Cascade can:

### 1. Start a deploy asynchronously
```powershell
# Cascade calls the API
$body = @{app = "accu-solar"; production = $true} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8471/vercel/deploy" -Method POST -Body $body -ContentType "application/json"
```

Response:
```json
{
  "success": true,
  "deployment_url": "https://accu-solar-prod.vercel.app"
}
```

### 2. Check audit results
```powershell
Invoke-RestMethod -Uri "http://localhost:8471/audit/large-files?app=accu-solar"
```

### 3. Commit and push
```powershell
$body = @{message = "feat: add EPG grid"; stage_all = $true} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8471/git/commit-and-push" -Method POST -Body $body
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              DevOps Agent                   │
│  ┌─────────┬─────────┬─────────┬─────────┐   │
│  │   Git   │ Vercel  │  Audit  │Organize│   │  ← PyQt6 GUI
│  └─────────┴─────────┴─────────┴─────────┘   │
│  ┌─────────────────────────────────────────┐  │
│  │         HTTP API Server (port 8471)    │  │  ← Flask/FastAPI
│  │  /git/*, /vercel/*, /audit/*, etc.     │  │
│  └─────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │   PowerShell/cmd    │
        │   (git, npx vercel,  │
        │    Get-Process, etc)│
        └─────────────────────┘
```

---

## Configuration

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `DEVOPS_AGENT_PORT` | `8471` | API server port |
| `DEVOPS_DATA_DIR` | `C:\Cevict_Vault\devops-agent` | Data storage (logs, temp) |
| `COCHRAN_PORT` | `3847` | Cochran AI port (for status checks) |

---

## Troubleshooting

### API not responding
```powershell
# Check if running
Invoke-RestMethod -Uri "http://localhost:8471/health"

# Check port
Get-NetTCPConnection -LocalPort 8471
```

### GUI won't start
```powershell
pip install --upgrade PyQt6
```

### Operations fail silently
Check the API response `success` field and `output` for error details.

---

## Related Projects

- **KeyVault GUI** — Secret management: `C:\cevict-live\scripts\keyvault\gui\`
- **Cochran AI** — Learner agent: `C:\cevict-live\apps\local-agent\`

---

## Development

To add new endpoints:
1. Edit `devops_agent_api.py`
2. Add route handler
3. Call existing `run_cmd()` helper
4. Return JSON response

All operations are non-blocking — long-running commands execute in background threads with status polling available.
