# Switchback TV - Full-Featured IPTV Player

Modern React Native IPTV application with modular feature system and easy setup.

## 🎯 Features

### Basic Features (Always Enabled)
- ✅ M3U Playlist Loading
- ✅ Live Stream Playback
- ✅ Favorite Channels
- ✅ Watch History
- ✅ Electronic Program Guide (EPG)
- ✅ Config File Import

### Advanced Features (Toggle On/Off)
- 📱 QR Code Setup
- 🔇 Ad Detection & Muting
- 📺 Chromecast Support
- 📼 DVR Recording
- ⏸️ Time Shifting (Pause/Rewind Live TV)
- ⏰ Sleep Timer
- 🔒 Parental Controls
- 🎵 Multi-Audio Tracks
- 📝 Subtitle Support

### Experimental Features (Beta)
- 🎤 Voice Control
- 🔐 VPN Integration
- 🌤️ Weather Overlay
- 📰 News Ticker
- 👆 Gesture Controls
- 🤖 AI Recommendations
- 📺 Picture-in-Picture
- 🖼️ Multi-View Mode

## 🚀 Easy Setup Methods

### 1. QR Code Scan (Fastest)
Provider generates QR code → Customer scans → Auto-configured

### 2. File Import (Easiest)
Provider sends `.json` file → Customer imports → Done

### 3. URL Import
Provider sends setup URL → Customer pastes → Auto-configured

### 4. Manual Entry
Traditional server/username/password entry (fallback)

## 📦 For IPTV Providers

### Generate Config File

```json
{
  "provider": "YourIPTV",
  "server": "http://yourserver.com:8080",
  "username": "customer123",
  "password": "pass456",
  "epg": "http://yourserver.com/xmltv.php?username=customer123&password=pass456"
}
```

Send to customers via:
- Email attachment
- Download link
- Customer portal
- QR code

See `PROVIDER_CONFIG_GUIDE.md` for full documentation.

## 🛠️ Development

### Install Dependencies
```bash
npm install
npx expo install
```

### Run Development Server
```bash
npm start
```

### Build APK
```bash
# Cloud build (requires Expo account)
npx eas build --platform android --profile preview

# Local build (macOS/Linux only)
npx eas build --platform android --profile preview --local
```

## 🎛️ Feature Management

Features are controlled via `src/config/features.ts`:

```typescript
import { FeatureManager, FEATURES } from '@/config/features';

// Check if feature is enabled
if (FeatureManager.isEnabled('DVR_RECORDING')) {
  // Show recording UI
}

// Enable a feature
FeatureManager.enable('CHROMECAST');

// Disable a feature
FeatureManager.disable('AD_DETECTION');

// Get all enabled features
const enabled = FeatureManager.getEnabledFeatures();
```

### Feature Presets

- **Minimal** - Basic playback only
- **Standard** - Recommended for most users
- **Power User** - All stable features
- **Everything** - Including experimental features

## 📁 Project Structure

```
IPTVviewer/
├── src/
│   ├── screens/          # UI screens
│   │   ├── HomeScreen.tsx
│   │   ├── PlayerScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── ...
│   ├── services/         # 31 service modules
│   │   ├── M3UParser.ts
│   │   ├── EPGService.ts
│   │   ├── IPTVService.ts
│   │   └── ...
│   ├── store/            # Zustand state management
│   │   └── useStore.ts
│   ├── config/           # Feature flags & config
│   │   └── features.ts
│   ├── types/            # TypeScript types
│   └── components/       # Reusable components
├── App.tsx               # Main app entry
├── app.json              # Expo configuration
├── eas.json              # Build configuration
└── package.json          # Dependencies
```

## 🔧 Configuration

### app.json
- App name, version, icons
- Android/iOS specific settings
- Permissions

### eas.json
- Build profiles (development, preview, production)
- Platform-specific build settings

## 📱 Supported Platforms

- ✅ Android TV
- ✅ Android Mobile
- ✅ Fire TV
- ✅ NVIDIA Shield
- ❌ Samsung Tizen (not Android)
- ❌ LG webOS (not Android)

## 🐛 Known Issues

See `AUDIT.md` for detailed bug reports and fixes applied.

## 📄 License

Private - For internal use

## 🆘 Support

For setup issues or feature requests, see documentation or contact support.
