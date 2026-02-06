# 🔧 Installation Fix

The monorepo uses pnpm workspaces, but the project launcher needs to be installed standalone.

## Option 1: Use pnpm (Recommended)

```bash
cd apps/project-launcher
pnpm install
```

## Option 2: Use npm with legacy peer deps

```bash
cd apps/project-launcher
npm install --legacy-peer-deps
```

## Option 3: Use the install script

On Windows, double-click `install.bat`

Or run:
```bash
cd apps/project-launcher
install.bat
```

## Option 4: Manual installation

```bash
cd apps/project-launcher

# Install each package separately
npm install electron@28.0.0 --save-dev --legacy-peer-deps
npm install electron-store@8.1.0 --save --legacy-peer-deps
npm install electron-builder@24.9.1 --save-dev --legacy-peer-deps
```

## After Installation

Run the app:
```bash
npm start
```

Or double-click `start.bat`

---

**Note**: The `--legacy-peer-deps` flag is needed because Electron has some peer dependency conflicts that npm handles differently than pnpm.

