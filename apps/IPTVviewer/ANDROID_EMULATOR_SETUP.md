# How to Set Up Android Emulator (No Cable Needed)

## Option 1: Android Studio Emulator (Recommended)

### Step 1: Download Android Studio
1. Go to https://developer.android.com/studio
2. Download and install Android Studio (free)
3. Run Android Studio after installation

### Step 2: Create Virtual Device
1. Open Android Studio
2. Click **More Actions** > **Virtual Device Manager**
3. Click **Create device**
4. Select a device:
   - **TV**: Choose "Android TV" category
     - 1080p (1920x1080) - Recommended
     - 720p (1280x720)
   - **Phone**: Choose "Phone" category
     - Pixel 5 or 6 - Recommended
5. Select system image:
   - Click **Download** next to an image (建议: API 30 or higher)
   - R (API 30) is stable and works well
6. Click **Finish**

### Step 3: Start the Emulator
1. In Virtual Device Manager, click **Play** button next to your device
2. Wait for emulator to boot (30-60 seconds first time)
3. Keep emulator running

### Step 4: Run Your App
```bash
npm run android
```

The app should install and launch automatically on the emulator.

---

## Option 2: Use Web-Based Testing (Fastest)

### Test Without Emulator:
You can test the UI and logic without running on Android:

```bash
npm start
# Opens Metro bundler in browser
```

You won't see video playback, but you can:
- Verify the app compiles
- Check UI rendering
- Test navigation logic
- Verify TypeScript compilation

```bash
npm run type-check
# or
npx tsc --noEmit
```

---

## Option 3: Cloud Testing (Advanced)

### Firebase Test Lab
1. Upload your .aab file to Firebase Console
2. Run tests on virtual devices in the cloud
3. View screenshots and logs

### AWS Device Farm
- Similar to Firebase, cloud-based device testing

---

## Quick Comparison

| Method | Video Playback | Real Testing | Setup Time |
|--------|---------------|--------------|------------|
| Android Studio Emulator | ✅ Yes | ✅ Good | 10-30 min |
| Metro Web UI | ❌ No | ⚠️ Limited | 2 min |
| Cloud Testing | ✅ Yes | ✅ Good | 5 min + upload |

---

## Recommended Path:
1. **Today**: Run `npm start` to verify it compiles
2. **While waiting**: Install Android Studio, download emulator image
3. **When cable/emulator ready**: Test full app with video playback

---

## Commands Summary:
```bash
# Check if app compiles
npm run type-check

# Start Metro bundler only
npm start

# Build and run on emulator (once emulator is running)
npm run android
```
