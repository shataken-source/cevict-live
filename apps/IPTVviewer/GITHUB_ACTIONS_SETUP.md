# Switchback TV (IPTVviewer) — Build & Deployment Guide

> **For AI agents and developers.** This document describes how the Android APK
> build pipeline works, how to operate it, and how to fix it when things break.

---

## 1. Overview

| Field | Value |
|---|---|
| **App name** | Switchback TV |
| **Package** | `com.switchback.tv` |
| **Framework** | React Native 0.81.5 via Expo SDK 54 |
| **Source** | `apps/IPTVviewer/` inside the `cevict-live` monorepo |
| **Repo** | `https://github.com/shataken-source/cevict-live` |
| **Branches** | `master`, `gcc-vessels` (active development) |
| **Workflow file** | `.github/workflows/build-iptvviewer-apk.yml` |
| **Version** | 1.1.0 (versionCode 2) |
| **Artifact** | `switchback-tv-release.apk` (unsigned, 30-day retention) |
| **Build time** | ~20 minutes on GitHub Actions |

---

## 2. Build Pipeline Steps

The workflow (`Build Android APK (Switchback TV)`) runs on `ubuntu-latest` and
executes these steps in order:

1. **Checkout** — full repo checkout (no sparse-checkout)
2. **Node.js 22** — required by RN 0.81.5 and Metro 0.83.3 (minimum: >=20.19.4)
3. **Java 21 (Temurin)** — for Gradle 8.14.x compatibility
4. **Install dependencies** — deletes stale `package-lock.json`, runs
   `npm install --legacy-peer-deps` to handle transitive peer conflicts
5. **Verify install** — prints Node/npm versions and confirms RN + Reanimated
   installed correctly
6. **Expo prebuild** — `npx expo prebuild --platform android --clean` generates
   the native `android/` directory from `app.json` config
7. **Gradle build** — `./gradlew assembleRelease --no-daemon --stacktrace`
8. **Locate APK** — finds the built `.apk` in Gradle output and copies it to
   `switchback-tv-release.apk`
9. **Sign APK** *(optional)* — only runs if `ANDROID_KEYSTORE_BASE64` secret is
   configured
10. **Upload artifact** — uploads `switchback-tv-release.apk` to GitHub Actions
    artifacts

---

## 3. How to Trigger a Build

### Automatic
Any push to `master` or `gcc-vessels` triggers the workflow.

### Manual
1. Go to **https://github.com/shataken-source/cevict-live/actions**
2. Click **"Build Android APK (Switchback TV)"** in the left sidebar
3. Click **"Run workflow"** dropdown (top right)
4. Select branch → click **"Run workflow"**

### Download the APK
1. Go to the **Actions** tab
2. Click the green ✅ completed run
3. Scroll to the **Artifacts** section at the bottom
4. Click **switchback-tv-release** to download the zip containing the APK

---

## 4. Version Constraints (CRITICAL)

These versions are tightly coupled. Changing one without the others **will break
the build**.

| Dependency | Version | Why |
|---|---|---|
| `expo` | ^54.0.33 | SDK version — all other Expo packages must match |
| `react` | 19.1.0 | Expo 54 requires React 19 |
| `react-native` | 0.81.5 | Expo 54 requires RN 0.81.x |
| `react-native-reanimated` | ~4.1.1 | RN 0.81 compatible version |
| `react-native-worklets` | ~0.7.4 | **Required peer dep** of reanimated 4.x |
| `react-native-screens` | ~4.16.0 | RN 0.81 compatible |
| `react-native-safe-area-context` | ~5.6.0 | RN 0.81 compatible |
| `react-native-gesture-handler` | ~2.28.0 | RN 0.81 compatible |
| `@types/react` | ~19.1.0 | Must match React 19 |
| Node.js | 22 | RN 0.81.5 + Metro 0.83.3 require >=20.19.4 |
| Java | 21 (Temurin) | Gradle 8.14.x compatibility |

### How to upgrade safely

```bash
cd apps/IPTVviewer
# 1. Update expo version in package.json
# 2. Run:
npx expo install --fix
# 3. Check for missing peer deps (e.g., react-native-worklets)
# 4. Delete package-lock.json (it will regenerate)
# 5. Push to trigger build
```

---

## 5. Required Asset Files

Expo prebuild reads `app.json` which references these files. If any are missing,
prebuild fails.

| File | Purpose |
|---|---|
| `assets/icon.png` | App icon |
| `assets/adaptive-icon.png` | Android adaptive icon foreground |
| `assets/splash.png` | Splash screen |
| `assets/favicon.png` | Web favicon |

These are currently 1x1 pixel placeholders. Replace with real assets when
branding is finalized.

---

## 6. Code Signing (Optional)

The APK is **unsigned** by default (debug-signed). For Play Store or
side-loading without security warnings, configure signing:

### Generate a keystore

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore release.keystore -alias switchback-tv \
  -keyalg RSA -keysize 2048 -validity 10000
```

### Add GitHub Secrets

Go to repo **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded keystore file |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_ALIAS` | `switchback-tv` |
| `KEY_PASSWORD` | Key password |

```bash
# Encode keystore to base64 (Windows)
certutil -encode release.keystore release.keystore.b64

# Encode keystore to base64 (Linux/Mac)
base64 -i release.keystore -o release.keystore.b64
```

When these secrets exist, the workflow automatically signs and zipaligns the APK.

---

## 7. Troubleshooting

### `npm ci` / `npm install` fails with ERESOLVE

**Cause:** Peer dependency conflicts between Expo packages and RN.
**Fix:** The workflow uses `--legacy-peer-deps`. If it still fails, check that
all versions in `package.json` match the table in Section 4. Run
`npx expo install --fix` locally to auto-align versions.

### `package-lock.json` out of sync

**Cause:** `package-lock.json` was committed with old dependency versions.
**Fix:** Delete it from git: `git rm apps/IPTVviewer/package-lock.json`. The
workflow deletes it before install anyway (`rm -f package-lock.json`).

### Gradle `serviceOf` or `extensions` unresolved reference

**Cause:** Gradle version incompatible with the React Native gradle plugin.
**Fix:** This means the RN version and Expo version are mismatched. Ensure
`react-native` in `package.json` matches what Expo expects (see Section 4).

### `react-native-reanimated` Node process exit code 1

**Cause:** Missing `react-native-worklets` dependency (required by reanimated
4.x) or corrupted `node_modules`.
**Fix:** Ensure `react-native-worklets` is in `package.json` dependencies. The
workflow deletes `package-lock.json` and does a fresh install each time.

### Metro / Node version errors (`EBADENGINE`)

**Cause:** Node.js version too old. RN 0.81.5 and Metro 0.83.3 require
Node >= 20.19.4.
**Fix:** The workflow uses Node 22. If upgrading RN further, check Metro's
engine requirements.

### Expo prebuild fails on missing assets

**Cause:** `icon.png`, `splash.png`, `adaptive-icon.png`, or `favicon.png`
missing from `assets/` directory.
**Fix:** Ensure all four files exist and are committed to git. Even 1x1 pixel
PNGs work as placeholders.

### APK not found at upload step

**Cause:** Gradle output path changed or glob pattern didn't match.
**Fix:** The "Locate APK" step uses `find` to locate the APK dynamically. If it
still fails, check the Gradle build output for the actual APK path.

### Build takes >30 minutes

**Typical build:** ~20 minutes (npm install ~3 min, prebuild ~1 min, Gradle
~15 min).
**If slow:** Gradle is downloading dependencies. This is normal for the first
build. GitHub Actions has a 6-hour timeout.

---

## 8. Project Structure

```
apps/IPTVviewer/
├── App.tsx                  # Entry point + typed RootStackParamList navigator
├── app.json                 # Expo config (name, package, icons, plugins)
├── package.json             # Dependencies (Expo 54 + RN 0.81.5)
├── tsconfig.json            # TypeScript config
├── babel.config.js          # Babel config with module-resolver
├── assets/                  # Icon, splash, adaptive-icon, favicon
├── src/
│   ├── screens/             # 15 screens (see list below)
│   ├── services/            # 38 service modules
│   ├── store/               # Zustand global state (useStore.ts)
│   ├── components/          # Shared components (EPG widgets)
│   ├── config/              # Feature flags
│   ├── types/               # TypeScript interfaces (Channel, Playlist, etc.)
│   └── navigation/          # React Navigation stack config
└── docs/                    # Error logs and documentation
```

### Screens (15)

| Screen | File | Route Name | Params |
|---|---|---|---|
| TV Home | `TVHomeScreen.tsx` | `TVHome` | — |
| Channels | `ChannelsScreen.tsx` | `Channels` | — |
| Movies | `MoviesScreen.tsx` | `Movies` | — |
| Series | `SeriesScreen.tsx` | `Series` | — |
| Player | `PlayerScreen.tsx` | `Player` | `{ channel, fromChannel? }` |
| EPG | `EPGScreen.tsx` | `EPG` | — |
| Favorites | `FavoritesScreen.tsx` | `Favorites` | — |
| History | `ChannelHistoryScreen.tsx` | `History` | — |
| Settings | `SettingsScreen.tsx` | `Settings` | — |
| Pricing | `PricingScreen.tsx` | `Pricing` | — |
| Catch-Up | `CatchUpScreen.tsx` | `CatchUp` | `{ channel }` |
| Recordings | `RecordingsScreen.tsx` | `Recordings` | — |
| Quality Settings | `QualitySettingsScreen.tsx` | `QualitySettings` | — |
| Devices | `DevicesScreen.tsx` | `Devices` | — |
| Home (legacy) | `HomeScreen.tsx` | — | Not in navigator |

---

## 9. Related Apps

| App | Location | Package | Type |
|---|---|---|---|
| **Switchback TV** | `apps/IPTVviewer/` | `com.switchback.tv` | React Native / Expo — full-featured IPTV app |
| **Switchback Lite** | `apps/SwitchbackSimple/` | `com.switchback.lite` | Native Android WebView — lightweight, no RN deps |

The two apps have **separate package names** and can be installed side-by-side on
the same device. They appear as distinct apps on the TV launcher:
- **Switchback TV** — pink play-button icon
- **Switchback Lite** — cyan play-button icon

---

## 10. Quick Reference Commands

```bash
# Trigger a build manually (from GitHub UI)
# Actions → Build Android APK (Switchback TV) → Run workflow

# Push code to trigger automatic build
git add . && git commit -m "your message" && git push origin gcc-vessels

# Check dependency alignment locally
cd apps/IPTVviewer
npx expo install --fix
npx expo-doctor

# Generate native project locally (for debugging)
npx expo prebuild --platform android --clean

# Build locally (requires Android SDK + Java 21)
cd android && ./gradlew assembleRelease
```
