# 🔧 Fix Installation Error

## The Error

```
npm error Unsupported URL Type "workspace:": workspace:*
```

This happens because your monorepo uses **pnpm workspaces**, but you're trying to use **npm**.

## ✅ Solution: Use pnpm

Since you're already using pnpm in the monorepo, just use pnpm:

```bash
cd C:\gcc\cevict-app\cevict-monorepo\apps\project-launcher
pnpm install
pnpm start
```

## Alternative: Standalone Install

If you want to use npm, you need to install packages directly:

```bash
cd C:\gcc\cevict-app\cevict-monorepo\apps\project-launcher

# Install packages directly (bypasses workspace)
npm install electron@28.0.0 --save-dev --legacy-peer-deps
npm install electron-store@8.1.0 --save --legacy-peer-deps
npm install electron-builder@24.9.1 --save-dev --legacy-peer-deps
```

Then run:
```bash
npm start
```

## Quick Fix Script

I've created `install.bat` - just double-click it or run:

```bash
cd C:\gcc\cevict-app\cevict-monorepo\apps\project-launcher
install.bat
```

---

**Easiest**: Just use `pnpm install` since you're already using pnpm! 🚀

