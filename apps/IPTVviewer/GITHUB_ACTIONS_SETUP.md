# GitHub Actions Build Setup

## 🎯 What This Does

Builds your Android APK for **free** using GitHub Actions, bypassing Expo's build limits.

---

## 📋 Setup Steps

### 1. Push Code to GitHub

```bash
cd c:\cevict-live\apps\IPTVviewer

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Switchback TV with GitHub Actions build"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/switchback-tv.git

# Push
git push -u origin main
```

### 2. Trigger the Build

Once pushed, GitHub Actions will automatically:
- Install dependencies
- Generate native Android project
- Build the APK
- Upload it as an artifact

### 3. Download Your APK

1. Go to your GitHub repo
2. Click **Actions** tab
3. Click the latest workflow run
4. Scroll to **Artifacts** section
5. Download `switchback-tv-release.apk`

---

## 🔐 Optional: Code Signing (for production)

For a properly signed APK (not required for testing):

### Generate Keystore:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias switchback-tv -keyalg RSA -keysize 2048 -validity 10000
```

### Add to GitHub Secrets:

1. Go to repo **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:

```bash
# Convert keystore to base64
certutil -encode release.keystore release.keystore.b64

# Add as secrets:
ANDROID_KEYSTORE_BASE64 = <contents of release.keystore.b64>
KEYSTORE_PASSWORD = <your keystore password>
KEY_ALIAS = switchback-tv
KEY_PASSWORD = <your key password>
```

---

## 🚀 Usage

### Automatic Builds:
Every push to `main` branch triggers a build.

### Manual Builds:
1. Go to **Actions** tab
2. Click **Build Android APK (Native)**
3. Click **Run workflow**
4. Select branch
5. Click **Run workflow** button

---

## 📦 What Gets Built

- **File:** `app-release.apk`
- **Size:** ~50-60 MB
- **Type:** Universal APK (works on all Android devices)
- **Signed:** Only if secrets are configured

---

## ✅ Advantages Over EAS

- ✅ **Unlimited free builds**
- ✅ **No monthly limits**
- ✅ **Faster builds** (5-10 minutes)
- ✅ **Full control** over build process
- ✅ **Works immediately** (no waiting for plan reset)

---

## 🔄 OTA Updates Still Work!

Once you install the APK on your TV:

```powershell
# Push updates wirelessly
iptv-update "Your update message"
```

GitHub Actions is only for the **initial APK**. All future updates use OTA!

---

## 🐛 Troubleshooting

**Build fails on prebuild step:**
- Make sure `app.json` is properly configured
- Check that all dependencies are in `package.json`

**APK won't install on TV:**
- Enable "Unknown Sources" in TV settings
- Make sure APK is for correct architecture

**Build takes too long:**
- GitHub Actions has 6-hour timeout (plenty of time)
- Typical build: 5-10 minutes

---

## 📊 Build Status

Check build status at:
`https://github.com/YOUR_USERNAME/switchback-tv/actions`

Download artifacts from completed builds (available for 30 days).
