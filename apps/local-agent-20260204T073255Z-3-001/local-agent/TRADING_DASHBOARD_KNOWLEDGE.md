# 🎯 Trading Dashboard - Local Agent Knowledge

**For Local Agent:** This file contains knowledge about the Trading Dashboard GUI system.

## Overview

The Trading Dashboard (`apps/trading-dashboard`, Port 3011) is a web application that provides:
1. Trading statistics visualization
2. **Full GUI command execution** (replaces command line)
3. **File browser** (replaces file explorer)
4. **Quick actions** (one-click tasks)

## Key Feature: Defaults to Monorepo Root

**ALL GUI tools default to:**
```
C:\gcc\cevict-app\cevict-monorepo
```

This means:
- Command Runner starts at monorepo root
- File Manager starts at monorepo root
- Quick Actions execute from monorepo root
- No manual navigation needed

## GUI Components

### 1. Command Runner
- **Location:** Floating button (Terminal icon, bottom-right)
- **Purpose:** Execute any command from GUI
- **Default CWD:** `C:\gcc\cevict-app\cevict-monorepo`
- **Features:**
  - Change directory to any folder
  - Command history (last 50)
  - Quick command buttons
  - Real-time output
  - Error display

### 2. File Manager
- **Location:** Floating button (Folder icon, above Command Runner)
- **Purpose:** Browse files and view content
- **Default Path:** `C:\gcc\cevict-app\cevict-monorepo`
- **Features:**
  - Navigate folders
  - View file contents
  - Breadcrumb navigation
  - Refresh directory

### 3. Quick Actions
- **Location:** Floating button (Lightning icon, above File Manager)
- **Purpose:** One-click common tasks
- **Default CWD:** `C:\gcc\cevict-app\cevict-monorepo`
- **Actions:**
  - Start Trading (`cd apps/alpha-hunter && pnpm run kalshi`)
  - Start Crypto (`cd apps/alpha-hunter && pnpm run train`)
  - Start Local Agent (`cd apps/local-agent && pnpm dev`)
  - Install Dependencies (`pnpm install`)
  - Git Status (`git status`)

## API Endpoints Used

The dashboard uses Local Agent API (port 3847):

- `POST /execute` - Execute commands
- `POST /file/list` - List directory contents
- `POST /file/read` - Read file contents
- `GET /alpha-hunter/stats` - Trading statistics
- `GET /alpha-hunter/trades` - Recent trades

## When User Asks to Do Something

**Use Trading Dashboard GUI instead of command line:**

1. **Execute Commands:**
   - Open Command Runner (Terminal icon)
   - Type command (defaults to monorepo root)
   - Execute

2. **Browse Files:**
   - Open File Manager (Folder icon)
   - Navigate (starts at monorepo root)
   - View files

3. **Common Tasks:**
   - Use Quick Actions (Lightning icon)
   - One-click execution

## Starting the Dashboard

```bash
cd apps/trading-dashboard
pnpm install
pnpm dev
```

Then open: http://localhost:3011

## Integration Notes

- Dashboard connects to Local Agent on port 3847
- All commands execute via Local Agent API
- File operations use Local Agent file endpoints
- Default working directory is always monorepo root

## Best Practices

1. **Always default to monorepo root** - User requested this
2. **GUI first** - Use GUI tools instead of command line
3. **Command line available** - Still accessible when needed
4. **Quick Actions** - Use for common tasks
5. **File Manager** - Use for browsing/viewing files

---

**Remember:** Everything defaults to `C:\gcc\cevict-app\cevict-monorepo`!

