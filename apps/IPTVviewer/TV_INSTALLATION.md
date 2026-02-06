# 📺 Installing NextTV Viewer on Your TV

Complete guide to get NextTV Viewer running on your actual TV.

---

## 🎯 Supported TV Platforms

| Platform | Support | Method |
|----------|---------|--------|
| **Android TV** | ✅ Full Support | APK install or Google Play |
| **Fire TV** | ✅ Should Work | APK sideload |
| **Smart TV (Samsung/LG)** | ❌ Not Supported | Requires Tizen/webOS port |
| **Chromecast** | ⚠️ Cast Only | Cast from phone |
| **Apple TV** | ❌ Not Supported | Would need tvOS port |

---

## Method 1: Android TV (Direct Install via USB)

### What You Need:
- Android TV device (Sony, TCL, Hisense, Nvidia Shield, etc.)
- USB flash drive
- Computer with project installed

### Steps:

#### 1. Build Release APK

```powershell
# Navigate to project
cd C:\cevict-live\apps\IPTVviewer

# Build release APK
cd android
.\gradlew assembleRelease
cd ..
```

**Output location:**
`android/app/build/outputs/apk/release/app-release.apk`

#### 2. Copy APK to USB Drive

```powershell
# Copy APK to USB drive (replace D: with your USB drive letter)
Copy-Item android/app/build/outputs/apk/release/app-release.apk D:\nexttv-viewer.apk
```

#### 3. Install on TV

**On your Android TV:**

1. **Enable Unknown Sources**
   - Settings → Security & Restrictions
   - Enable "Unknown sources" or "Install unknown apps"
   - Allow installation from file manager

2. **Install File Manager** (if not installed)
   - Open Google Play Store on TV
   - Search "File Manager"
   - Install (e.g., "ES File Explorer", "Solid Explorer")

3. **Install APK**
   - Insert USB drive into TV
   - Open File Manager app
   - Navigate to USB drive
   - Find `nexttv-viewer.apk`
   - Click to install
   - Click "Install" when prompted
   - Click "Open" when installation completes

#### 4. Launch App
   - Go to Apps menu on TV
   - Find "NextTV Viewer"
   - Click to open
   - Wait for playlists to load (10-20 seconds)
   - Start watching!

---

## Method 2: Android TV (Wireless Install via ADB)

### What You Need:
- Android TV on same WiFi network as computer
- Computer with project installed

### Steps:

#### 1. Enable ADB on TV

**On your Android TV:**
1. Settings → Device Preferences → About
2. Click "Build" 7 times (enables Developer Mode)
3. Go back → Developer Options
4. Enable "USB Debugging"
5. Enable "Network Debugging"
6. Note your TV's IP address (Settings → Network → Status)

#### 2. Connect from Computer

```powershell
# Connect to TV (replace with your TV's IP)
adb connect 192.168.1.XXX:5555

# Verify connection
adb devices
# Should show: 192.168.1.XXX:5555    device
```

#### 3. Build and Install

**Option A: Debug APK (Faster)**
```powershell
# Navigate to project
cd C:\cevict-live\apps\IPTVviewer

# Build and install directly
npm run android
```

**Option B: Release APK**
```powershell
# Build release
cd android
.\gradlew assembleRelease
cd ..

# Install to TV
adb install android/app/build/outputs/apk/release/app-release.apk
```

#### 4. Launch App
- TV remote → Apps → NextTV Viewer

---

## Method 3: Fire TV (Sideload)

### What You Need:
- Fire TV Stick or Fire TV device
- Computer with project installed

### Steps:

#### 1. Enable ADB on Fire TV

**On Fire TV:**
1. Settings → My Fire TV → About
2. Click on "Build" 7 times
3. Go back → Developer Options
4. Enable "ADB Debugging"
5. Enable "Apps from Unknown Sources"
6. Note IP address (Settings → My Fire TV → About → Network)

#### 2. Connect and Install

```powershell
# Connect to Fire TV
adb connect 192.168.1.XXX:5555

# Build release APK
cd C:\cevict-live\apps\IPTVviewer\android
.\gradlew assembleRelease
cd ..

# Install
adb install android/app/build/outputs/apk/release/app-release.apk
```

#### 3. Launch
- Fire TV Home → Apps & Channels → Your Apps & Channels
- Find "NextTV Viewer"

---

## Method 4: Google Play Store (Future)

### For Publishing to Play Store:

#### 1. Create Signed APK

```powershell
# Generate keystore (first time only)
cd C:\cevict-live\apps\IPTVviewer\android\app
keytool -genkeypair -v -storetype PKCS12 -keystore nexttv-release.keystore -alias nexttv-key -keyalg RSA -keysize 2048 -validity 10000
```

#### 2. Configure Signing

Create `android/gradle.properties`:
```properties
NEXTTV_UPLOAD_STORE_FILE=nexttv-release.keystore
NEXTTV_UPLOAD_KEY_ALIAS=nexttv-key
NEXTTV_UPLOAD_STORE_PASSWORD=your_password
NEXTTV_UPLOAD_KEY_PASSWORD=your_password
```

Create `android/app/build.gradle` signing config:
```gradle
android {
    signingConfigs {
        release {
            storeFile file(NEXTTV_UPLOAD_STORE_FILE)
            storePassword NEXTTV_UPLOAD_STORE_PASSWORD
            keyAlias NEXTTV_UPLOAD_KEY_ALIAS
            keyPassword NEXTTV_UPLOAD_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

#### 3. Build Signed APK

```powershell
cd android
.\gradlew assembleRelease
cd ..
```

#### 4. Upload to Play Console

1. Go to https://play.google.com/console
2. Create app listing
3. Upload APK
4. Fill out store listing
5. Submit for review

---

## Method 5: Chromecast (Cast from Phone)

### Steps:

1. **Install on Android Phone First**
   ```powershell
   # Connect phone via USB
   npm run android
   ```

2. **Cast to TV**
   - Open NextTV Viewer on phone
   - Play a channel
   - Tap Cast icon (if supported by video player)
   - Select your Chromecast

> Note: Native Chromecast support may require additional configuration in react-native-video

---

## 📱 Method 6: Android Box / Mi Box

Same as Android TV method - use USB or ADB installation.

---

## 🎮 Using TV Remote Controls

### Once Installed on TV:

**Navigation:**
- **D-pad (Arrow Keys)**: Navigate menu
- **Select/Enter**: Select channel / Previous channel (in player)
- **Back**: Return to channel list
- **Volume +/-**: Adjust volume
- **Mute**: Toggle mute

**In Player:**
- **Select/Enter**: Go to previous channel (key feature!)
- **Back**: Exit player
- **D-pad**: Navigate controls (when visible)

---

## 🔧 Troubleshooting TV Installation

### "Installation Blocked"

**Solution:**
- Enable "Unknown Sources" in TV settings
- Some TVs call it "Install from Unknown Sources"
- May need to enable per-app (enable for File Manager)

### "Parse Error" During Install

**Solution:**
- APK may be corrupted
- Rebuild APK: `.\gradlew assembleRelease`
- Use release APK, not debug
- Ensure USB drive is formatted correctly (FAT32)

### "App Not Compatible"

**Solution:**
- Check Android version (need Android 6.0+)
- Verify it's Android TV, not Samsung/LG TV
- Try debug APK first: `.\gradlew assembleDebug`

### Can't Enable Developer Options

**Solution:**
- Try clicking "Build Number" or "Model" 7 times
- Some TVs: Settings → About → Software Info → More Info
- Restart TV and try again

### ADB Connection Failed

**Solution:**
```powershell
# Restart ADB
adb kill-server
adb start-server

# Connect again
adb connect 192.168.1.XXX:5555
```

### App Crashes on TV Launch

**Solution:**
```powershell
# Check logs
adb logcat | Select-String "NextTV"

# Clear app data
adb shell pm clear com.nexttv.viewer

# Reinstall
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

---

## 🎯 Recommended Installation Path

**For Testing:**
1. Method 2 (Wireless ADB) - Fastest for development

**For Daily Use:**
1. Method 1 (USB Install) - Most reliable
2. Method 2 (Wireless ADB) - Convenient updates

**For Distribution:**
1. Method 4 (Google Play) - Professional
2. Method 1 (USB Install) - For friends/family

---

## 📦 APK Sizes

- **Debug APK**: ~60-80 MB
- **Release APK**: ~30-50 MB (optimized)

---

## 🔄 Updating the App

### Via USB:
1. Build new APK
2. Copy to USB
3. Install (will update existing)

### Via ADB:
```powershell
# Rebuild
cd android
.\gradlew assembleRelease
cd ..

# Reinstall
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

---

## 🌐 Network Requirements

**On TV:**
- WiFi or Ethernet connection
- Internet access for IPTV streams
- Same network as computer (for ADB installation)

**Ports:**
- ADB: 5555 (for wireless debugging)
- No special router configuration needed

---

## ✅ Post-Installation Checklist

After installing on TV:

- [ ] App launches successfully
- [ ] Playlists load (Sample, Link4TV, Dezor)
- [ ] Channels play videos
- [ ] Remote D-pad navigates UI
- [ ] Select/Enter returns to previous channel
- [ ] Volume controls work
- [ ] Settings accessible
- [ ] VPN settings visible
- [ ] Ad detection toggle works
- [ ] Search functions properly

---

## 🎉 You're Done!

Your NextTV Viewer is now on your TV with:
- ✅ 300+ channels from 3 IPTV services
- ✅ Previous channel button (finally!)
- ✅ VPN support
- ✅ Auto-ad detection
- ✅ Full remote control support

Enjoy watching! 📺

---

## 📞 Need Help?

**Common Issues:**
- See INSTALL_AND_RUN.md for troubleshooting
- Check logs: `adb logcat | Select-String "ReactNative"`
- Rebuild APK if problems persist

**For Updates:**
- Rebuild APK and reinstall
- Or publish update to Play Store (if using Method 4)
