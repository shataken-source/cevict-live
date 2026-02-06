# ⚡ Quick Fix for Installation

## The Problem
```
npm error Unsupported URL Type "workspace:": workspace:*
```

Your monorepo uses **pnpm workspaces**, but npm doesn't understand it.

## ✅ EASIEST FIX: Use pnpm

```bash
cd C:\gcc\cevict-app\cevict-monorepo\apps\project-launcher
pnpm install
pnpm start
```

**That's it!** Since you're already using pnpm, just use it here too.

## Alternative: Use the Install Script

Double-click `install.bat` in the project-launcher folder.

Or run:
```bash
cd C:\gcc\cevict-app\cevict-monorepo\apps\project-launcher
install.bat
```

This script will:
1. Try pnpm first (if available)
2. Fall back to npm with proper flags
3. Install all dependencies correctly

## Manual npm Install (if needed)

```bash
cd C:\gcc\cevict-app\cevict-monorepo\apps\project-launcher

npm install electron@28.0.0 --save-dev --legacy-peer-deps --no-workspaces
npm install electron-store@8.1.0 --save --legacy-peer-deps --no-workspaces
npm install electron-builder@24.9.1 --save-dev --legacy-peer-deps --no-workspaces
```

---

**Recommended**: Just use `pnpm install` - it's the easiest! 🚀

