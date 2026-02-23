# Switchback TV - Installation & Update Guide

## 📦 Installing APK on Android TV via USB

### Step 1: Download APK
Once the build completes, you'll get a download link. Save the APK to a USB drive.

### Step 2: Enable Unknown Sources on TV
1. Go to **Settings** on your Android TV
2. Navigate to **Security & Restrictions**
3. Enable **Unknown Sources** for the file manager you'll use

### Step 3: Install APK
1. Insert USB drive into your TV
2. Open a file manager app (like **X-plore** or **ES File Explorer**)
3. Navigate to the USB drive
4. Find `switchback-tv.apk`
5. Click to install
6. Accept permissions when prompted

### Step 4: Launch App
Find "Switchback TV" in your apps and launch it!

---

## 🔄 Over-The-Air (OTA) Updates

### How OTA Updates Work:
- You make code changes on your laptop
- Push an update using `eas update`
- The TV app automatically downloads the update on next launch
- **No need to reinstall APK via USB!**

### Pushing Updates:

**1. Make your code changes**
Edit any file in `src/` (screens, services, etc.)

**2. Publish the update:**
```bash
cd c:\cevict-live\apps\IPTVviewer
npx eas-cli update --branch production --message "Bug fix: Fixed channel loading"
```

**3. App updates automatically:**
- Next time you open Switchback TV on your TV
- It checks for updates
- Downloads and applies them
- Restarts with the new code

### Update Workflow Example:

```bash
# Fix a bug in ChannelsScreen.tsx
# Edit the file...

# Publish update
npx eas-cli update --branch production --message "Fixed category tabs"

# On TV: Close and reopen app
# Update downloads and applies automatically!
```

---

## 🛠️ Development Workflow

### Initial Setup:
1. Build APK once: `npx eas-cli build --platform android --profile preview`
2. Install on TV via USB (one time only)

### Daily Development:
1. Make code changes on laptop
2. Test locally: `npm start` (press `w` for web preview)
3. Push update: `npx eas-cli update --branch production --message "Description"`
4. Reopen app on TV to get update

### When to Rebuild APK:
Only rebuild when you change:
- Native dependencies (add new npm packages)
- `app.json` configuration
- Android permissions
- App icons/splash screens

For all other changes (UI, logic, services), just use `eas update`!

---

## 📱 Testing Before Pushing to TV

### Option 1: Web Browser
```bash
npm start
# Press 'w' to open in browser
```

### Option 2: Android Emulator
```bash
npm start
# Press 'a' to launch on emulator
```

### Option 3: Phone (Expo Go)
```bash
npm start
# Scan QR code with Expo Go app
```

---

## 🐛 Debugging on TV

### View Logs:
1. Connect TV to same WiFi as laptop
2. Enable ADB debugging on TV
3. Run: `adb connect <TV_IP_ADDRESS>`
4. Run: `adb logcat | grep "Switchback"`

### Common Issues:

**App won't update:**
- Check TV internet connection
- Force close app completely
- Clear app cache in TV settings

**Playlist not loading:**
- Check DezorIPTV credentials in Settings
- Verify internet connection
- Check M3U URL is accessible

**Video won't play:**
- Check channel URL format
- Verify codec support
- Try different quality settings

---

## 📊 Current Configuration

### DezorIPTV Credentials:
- **Username:** jascodezorptv
- **Password:** 19e9a1x16
- **Server:** http://cf.like-cdn.com
- **Auto-loads on app start**

### App Features:
- ✅ TV-optimized grid home screen
- ✅ Category filtering (Sports, News, Movies, etc.)
- ✅ Channel numbers and logos
- ✅ EPG integration ("Now Playing")
- ✅ Movies/Series sections
- ✅ Catch-Up TV (7 days)
- ✅ Cloud DVR recording
- ✅ 4K/HD streaming
- ✅ Multi-device support (5 connections)

### Update Channel:
- **Branch:** production
- **Runtime Version:** 1.0.0
- **Update URL:** https://u.expo.dev/b038e856-9899-41b9-add6-c834cb69b6b4

---

## 🚀 Quick Commands Reference

```bash
# Start dev server
npm start

# Build new APK (rare)
npx eas-cli build --platform android --profile preview

# Push OTA update (common)
npx eas-cli update --branch production --message "Your update message"

# Check update status
npx eas-cli update:list --branch production

# View build status
npx eas-cli build:list
```

---

## 💡 Pro Tips

1. **Always test locally first** - Use web browser or emulator before pushing to TV
2. **Use descriptive update messages** - Makes it easy to track what changed
3. **Push updates during off-hours** - TV will get update next time it's opened
4. **Keep USB APK as backup** - In case you need to factory reset
5. **Monitor update downloads** - Check Expo dashboard for download stats

---

## 📞 Support

If you encounter issues:
1. Check TV internet connection
2. Verify DezorIPTV credentials
3. Check Expo dashboard for update status
4. Review logs with `adb logcat`
5. Rebuild APK if native changes were made

**Expo Dashboard:** https://expo.dev/accounts/[your-account]/projects/switchback-tv
