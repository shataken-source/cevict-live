# NextTV Viewer - Quick Start Commands

## FASTEST WAY TO TEST (Copy & Paste)

```powershell
# Step 1: Install dependencies (takes 2-5 minutes)
npm install

# Step 2: Run on Android (requires Android Studio or device)
npm run android
```

That's it! The app will launch with all three playlists loaded.

---

## Prerequisites Check

Before running, verify you have:

```powershell
# Check Node.js (need v18+)
node --version

# Check npm
npm --version

# Check Android setup (optional)
adb devices
```

---

## Step-by-Step Setup

### 1. Install Dependencies

```powershell
cd C:\cevict-live\apps\IPTVviewer
npm install
```

**What it installs:**
- React Native framework
- TypeScript compiler
- Video player (react-native-video)
- Navigation library
- State management (Zustand)
- All UI components

**Expected output:**
```
added 1234 packages in 2m
✓ Dependencies installed
```

### 2. Run on Android

**Option A: Let script handle everything**
```powershell
npm run android
```

**Option B: Manual control**
```powershell
# Terminal 1: Start Metro bundler
npm start

# Terminal 2: Run Android
npm run android
```

---

## Alternative: Use Setup Script

```powershell
# Run automated setup script
.\setup.ps1

# Then follow on-screen instructions
```

---

## What Happens on First Run

1. **Metro bundler starts** (JavaScript bundler)
2. **Gradle builds Android app** (30-60 seconds first time)
3. **App installs to device/emulator**
4. **App launches** → "NextTV Viewer" appears
5. **Playlists load** (10-20 seconds):
   - Sample Channels (instant)
   - Link4TV IPTV (5-10 seconds)
   - Dezor IPTV (5-10 seconds)
6. **Ready to test!**

---

## Testing Checklist

Once app launches:

- [ ] Browse channel list (should see 100+ channels)
- [ ] Tap any channel → Video plays
- [ ] Tap screen → Controls appear
- [ ] Tap "Previous" → Returns to last channel
- [ ] Tap ★ → Channel added to favorites
- [ ] Tap "Favorites" filter → Shows starred channels
- [ ] Open Settings → See 3 playlists loaded
- [ ] Test search → Type channel name
- [ ] Toggle "AD Block" in player
- [ ] Check VPN section in Settings

---

## Troubleshooting

### "npm install" fails

```powershell
# Clear and retry
rm -r node_modules
rm package-lock.json
npm install --legacy-peer-deps
```

### "Android SDK not found"

1. Install Android Studio: https://developer.android.com/studio
2. Open SDK Manager → Install Android SDK
3. Restart terminal

### App crashes on launch

```powershell
# Clear app data and reinstall
adb shell pm clear com.nexttv.viewer
npm run android
```

### Video doesn't play

- Check internet connection
- Try different channel
- Some test streams may be offline
- Real channels (Link4TV/Dezor) should work

---

## Quick Commands Reference

```powershell
# Install
npm install

# Run Android
npm run android

# Start Metro only
npm start

# Clear cache
npm start -- --reset-cache

# Check connected devices
adb devices

# View logs
adb logcat | Select-String "ReactNative"

# Kill Metro
taskkill /F /IM node.exe

# Uninstall app
adb uninstall com.nexttv.viewer
```

---

## Development Mode Features

When running in dev mode:
- Hot reload enabled (saves trigger reload)
- Dev menu: Shake device or Ctrl+M
- Performance monitor available
- Console logs visible in Metro terminal

---

## Expected Performance

- **Build time (first):** 30-60 seconds
- **Build time (subsequent):** 10-20 seconds
- **App launch:** 2-5 seconds
- **Playlist loading:** 10-20 seconds
- **Channel switching:** <1 second
- **Video playback:** Smooth, no buffering

---

## Next Steps

After successful testing:

1. **Test all features** (see TESTING.md)
2. **Try on real Android TV** (for remote control)
3. **Build release APK** (see below)
4. **Install on your TV** (see TV_INSTALLATION.md)
5. **Add custom modules** (see MODULE_DEVELOPMENT.md)

### Building Release APK for TV

```powershell
# Navigate to android folder
cd android

# Build release APK
.\gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release.apk

# Go back
cd ..
```

### Installing on TV

See **TV_INSTALLATION.md** for detailed instructions on:
- USB installation
- Wireless ADB installation  
- Fire TV sideloading
- Google Play Store publishing

---

## Help & Documentation

- **INSTALL_AND_RUN.md** - Detailed setup guide
- **TESTING.md** - Complete testing instructions
- **FEATURES.md** - All features explained
- **DEVELOPMENT.md** - Architecture and dev guide
- **IPTV_SERVICES.md** - IPTV credentials guide

---

## Support

If you encounter issues:
1. Check error messages in Metro terminal
2. Review `adb logcat` output
3. Verify prerequisites are installed
4. Try clearing cache: `npm start -- --reset-cache`

Ready? Run `npm install` then `npm run android`! 🚀
