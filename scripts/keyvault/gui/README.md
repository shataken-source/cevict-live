# KeyVault GUI Documentation

**System tray application for managing cevict-live secrets without touching the command line.**

---

## Overview

KeyVault GUI is a Python + PyQt6 desktop application that provides a visual interface for the PowerShell KeyVault scripts. It lives in your Windows system tray for instant access to secret management, environment synchronization, and Vercel deployments.

---

## Installation

### Requirements
- Windows 10/11
- Python 3.10+ with pip
- PowerShell (pwsh)

### First-time setup

```powershell
cd C:\cevict-live\scripts\keyvault\gui
pip install -r requirements.txt
```

Or just double-click `launch.bat` — it will auto-install PyQt6 if missing.

---

## Launching

### Method 1: Double-click (easiest)
```
C:\cevict-live\scripts\keyvault\gui\launch.bat
```

### Method 2: PowerShell
```powershell
cd C:\cevict-live\scripts\keyvault\gui
.\launch.ps1
```

### Method 3: Direct Python
```powershell
cd C:\cevict-live\scripts\keyvault\gui
pythonw keyvault_gui.py
```

The app starts minimized to the system tray. Look for the **amber key icon** near your clock.

---

## System Tray

| Action | Result |
|--------|--------|
| **Left-click** icon | Open KeyVault window |
| **Right-click** icon | Context menu |
| **Double-click** icon | Open KeyVault window |
| **Close window** | Minimizes to tray (keeps running) |

### Tray Menu Items
- **Open KeyVault** — Show the main window
- **Refresh Store** — Reload secrets from disk
- **Sync All Apps** — Run `sync-env.ps1 -All` for all apps
- **Quit** — Exit the application

---

## Tab 1: Secrets

Full CRUD for your `env-store.json` secrets.

### Features
- **Search** — Filter secrets by key name (case-insensitive)
- **Add Secret** — Create new key-value pairs
- **Edit** — Modify existing values
- **Delete** — Remove keys permanently
- **Reveal** — Toggle between masked and plain text

### Value Masking
Values are automatically masked: `abcd****************wxyz` (first/last 4 chars visible). Click **👁 Reveal** to see the full value.

### Storage Location
The GUI auto-detects your store at:
1. `C:\Cevict_Vault\env-store.json` (preferred)
2. `C:\Cevict_Vault\vault\secrets\env-store.json`
3. `C:\cevict-live\vault\secrets\env-store.json`

Override with environment variable: `KEYVAULT_STORE_PATH`

---

## Tab 2: Operations

### Sync .env.local from Store
Synchronizes KeyVault secrets to app `.env.local` files based on `env.manifest.json`.

| Control | Purpose |
|---------|---------|
| **App dropdown** | Select which app to sync |
| **Dry Run** | Preview changes without writing files |
| **Sync** | Sync selected app only |
| **Sync All** | Sync all apps with manifests |

### Import from .env Files
One-time import to seed KeyVault from existing `.env.local` files.

| Control | Purpose |
|---------|---------|
| **Overwrite existing** | Replace existing values (default: skip) |
| **Dry Run** | Preview without importing |
| **Import (defaults)** | Scan default paths and import |
| **Import from file...** | Select a specific `.env` file |

Default paths scanned:
- `C:\cevict-live\.env`
- `C:\cevict-live\.env.local`
- `C:\cevict-live\apps\*\.env.local`

### Find Placeholders
Detects secrets that look like placeholder values:
- `your-*`, `paste_your_*`, `*_here`, `replace_me`, `xxx*`, `example.*`, `<placeholder>`, `[paste key here]`

### Scan Repo for .env Files
Lists all environment-related files in the repo (excluding `node_modules`):
- `.env`, `.env.local`, `.env.*.local`
- `.env.example`, `*.env.example`
- Backups: `*.env.local.backup*`

---

## Tab 3: Vercel Push

Push KeyVault secrets to Vercel environment variables via API.

### Push Secrets
| Control | Purpose |
|---------|---------|
| **App name** | Vercel project name (from `keyvault.targets.json`) |
| **Environment** | `development`, `preview`, or `production` |
| **Dry Run** | Preview without calling Vercel API |
| **Push to Vercel** | Execute the push |

### Required Setup
Your `C:\cevict-live\config\keyvault.targets.json` must contain:
```json
{
  "apps": {
    "your-app": {
      "path": "apps/your-app",
      "vercel": {
        "projectId": "prj_xxxx",
        "teamId": "team_xxxx"
      }
    }
  }
}
```

Plus `VERCEL_TOKEN` in your KeyVault store.

---

## Tab 4: Diagnostics

### Doctor
Runs `doctor.ps1` to verify all required manifest variables exist in the store.

### List Missing Keys
Shows which `env.manifest.json` variables are missing from KeyVault.

| Control | Purpose |
|---------|---------|
| **Show values** | Display actual values (careful: secrets visible) |
| **App (optional)** | Check one app or all default apps |

### Store Info
Displays:
- Store file path
- File exists: yes/no
- Number of secrets
- Last updated timestamp

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+W` | Close window (minimizes to tray) |
| `Ctrl+R` | Refresh secrets table |
| `Ctrl+Q` | Quit application |

---

## Troubleshooting

### "Store file not found"
Run `init-store.ps1` first or create `C:\Cevict_Vault\` directory.

### Changes don't appear
Click **Refresh** or switch tabs. The GUI caches the store in memory.

### Vercel push fails
Check that `VERCEL_TOKEN` is set in KeyVault and `keyvault.targets.json` is valid.

### GUI won't start
```powershell
pip install --upgrade PyQt6
```

---

## Data Safety

- ✅ All operations are local (no cloud)
- ✅ Direct JSON file I/O (no database)
- ✅ Delete requires confirmation
- ✅ Values masked by default
- ⚠️ "Show values" reveals plaintext — use with care

---

## Architecture

```
┌─────────────────────────────────────┐
│         KeyVault GUI (PyQt6)        │
│  ┌─────────┐ ┌─────────┐ ┌──────┐  │
│  │ Secrets │ │  Ops    │ │Vercel│  │
│  └─────────┘ └─────────┘ └──────┘  │
└──────────────┬──────────────────────┘
               │
        ┌──────▼──────┐     ┌──────────┐
        │ Python I/O  │────▶│env-store.│
        │ (JSON read/ │     │  json    │
        │   write)    │     └──────────┘
        └──────┬──────┘
               │
        ┌──────▼────────┐
        │ PowerShell    │
        │ script runner │
        │ (sync-env,    │
        │  push-vercel) │
        └───────────────┘
```

---

## Related

- PowerShell scripts: `C:\cevict-live\scripts\keyvault\`
- Store path: `C:\Cevict_Vault\env-store.json`
- DevOps Agent (companion app): `C:\cevict-live\apps\local-agent\gui\`
