# IPTV Viewer EAS Build Solutions

## Problem Summary
EAS builds fail with monorepo extraction errors:
- Uploads 171 MB (entire repo instead of just IPTVviewer)
- Build server fails to extract with "permission denied" errors
- `.easignore` not working as expected with EAS CLI

## Solution Options

### Option 1: GitHub Actions (Recommended)
**File**: `.github/workflows/eas-build.yml` (already created)

**Setup:**
1. Add `EXPO_TOKEN` to GitHub repo secrets:
   - Go to expo.dev/settings/access-tokens
   - Create new token
   - Add to GitHub: Settings > Secrets > Actions > New secret

2. Push changes to trigger build:
   ```bash
   git add -A
   git commit -m "Ready for EAS build"
   git push origin main
   ```

3. Monitor at: https://github.com/[user]/[repo]/actions

**Why this works:** Runs in clean Ubuntu environment without monorepo issues.

---

### Option 2: Local Android Build (No EAS)
**Prerequisites:** Android Studio, JDK 17, Android SDK

```powershell
# In apps/IPTVviewer/
npm install
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

**Output:** `android/app/build/outputs/apk/release/app-release.apk`

---

### Option 3: Project Restructure
Move IPTVviewer to standalone repo:

```powershell
# Create new repo structure
mkdir C:\iptvviewer-build
cd C:\iptvviewer-build
git init

# Copy only IPTVviewer files
robocopy C:\cevict-live\apps\IPTVviewer . /E /XD node_modules .expo android ios build .git

# Setup fresh
npm install
eas build --platform android --profile preview
```

---

### Option 4: EAS Workflows (Expo's New CI/CD)
**File**: `.eas/workflows/build.yml`

```yaml
name: Build Android
on:
  push:
    branches: [main]
jobs:
  build:
    name: Build
    type: build
    params:
      platform: android
      profile: preview
```

**Trigger:** `eas workflow:run build`

---

## Quick Fix Attempt

Try one more direct build with explicit path:

```powershell
cd C:\cevict-live\apps\IPTVviewer

# Clean everything
Remove-Item -Path "$env:TEMP\eas-cli-nodejs" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".\node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".\.expo" -Recurse -Force -ErrorAction SilentlyContinue

# Fresh install
npm install

# Build with verbose logging
eas build --platform android --profile preview --non-interactive --verbose
```

---

## Current Status

**Created:**
- ✅ `.github/workflows/eas-build.yml` - GitHub Actions workflow
- ✅ `scripts/build-standalone.ps1` - Standalone build script
- ✅ `scripts/build-standalone.sh` - Linux/Mac build script
- ✅ `.easignore` at repo root with comprehensive exclusions
- ✅ Updated `eas.json` with proper build profiles

**TypeScript Errors:** Fixed (0 errors with `npx tsc --noEmit`)

---

## Recommendation

**Use GitHub Actions (Option 1)** - Most reliable for this monorepo structure.

1. Add `EXPO_TOKEN` secret
2. Push to main branch
3. Build runs automatically in clean environment

Alternative: **Option 2 (Local Build)** for immediate APK without EAS complexity.
