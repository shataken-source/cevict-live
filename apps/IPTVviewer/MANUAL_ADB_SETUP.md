# Manual ADB Setup Instructions

## Download ADB Tools

1. **Open your web browser**
2. **Go to:** https://developer.android.com/tools/releases/platform-tools
3. **Click:** Download SDK Platform-Tools for Windows
4. **Save the ZIP file** to your Downloads folder

## Install ADB

1. **Extract the ZIP:**
   - Right-click `platform-tools-latest-windows.zip`
   - Select "Extract All"
   - Choose destination: `C:\` (will create `C:\platform-tools`)
   - Click "Extract"

2. **Add to PATH:**
   - Open PowerShell as Administrator
   - Run these commands:

```powershell
# Add to system PATH
$currentPath = [System.Environment]::GetEnvironmentVariable("PATH", [System.EnvironmentVariableTarget]::User)
[System.Environment]::SetEnvironmentVariable("PATH", "$currentPath;C:\platform-tools", [System.EnvironmentVariableTarget]::User)

# Update current session
$env:PATH = "$env:PATH;C:\platform-tools"
```

3. **Test it:**
   - Close and reopen PowerShell
   - Run: `adb version`
   - Should show: "Android Debug Bridge version..."

## Connect Your Phone

1. **Enable USB Debugging on phone:**
   - Settings → About Phone
   - Tap "Build Number" 7 times
   - Back → Developer Options
   - Enable "USB Debugging"

2. **Connect phone via USB**

3. **Verify connection:**
```powershell
adb devices
```

Should show:
```
List of devices attached
ABC123XYZ    device
```

## Run the App

```powershell
cd C:\cevict-live\apps\IPTVviewer
npm run android
```

---

## Alternative: Manual APK Installation

If ADB still doesn't work:

### Build APK:
```powershell
cd C:\cevict-live\apps\IPTVviewer\android
.\gradlew assembleDebug
```

### Transfer to Phone:
- Copy `android\app\build\outputs\apk\debug\app-debug.apk` to your phone
- Tap the APK file on your phone
- Allow "Install from Unknown Sources"
- Install and open

Done!
