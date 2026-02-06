# NextTV Viewer - Installation & Testing Guide (Windows)

## Prerequisites

### Required Software

1. **Node.js (v18 or higher)**
   - Download: https://nodejs.org/
   - Verify: `node --version` (should show v18+)
   - Verify npm: `npm --version`

2. **Android Studio** (for Android testing)
   - Download: https://developer.android.com/studio
   - Install Android SDK
   - Install Android Emulator or connect physical device

3. **Git** (optional, for version control)
   - Download: https://git-scm.com/downloads

### Optional (for better development experience)

- **VS Code** - Recommended code editor
- **React Native Debugger** - For debugging
- **Scrcpy** - For Android device mirroring

---

## Installation Steps

### 1. Install Dependencies

Open PowerShell in the project directory (`C:\cevict-live\apps\IPTVviewer`):

> **Important Note:** If you encounter an error about `react-native-tvos` not found, this is expected. The package has been removed from `package.json` as it's Apple TV specific and not available via npm. The app works perfectly with standard `react-native` on Android devices.

```powershell
# Install all npm packages
npm install

# This will install:
# - React Native
# - TypeScript
# - All UI libraries
# - Navigation
# - Video player
# - State management (Zustand)
```

**Expected output:**
```
added 1234 packages in 2m
```

**If you see "ETARGET No matching version for react-native-tvos":**
This has already been fixed in the latest `package.json`. Simply run `npm install` again.

### 2. Install Additional Dependencies (if needed)

```powershell
# Install missing peer dependencies (if any warnings appear)
npm install --legacy-peer-deps
```

---

## Running on Android Emulator (Easiest)

### Option 1: Start Android Emulator First

1. **Open Android Studio**
2. **Device Manager** → Create/start an emulator
3. **Recommended specs:**
   - Device: Pixel 4 or TV device
   - API Level: 30+ (Android 11+)
   - RAM: 2GB minimum

4. **Run the app:**
```powershell
npm run android
```

### Option 2: Let React Native Start Emulator

```powershell
# Will auto-start emulator if available
npm run android
```

---

## Running on Physical Android Device

### 1. Enable USB Debugging

**On your Android device:**
1. Settings → About Phone
2. Tap "Build Number" 7 times (enables Developer Options)
3. Settings → Developer Options
4. Enable "USB Debugging"
5. Enable "Install via USB"

### 2. Connect Device

```powershell
# Check device is connected
adb devices

# Expected output:
# List of devices attached
# ABC123XYZ    device
```

### 3. Run the App

```powershell
npm run android
```

---

## Running on Windows (Web Browser - Development Only)

**Note:** React Native TV features won't work in browser, but you can test basic UI.

### Install Web Dependencies

```powershell
npm install react-native-web react-dom
```

### Start Metro Bundler

```powershell
npm start
```

Press `w` to open in web browser.

---

## Troubleshooting Installation

### Error: "Cannot find module"

```powershell
# Clear cache and reinstall
rm -r node_modules
rm package-lock.json
npm install
```

### Error: "Android SDK not found"

1. Open Android Studio
2. SDK Manager → Install Android SDK
3. Set environment variable:

```powershell
$env:ANDROID_HOME = "C:\Users\YourName\AppData\Local\Android\Sdk"
```

Add to PATH:
```powershell
$env:PATH += ";$env:ANDROID_HOME\platform-tools"
$env:PATH += ";$env:ANDROID_HOME\tools"
```

### Error: "Metro bundler failed to start"

```powershell
# Kill any running Metro instances
taskkill /F /IM node.exe

# Restart
npm start
```

### Error: "Build failed" or Gradle errors

```powershell
cd android
.\gradlew clean
cd ..
npm run android
```

---

## Testing the App

### 1. First Launch

When app starts:
- **Wait 10-20 seconds** for playlists to load
- You'll see three playlists loading:
  1. Sample Channels (instant)
  2. Link4TV IPTV (5-10 seconds)
  3. Dezor IPTV (5-10 seconds)

### 2. Browse Channels

- Scroll through channel list
- Tap any channel to watch
- Use search bar to find specific channels

### 3. Test Previous Channel

1. Play Channel 1 (e.g., "BBC One")
2. Go back to channel list
3. Play Channel 2 (e.g., "CNN")
4. **Tap "Previous" button** → Should return to BBC One
5. Or press Select/Enter on keyboard

### 4. Test Favorites

1. Tap ★ icon next to any channel
2. Tap "Favorites" filter
3. Should show only starred channels

### 5. Test Ad Detection

1. Play any channel
2. Look for **"AD Block: ON"** button (top-right)
3. Ad detection runs automatically
4. If "AD MUTED" badge appears, it detected a commercial

### 6. Test VPN (UI only)

1. Open Settings
2. Scroll to "VPN Settings"
3. Enter dummy server: `test.vpn.com`
4. Tap "Connect"
5. Should show "Connected" status

### 7. Test Settings

1. Open Settings (gear icon)
2. View all loaded playlists
3. Switch between playlists
4. Edit IPTV credentials
5. Toggle ad detection

---

## Keyboard Shortcuts (Desktop Testing)

| Key | Action |
|-----|--------|
| **Arrow Keys** | Navigate UI |
| **Enter** | Select / Previous Channel (in player) |
| **Esc** | Back |
| **Space** | Play/Pause |
| **+/-** | Volume |
| **M** | Mute |

---

## Development Commands

```powershell
# Start Metro bundler only
npm start

# Clear cache and start fresh
npm start --reset-cache

# Run Android with specific device
npm run android -- --deviceId=ABC123XYZ

# Run iOS (requires Mac)
npm run ios

# Type checking
npx tsc --noEmit

# Lint code
npm run lint

# Run tests (if configured)
npm test
```

---

## Performance Testing

### Check App Performance

1. **Launch time**: Should be under 5 seconds
2. **Playlist loading**: 10-20 seconds for all three
3. **Channel switching**: Under 1 second
4. **Video playback**: Smooth, no stuttering
5. **Memory usage**: Check in Android Studio Profiler

### Monitor Logs

```powershell
# View all logs
adb logcat

# Filter for app logs only
adb logcat | Select-String "ReactNative"

# Clear logs
adb logcat -c
```

---

## Building APK for Testing

### Debug APK (unsigned)

```powershell
cd android
.\gradlew assembleDebug
cd ..
```

**Output:**
`android/app/build/outputs/apk/debug/app-debug.apk`

### Install on Device

```powershell
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Common Issues & Solutions

### Video Not Playing

**Symptoms:** Black screen, no video
**Solution:**
- Check internet connection
- Try different channel
- Some test streams may be offline
- Use real IPTV channels (Link4TV/Dezor)

### App Crashes on Launch

**Symptoms:** App opens then immediately closes
**Solution:**
```powershell
# Clear app data on device
adb shell pm clear com.nexttv.viewer

# Reinstall
npm run android
```

### Remote Control Not Working

**Symptoms:** TV remote buttons don't respond
**Solution:**
- This is expected on laptop/phone
- TV remote only works on actual Android TV
- Use keyboard or touch screen instead

### Module Resolution Errors

**Symptoms:** "Cannot resolve module @/..."
**Solution:**
```powershell
# Clear Metro cache
npm start -- --reset-cache
```

---

## Next Steps After Testing

### If Everything Works:

1. **Build Release APK** (for production)
2. **Test on Android TV device** (for remote control)
3. **Deploy to Google Play Store** (if desired)
4. **Add more features** (see MODULE_DEVELOPMENT.md)

### If Issues Found:

1. Check error logs: `adb logcat`
2. Review stack traces
3. Test individual components
4. Check documentation files

---

## Quick Reference

### Start Testing (Full Flow)

```powershell
# 1. Install dependencies
npm install

# 2. Start Metro bundler in one terminal
npm start

# 3. In another terminal, run Android
npm run android

# 4. Wait for app to launch
# 5. Browse channels and test features
```

### Stop Everything

```powershell
# Stop Metro (Ctrl+C in Metro terminal)
# Or kill all node processes:
taskkill /F /IM node.exe

# Stop Android emulator (close window)
```

---

## Support Resources

### Documentation Files

- **README.md** - Project overview
- **QUICKSTART.md** - 5-minute setup
- **FEATURES.md** - Complete feature list
- **TESTING.md** - Detailed testing guide
- **DEVELOPMENT.md** - Architecture guide
- **VPN_AND_AD_DETECTION.md** - VPN & ad blocking guide
- **IPTV_SERVICES.md** - IPTV credential guide

### Useful Links

- React Native Docs: https://reactnative.dev/
- Android Studio: https://developer.android.com/studio
- ADB Commands: https://developer.android.com/studio/command-line/adb

---

## Testing Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Android emulator/device connected
- [ ] Metro bundler started (`npm start`)
- [ ] App launched (`npm run android`)
- [ ] Playlists loaded (wait 10-20 seconds)
- [ ] Channels playing
- [ ] Previous channel works
- [ ] Favorites work
- [ ] Search works
- [ ] Settings accessible
- [ ] VPN UI functional
- [ ] Ad detection toggle works
- [ ] Volume controls work

---

## Expected First Run

1. **Launch app** → See "NextTV Viewer" home screen
2. **Loading playlists** → Shows "Sample Channels" immediately
3. **Wait 10 seconds** → Link4TV and Dezor channels load
4. **Default playlist** → Dezor IPTV (hundreds of channels)
5. **Tap any channel** → Video starts playing
6. **Controls appear** → Auto-hide after 5 seconds
7. **Tap screen** → Controls reappear
8. **Tap Previous** → Returns to last channel

---

Ready to test! Start with `npm install` and then `npm run android`.
