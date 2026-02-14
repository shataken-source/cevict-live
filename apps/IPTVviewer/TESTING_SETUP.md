# Google Play Console Test Track Setup Guide

## Overview
You can create a **Closed Testing** track to share with testers before public release.

## Steps to Set Up Testing Track:

### 1. Create Closed Testing Track
1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app (or select existing)
3. Go to **Testing** > **Closed testing**
4. Click **Create new release**
5. Upload your .aab file (from `android/app/build/outputs/bundle/release/`)

### 2. Add Testers
1. In Closed testing, go to **Testers** tab
2. Create a **Testing list** (e.g., "Friends & Family")
3. Add tester emails (max 100 for closed testing)
4. Copy the **Opt-in URL** to share with testers

### 3. Testers Join
1. Testers click your Opt-in link
2. They join the testing program
3. They download from Play Store (will show "Testing version")

## Alternative: Internal Testing (Faster)
- Go to **Testing** > **Internal testing**
- Add up to 100 test accounts
- Fastest approval (usually minutes vs hours for closed testing)

## Before You Can Upload:
1. **App Content Rating**: Complete questionnaire (Play Console > Content rating)
2. **Privacy Policy**: Create one at switchback.tv/privacy
3. **Target Audience**: Declare if for kids/families
4. **App Category**: Entertainment > Video Players & Editors

## Troubleshooting App Load Issues:

### Common Problems:
1. **Metro bundler not running**
   ```bash
   npm start
   # or
   npx react-native start
   ```

2. **Android emulator not running**
   ```bash
   # Check if device is connected
   adb devices

   # Start emulator
   npx react-native run-android
   ```

3. **Missing dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

4. **Build errors**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npx react-native run-android
   ```

### Quick Test Command:
```bash
npm run android
```

## Your Testing Opt-in URL Format:
```
https://play.google.com/apps/test/com.switchback.tv/PACKAGE_ID
```

Replace `PACKAGE_ID` with your actual package name (default: `com.nexttv.viewer`, should update to `com.switchback.tv`)
