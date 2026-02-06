# 📦 Installation Instructions

## Step 1: Install Dependencies

```bash
cd apps/project-launcher
npm install
```

This will install:
- Electron (desktop app framework)
- electron-store (project storage)
- electron-builder (for building installers)

## Step 2: Run the App

```bash
npm start
```

Or on Windows, double-click `start.bat`

## Step 3: Add Your Projects

1. Click **"+ Add Project"**
2. Fill in project details
3. Configure database if needed
4. Click **"Save Project"**

## Step 4: Start Using It!

- Click **"Start"** on any project
- App will start database and open folder
- Minimize to system tray when not needed

## Building for Distribution

To create an installer:

```bash
npm run build
```

This creates:
- **Windows**: `.exe` installer in `dist/`
- **Mac**: `.dmg` file
- **Linux**: `.AppImage`

## Notes

- Projects are auto-saved
- App can be minimized to tray
- All database processes are tracked
- Port conflicts are automatically detected

---

**That's it!** You're ready to launch projects! 🚀

