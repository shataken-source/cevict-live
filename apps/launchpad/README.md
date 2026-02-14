# 🚀 Launchpad

CEVICT ops dashboard: project grid, health, start/stop, and **Command Center** (per-project tabs, AI messaging, logs, risk factors). User-facing at **cevict.ai** with sign-in.

## Setup

1. **Install:** `pnpm install`
2. **Env:** Create `.env.local` with Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`). Optional: `LAUNCHPAD_APPS_PATH` or `PROJECTS_BASE_PATH` for start-project/clear-cache (defaults to `process.cwd()/apps`).
3. **Run:** `pnpm dev` (port 3001) or `pnpm build` then `pnpm start`

Signed-out users hitting `/` are redirected to `/landing`. Sign in to access dashboard, Command Center, and Affiliates.

## Features

- ✅ **Command Center** (`/command-center`) – Per-project tabs, health, Start/Stop/Restart, AI message to Claude/Gemini/Cursor inboxes, logs, Alpha Hunter metrics & risk factors
- ✅ **Project Management** - Add, edit, delete projects
- ✅ **Database Control** - Start/stop databases per project (Supabase, PostgreSQL, MongoDB, Custom)
- ✅ **Port Management** - Check port availability before starting
- ✅ **Quick Actions** - Open folder, open terminal, start/stop projects
- ✅ **Status Indicators** - See which projects are running
- ✅ **Minimize to Tray** - Keep it running in the background
- ✅ **Auto-save** - Projects are saved automatically

## Installation

1. Install dependencies:
```bash
cd apps/project-launcher
npm install
```

2. Run the app:
```bash
npm start
```

3. Build for production:
```bash
npm run build
```

## Usage

### Adding a Project

1. Click "Add Project"
2. Fill in:
   - **Name**: Project name
   - **Path**: Full path to project folder
   - **Description**: Optional description
   - **Database**: Enable if project needs a database
     - Select database type
     - Set port number
     - For custom: Enter start command

### Starting a Project

1. Click "Start" on a project
2. The app will:
   - Start the database (if configured)
   - Open the project folder (if enabled)
   - Show running status

### Database Types

- **Supabase**: Runs `npx supabase start`
- **PostgreSQL**: Starts PostgreSQL on specified port
- **MongoDB**: Starts MongoDB on specified port
- **Custom**: Run any command you specify

## Project Structure

```
project-launcher/
├── main.js          # Electron main process
├── preload.js       # Preload script
├── renderer.js      # Frontend logic
├── index.html       # UI
├── package.json     # Dependencies
└── README.md        # This file
```

## Configuration

Projects are stored in Electron's user data directory:
- **Windows**: `%APPDATA%\project-launcher\config.json`
- **macOS**: `~/Library/Application Support/project-launcher/config.json`
- **Linux**: `~/.config/project-launcher/config.json`

## Tips

- Projects can be minimized to system tray
- Port conflicts are automatically detected
- Database processes are tracked and can be stopped
- All projects are saved automatically

## Troubleshooting

**Port already in use?**
- Check if another instance is running
- Change the port in project settings

**Database won't start?**
- Verify the database command is correct
- Check project path is valid
- Ensure required dependencies are installed

**Project folder won't open?**
- Verify the path is correct
- Check file permissions

