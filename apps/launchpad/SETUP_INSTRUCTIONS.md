# 🚀 Project Launcher - Setup Instructions

## The Problem

Your monorepo uses `pnpm` workspaces, but npm doesn't understand the `workspace:*` protocol.

## Solution: Use pnpm (Easiest)

Since you're already using pnpm in the monorepo:

```bash
cd apps/project-launcher
pnpm install
pnpm start
```

## Alternative: Standalone Installation

If you want to install it standalone (not part of the monorepo):

1. **Copy the standalone package.json:**
   ```bash
   cd apps/project-launcher
   copy package-standalone.json package.json
   ```

2. **Install with npm:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Run:**
   ```bash
   npm start
   ```

## Quick Install Script

On Windows, use the install script:

```bash
cd apps/project-launcher
install.bat
```

This will install all dependencies properly.

## What You Need

The app needs:
- **electron** (desktop framework)
- **electron-store** (data storage)
- **electron-builder** (for building installers)

All can be installed with:
```bash
npm install electron electron-store electron-builder --legacy-peer-deps
```

---

**Recommended**: Just use `pnpm install` since you're already using pnpm! 🚀

