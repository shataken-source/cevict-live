# 🚀 READY TO TEST - Start Here!

You're ready to test NextTV Viewer on your Windows laptop!

---

## ⚡ FASTEST START (3 Commands)

> **⚠️ Important:** The `package.json` has been updated to remove `react-native-tvos` (Apple TV specific). If you previously saw an error about this package, it's now fixed. Just run `npm install`.

```powershell
# 1. Install dependencies
npm install

# 2. Run on Android
npm run android

# 3. Wait for app to launch (30-60 seconds first time)
```

**That's it!** The app will open with 100+ channels ready to watch.

---

## 📋 What You Need

### ✅ Already Have
- ✅ Node.js (should be installed)
- ✅ Project files (in `C:\cevict-live\apps\IPTVviewer`)
- ✅ Three IPTV services configured:
  - Sample Channels (30+)
  - Link4TV IPTV (100+)
  - Dezor IPTV (100+)

### 📦 Need to Install
- **Android Studio** (for Android testing)
  - Download: https://developer.android.com/studio
  - Or use Android device with USB debugging

---

## 🎯 Two Ways to Run

### Option 1: Automated Setup (Easiest)

**Windows Batch File:**
```cmd
setup.bat
```
Double-click `setup.bat` in File Explorer, follow prompts.

**PowerShell Script:**
```powershell
.\setup.ps1
```

### Option 2: Manual Commands

```powershell
# Open PowerShell in project folder
cd C:\cevict-live\apps\IPTVviewer

# Install
npm install

# Run
npm run android
```

---

## 📱 Testing Options

### 1. Android Emulator (Recommended for First Test)
- Install Android Studio
- Create emulator (Pixel 4, Android 11+)
- Start emulator
- Run: `npm run android`

### 2. Physical Android Device
- Enable USB Debugging on device
- Connect via USB
- Run: `npm run android`

### 3. Android TV Device (Best Experience)
- Connect via ADB over network
- Get IP: Device Settings → About → Status → IP
- Connect: `adb connect 192.168.1.XXX:5555`
- Run: `npm run android`

---

## ⏱️ What to Expect

### First Time Setup
- **npm install**: 2-5 minutes
- **First build**: 30-60 seconds
- **App launch**: 2-5 seconds
- **Playlists loading**: 10-20 seconds
- **Total**: ~5 minutes

### Subsequent Runs
- **Build**: 10-20 seconds
- **Everything else**: Same
- **Total**: ~30 seconds

---

## ✨ What You'll See

### On Launch
1. **"NextTV Viewer" home screen**
2. **Sample Channels load** (instant)
3. **Link4TV channels load** (5-10 seconds)
4. **Dezor channels load** (5-10 seconds)
5. **Default: Dezor IPTV** (100+ channels)

### Features to Test
- ✅ Browse channels
- ✅ Play videos
- ✅ Previous channel button
- ✅ Favorites (tap ★)
- ✅ Search channels
- ✅ Switch playlists (Settings)
- ✅ VPN UI (Settings)
- ✅ Ad detection toggle
- ✅ Volume controls

---

## 🎮 Controls

### Keyboard (Desktop Testing)
- **Arrow Keys**: Navigate
- **Enter**: Select / Previous Channel
- **Esc**: Back
- **Space**: Play/Pause
- **M**: Mute
- **+/-**: Volume

### Touch/Mouse
- **Tap/Click**: Select channel
- **Tap screen**: Show/hide controls
- **Tap buttons**: Use on-screen controls

### TV Remote (Android TV Only)
- **D-pad**: Navigate
- **Select/Enter**: Previous channel
- **Back**: Return to list
- **Volume**: Adjust volume

---

## 🐛 Troubleshooting

### "Command not found: npm"
→ Install Node.js: https://nodejs.org/

### "Android SDK not found"
→ Install Android Studio: https://developer.android.com/studio

### "No devices found"
→ Connect device or start emulator:
```powershell
adb devices
```

### App crashes immediately
→ Clear and reinstall:
```powershell
adb shell pm clear com.nexttv.viewer
npm run android
```

### Video not playing
→ Check internet connection or try different channel

---

## 📚 Documentation

Quick reference files:

| File | Purpose |
|------|---------|
| **QUICK_COMMANDS.md** | Command reference |
| **INSTALL_AND_RUN.md** | Detailed setup guide |
| **TESTING.md** | Testing instructions |
| **FEATURES.md** | Complete feature list |
| **IPTV_SERVICES.md** | IPTV credentials info |
| **VPN_AND_AD_DETECTION.md** | VPN & ad blocking guide |

---

## 🎉 Success Criteria

You'll know it's working when:

- ✅ App launches without crashing
- ✅ See 100+ channels in list
- ✅ Tap channel → video plays
- ✅ "Previous" button appears
- ✅ Favorites work
- ✅ Settings accessible
- ✅ Three playlists visible in Settings

---

## 🚀 Let's Go!

### Quick Start (Copy-Paste)

```powershell
# Open PowerShell in project folder
cd C:\cevict-live\apps\IPTVviewer

# Install and run
npm install ; npm run android
```

Or just double-click **`setup.bat`** in File Explorer!

---

## 💡 Pro Tips

1. **First time?** Use Android emulator for easiest testing
2. **Have Android TV?** Connect via ADB for full experience
3. **Want to modify code?** Use VS Code with React Native extension
4. **Hit an error?** Check Metro terminal for error messages
5. **Need help?** See INSTALL_AND_RUN.md for detailed troubleshooting

---

## 📞 What's Next?

After successful test:

1. ✅ Browse all channels
2. ✅ Test all features
3. ✅ Try VPN connection
4. ✅ Toggle ad detection
5. ✅ Customize settings
6. ✅ **Install on your TV** (see TV_INSTALLATION.md)
7. ✅ Build release APK (optional)
8. ✅ Deploy to Android TV (optional)

### 📺 Ready to Install on Your TV?

See **TV_INSTALLATION.md** for complete instructions on:
- Installing via USB drive
- Installing via ADB (wireless)
- Fire TV installation
- Google Play Store publishing
- Troubleshooting TV-specific issues

---

## 🎯 Ready?

**Option 1 (Easiest):**
Double-click `setup.bat` → Follow prompts

**Option 2 (Quick):**
```powershell
npm install ; npm run android
```

**Option 3 (Manual):**
See INSTALL_AND_RUN.md for step-by-step

---

Your NextTV Viewer is ready to launch! 📺✨

**Questions?** Check the documentation files or error logs.

**Ready to test!** Run the commands above and enjoy your IPTV viewer with:
- ✨ Previous channel button
- 🔒 Built-in VPN
- 🔇 Auto-ad detection
- 📺 300+ channels from 3 services
