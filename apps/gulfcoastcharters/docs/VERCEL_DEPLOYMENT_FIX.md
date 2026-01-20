# Vercel Deployment Fix Guide

## Problem
npm peer dependency conflicts during `npm install` on Vercel

## Solutions Applied

### 1. Updated .npmrc
```
legacy-peer-deps=true
auto-install-peers=true
engine-strict=false
```

### 2. Updated vercel.json
Added explicit `installCommand`:
```json
"installCommand": "npm install --legacy-peer-deps"
```

### 3. Manual Vercel Dashboard Settings

If the error persists, configure in Vercel Dashboard:

**Project Settings → General → Build & Development Settings**

1. **Install Command**: 
   ```
   npm install --legacy-peer-deps
   ```

2. **Build Command**:
   ```
   npm run build
   ```

3. **Output Directory**:
   ```
   dist
   ```

4. **Node.js Version**: 
   - Set to `18.x` or `20.x`

### 4. Environment Variables (Optional)

Add in Vercel Dashboard → Settings → Environment Variables:

- `NPM_FLAGS` = `--legacy-peer-deps`
- `NODE_VERSION` = `18`

### 5. Alternative: Use pnpm or yarn

In vercel.json, change to:
```json
"installCommand": "pnpm install"
```
or
```json
"installCommand": "yarn install"
```

## Verification Steps

1. Push changes to Git
2. Trigger new deployment on Vercel
3. Check build logs for successful install
4. If still failing, manually set install command in Vercel Dashboard

## Common Causes

- React 18 peer dependency conflicts with Radix UI
- Multiple versions of React in dependency tree
- Conflicting TypeScript versions
- ESLint plugin version mismatches

## Quick Fix Command

Run locally to test:
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

If this works locally, deployment should work with updated configs.
