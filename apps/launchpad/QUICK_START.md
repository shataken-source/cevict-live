# 🚀 Quick Start Guide

## First Time Setup

1. **Install Dependencies**
   ```bash
   cd apps/project-launcher
   npm install
   ```

2. **Run the App**
   ```bash
   npm start
   ```
   Or double-click `start.bat` on Windows

## Adding Your First Project

1. Click **"+ Add Project"** button
2. Fill in:
   - **Name**: `Progno` (or whatever you want)
   - **Path**: `C:\gcc\cevict-app\cevict-monorepo\apps\progno`
   - **Description**: `ML predictions and bot academy`
   - **Enable Database**: Check this
   - **Database Type**: Select `Supabase` (or your DB type)
   - **Port**: `54321` (or your Supabase port)
3. Click **"Save Project"**

## Starting a Project

1. Click **"Start"** on any project
2. The app will:
   - ✅ Start the database on the correct port
   - ✅ Open the project folder
   - ✅ Show running status

## Features

### Quick Actions
- **Start/Stop**: One-click project control
- **📁 Open Folder**: Opens project in file explorer
- **💻 Open Terminal**: Opens terminal in project folder
- **✏️ Edit**: Modify project settings

### Database Support
- **Supabase**: Auto-starts with `npx supabase start`
- **PostgreSQL**: Starts on specified port
- **MongoDB**: Starts on specified port
- **Custom**: Run any command

### Status Monitoring
- Green dot = Running
- Gray dot = Stopped
- Port conflict detection

## Tips

- **Minimize**: App stays in system tray when minimized
- **Port Conflicts**: App checks ports before starting
- **Auto-save**: All changes saved automatically
- **Multiple Projects**: Manage unlimited projects

## Example Projects

### Progno
- Path: `C:\gcc\cevict-app\cevict-monorepo\apps\progno`
- Database: Supabase on port 54321

### CEVICT
- Path: `C:\gcc\cevict-app\cevict-monorepo\apps\cevict`
- Database: Supabase on port 54322

### Any Project
- Path: Your project path
- Database: Configure as needed

## Troubleshooting

**App won't start?**
- Make sure Node.js is installed
- Run `npm install` first

**Database won't start?**
- Check the port isn't already in use
- Verify the database command is correct
- Check project path is valid

**Port conflicts?**
- Change the port in project settings
- Stop other services using that port

