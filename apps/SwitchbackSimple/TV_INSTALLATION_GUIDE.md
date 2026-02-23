# Switchback TV - Installation Guide for Smart TVs

## 📺 What is Switchback TV?

Switchback TV is a simple IPTV player that runs on Android-based TVs and devices. It loads M3U playlists and plays live streams directly in a WebView.

**Features:**
- Load M3U playlists from any URL
- Clean, TV-optimized interface
- Channel list with search
- Direct stream playback
- Minimal permissions (just Internet access)

---

## 🎯 Compatible Devices

### ✅ **Works On:**
- **Android TV** (Sony, TCL, Hisense, Philips, etc.)
- **Amazon Fire TV / Fire Stick**
- **NVIDIA Shield TV**
- **Mi Box / Xiaomi TV**
- **Any Android TV Box**

### ❌ **Does NOT Work On:**
- **Samsung Tizen TVs** (Samsung's proprietary OS - not Android)
- **LG webOS TVs** (LG's proprietary OS - not Android)
- **Apple TV** (requires iOS app)
- **Roku** (requires Roku channel)

---

## 📋 Installation Methods

### Method 1: Sideload APK via USB (Easiest)

**Requirements:**
- USB flash drive
- Computer to download APK

**Steps:**

1. **Build the APK** (on your computer):
   ```bash
   cd C:\cevict-live\apps\SwitchbackSimple
   gradlew assembleRelease
   ```
   APK will be at: `app/build/outputs/apk/release/app-release.apk`

2. **Copy APK to USB drive**
   - Copy `app-release.apk` to root of USB drive
   - Rename to `switchback.apk` for easier typing

3. **Enable Unknown Sources on TV:**
   - Go to **Settings** → **Security & Restrictions**
   - Enable **Unknown Sources** (or enable for specific file manager)

4. **Install File Manager on TV** (if not already installed):
   - Open **Google Play Store** on TV
   - Search for "File Manager" or "X-plore File Manager"
   - Install any file manager app

5. **Install APK:**
   - Plug USB drive into TV
   - Open File Manager app
   - Navigate to USB drive
   - Find `switchback.apk`
   - Click to install
   - Confirm installation

6. **Launch App:**
   - Find "SwitchbackTV" in your apps list
   - Open and enter your M3U playlist URL

---

### Method 2: Install via ADB (Advanced)

**Requirements:**
- Computer with ADB installed
- USB cable or network connection to TV

**Steps:**

1. **Enable Developer Options on TV:**
   - Go to **Settings** → **About**
   - Click **Build Number** 7 times
   - Go back to Settings → **Developer Options**
   - Enable **USB Debugging** and **Network Debugging**

2. **Connect via ADB:**
   ```bash
   # Find TV IP address (Settings → Network → Status)
   adb connect 192.168.1.XXX:5555
   ```

3. **Install APK:**
   ```bash
   cd C:\cevict-live\apps\SwitchbackSimple
   adb install app/build/outputs/apk/release/app-release.apk
   ```

4. **Launch:**
   ```bash
   adb shell am start -n com.switchback.tv/.MainActivity
   ```

---

### Method 3: Downloader App (Fire TV)

**For Amazon Fire TV/Stick:**

1. **Enable Unknown Sources:**
   - Settings → My Fire TV → Developer Options
   - Enable **Apps from Unknown Sources**

2. **Install Downloader App:**
   - Search for "Downloader" in Amazon App Store
   - Install it

3. **Download APK:**
   - Open Downloader app
   - Enter URL where APK is hosted (need to host it somewhere)
   - Download and install

---

## 🔧 Building the APK

### Prerequisites:
- Java JDK 17+
- Android SDK
- Gradle

### Build Commands:

```bash
# Navigate to project
cd C:\cevict-live\apps\SwitchbackSimple

# Clean build
gradlew clean

# Build release APK
gradlew assembleRelease

# Output location:
# app/build/outputs/apk/release/app-release.apk
```

### Signing the APK (Optional):

The app uses a debug keystore by default. For production:

1. Create release keystore:
   ```bash
   keytool -genkey -v -keystore release.keystore -alias switchback -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Update `app/build.gradle`:
   ```gradle
   signingConfigs {
       release {
           storeFile file('release.keystore')
           storePassword 'your-password'
           keyAlias 'switchback'
           keyPassword 'your-password'
       }
   }
   ```

3. Build:
   ```bash
   gradlew assembleRelease
   ```

---

## 📱 Using the App

### First Launch:

1. **Enter M3U URL:**
   - Paste your IPTV playlist URL
   - Click "Load Playlist"

2. **Browse Channels:**
   - Scroll through channel list
   - Use search to find specific channels

3. **Watch Stream:**
   - Click any channel to start playback
   - Use back button to return to channel list

### Supported M3U Formats:

```m3u
#EXTM3U
#EXTINF:-1 tvg-id="cnn" tvg-name="CNN" tvg-logo="http://..." group-title="News",CNN
http://stream-url.com/cnn/playlist.m3u8

#EXTINF:-1,ESPN
http://stream-url.com/espn/playlist.m3u8
```

---

## 🐛 Troubleshooting

### App Won't Install:
- ✅ Verify "Unknown Sources" is enabled
- ✅ Check APK isn't corrupted (re-download)
- ✅ Try different file manager app
- ✅ Restart TV and try again

### Streams Won't Play:
- ✅ Verify M3U URL is accessible
- ✅ Check stream URLs are HTTP/HTTPS (not RTSP)
- ✅ Test stream in VLC player first
- ✅ Ensure TV has internet connection

### App Crashes:
- ✅ Clear app data: Settings → Apps → SwitchbackTV → Clear Data
- ✅ Reinstall app
- ✅ Check Android version (requires Android 6.0+)

### Black Screen:
- ✅ Stream may be geo-blocked (try VPN)
- ✅ Stream format may not be supported
- ✅ Try different channel

---

## 🔐 Permissions

The app only requires:
- **INTERNET** - To load playlists and stream video
- **ACCESS_NETWORK_STATE** - To check connection status

No other permissions needed. No data collection.

---

## 🚀 Alternative: Web Version

If you can't sideload apps, use the web version:

1. Open TV browser (if available)
2. Navigate to: `http://192.168.8.152:3008/wallboard` (your local IP)
3. Enter M3U URL
4. Play streams directly in browser

---

## 📞 Support

**For Samsung Tizen TVs:**
Samsung TVs don't run Android, so this app won't work. Options:
- Use IPTV Smarters (available in Samsung App Store)
- Use built-in browser with web player
- Get an Android TV box and connect via HDMI

**For LG webOS TVs:**
LG TVs don't run Android either. Options:
- Use SS IPTV (available in LG Content Store)
- Get an Android TV box
- Use Fire TV Stick

**For Android TVs:**
This app should work perfectly! Follow the installation guide above.

---

## 📝 Notes

- App is signed with debug keystore (safe for personal use)
- No Google Play Store submission (sideload only)
- Free and open source
- No ads, no tracking, no data collection
- Streams quality depends on your IPTV provider

---

## 🔄 Updates

To update the app:
1. Build new APK with updated version code
2. Install over existing app (data will be preserved)
3. Or uninstall old version first for clean install

Current version: **1.0.0**

---

**Enjoy your IPTV streams! 📺✨**
