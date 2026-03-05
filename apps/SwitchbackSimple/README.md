# Switchback TV (SwitchbackSimple)

**The primary IPTV player app.** Native Android WebView app with full Xtream Codes API integration, TV remote support, and HLS streaming. IPTVviewer (React Native) is deprecated in favor of this.

## Architecture

```
SwitchbackSimple/
├── app/src/main/
│   ├── java/com/switchback/lite/
│   │   ├── MainActivity.java      # WebView host, deep links, D-pad dispatch
│   │   ├── LocalServer.java       # NanoHTTPD on :8123 — asset server + CORS proxy
│   │   └── RemoteServer.java      # NanoHTTPD on :8124 — LAN remote control (PIN auth)
│   ├── assets/
│   │   ├── index.html             # Full SPA UI (~1100 lines HTML/CSS)
│   │   ├── app.js                 # All application logic (~3800 lines)
│   │   └── hls.min.js             # HLS.js for adaptive streaming
│   ├── res/                       # Icons, themes
│   └── AndroidManifest.xml        # Package: com.switchback.lite
├── provider-config-generator.html # Standalone tool for IPTV providers
├── scripts/generate-icons.js      # App icon generation
├── build.gradle                   # Android build config
├── settings.gradle
└── TV_INSTALLATION_GUIDE.md       # End-user sideload instructions
```

## How It Works

1. **MainActivity** starts `LocalServer` on port 8123 and `RemoteServer` on port 8124
2. WebView loads `http://localhost:8123/index.html` (served from APK assets)
3. All Xtream API calls route through `LocalServer`'s `/proxy?url=` endpoint to avoid CORS
4. HLS streams are proxied with M3U8 rewriting (segment URLs → `localhost:8123/proxy?url=...`)
5. D-pad key events are dispatched from Android → WebView → JavaScript key handlers

## Features

### Streaming
- **HLS.js** adaptive bitrate streaming with fallback to `.ts` direct
- **Quality switching** — Auto/4K/1080p/720p/480p/360p via HLS level control
- **Buffer config** — 3s/5s/10s buffer size options
- **Bandwidth test** — Real-time speed test against IPTV server
- **Stream health** — Buffer %, FPS, latency, dropped frames from HLS.js stats

### Content
- **Live TV** — Full Xtream `get_live_streams` + `get_live_categories` with category pills
- **Movies (VOD)** — `get_vod_streams` + `get_vod_categories` with poster grid
- **Series** — `get_series` + `get_series_categories` + episode picker
- **EPG (TV Guide)** — `get_short_epg` per channel, time navigation, now-playing indicators
- **Catch-Up TV** — 7-day archive for `tv_archive=1` channels
- **Search** — Cross-content search (live + VOD + series)

### Channel Management
- **Switchback Slots** — 2 free / 4 Pro quick-switch slots with true channel swap
- **Favorites** — Star channels, Smart Categories (Sports/News/Movies/Kids/Music/Docs/Intl/Local), import/export
- **Watch History** — Last 50 channels with timestamps
- **Language Filter** — 15 language groups (Arabic, French, Spanish, etc.) with keyword matching
- **Channel Numbers** — Numeric entry in player (type digits → auto-jump after 1.5s)

### Player
- **D-pad navigation** — Arrow keys for channel up/down, seek, volume
- **Previous channel** — Switchback slot 0 or explicit prev-channel tracking
- **Ad block toggle** — ON/OFF badge with configurable mute volume
- **EPG-based ad detection** — Detects commercial breaks using EPG program boundaries
- **Sleep timer** — 15/30/45/60/90/120 minute options with countdown
- **Recording** — Bookmark-based "recordings" (metadata saved to localStorage)
- **Keyboard shortcuts** — Space/K=play-pause, M=mute, S=switchback panel, 0-9=channel entry

### Setup & Authentication
- **Phone pairing** — QR code + 4-digit PIN → phone opens LAN RemoteServer, pushes credentials via POST /config
- **Provider config import** — JSON, Xtream URL, M3U URL, base64 activation code, `.switchback` file
- **Deep links** — `switchback://import/CODE` opens and auto-applies config
- **Dezor provider** — Secondary provider credentials with separate fields
- **Credential test** — `get_user_info` validation before saving

### Remote Control
- **RemoteServer.java** — HTTP server on port 8124, PIN-authenticated
- **localStorage polling** — Cross-tab command passing via `sb_remote_cmd` (200ms poll)
- **Phone remote polls** — `GET /state?pin=XXXX` every 2s for now-playing, slots, mute status

### TV Remote Support
- Full D-pad focus management with visible focus rings
- ArrowUp/Down navigation between sidebar ↔ content
- Tab key intercepted for controlled focus cycling
- Per-screen first-focus selectors (channels→pills, search→input, etc.)
- Toggle switches respond to Enter/Space
- Back key: player→close, screen→history stack, home→exit confirm

### Monetization
- **Pricing tiers** — Starter (free, 2 slots), Pro (4 slots), Elite
- **Feature gating** — Locked slots show upgrade prompt with plan navigation
- **Plan persistence** — `sb_tier` in localStorage

## Servers

| Server | Port | Binding | Purpose |
|---|---|---|---|
| LocalServer | 8123 | 127.0.0.1 | Asset serving + CORS proxy |
| RemoteServer | 8124 | 0.0.0.0 | LAN remote control (PIN auth) |

### LocalServer Security
- Localhost-only binding (`127.0.0.1`)
- SSRF protection: blocks private IPs (10.x, 172.16-31.x, 192.168.x, localhost)
- Scheme validation: only `http://` and `https://`
- Path traversal prevention: rejects `..` in asset paths
- Retry logic: 2 retries on 5xx errors with backoff

### RemoteServer Security
- 4-digit PIN generated via `SecureRandom`, stored in `SharedPreferences`
- PIN required on every `/key` request
- `/pin` endpoint for PIN verification
- PIN logged at startup for TV screen display

## State Management

All state lives in `localStorage` (persists across app restarts):

| Key | Type | Description |
|---|---|---|
| `iptv_server` | string | Xtream server URL |
| `iptv_user` | string | Username |
| `iptv_pass` | string | Password |
| `fav_channels` | JSON array | Favorited channels |
| `watch_history` | JSON array | Last 50 watched |
| `recordings` | JSON array | Bookmarked recordings |
| `sb_slots` | JSON array | 4 switchback slot objects |
| `sb_tier` | string | Plan tier (starter/pro/elite) |
| `adblock` | string | Ad block enabled (true/false) |
| `adblock_volume` | string | Ad mute volume (0-100) |
| `epg_url` | string | Custom EPG XMLTV URL |
| `autoplay` | string | Auto-play on channel select |
| `lang_filter_hidden` | JSON array | Hidden language group IDs |
| `hidden_categories` | JSON array | Hidden provider category IDs |
| `dezor_server/user/pass` | string | Dezor provider credentials |

## Environment Detection

```javascript
const IS_ANDROID_WEBVIEW = (
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === 'localhost'
) && window.location.port === '8123';
```

- **Android WebView**: API calls route through `localhost:8123/proxy?url=...`
- **Vercel web**: API calls route through `/api/iptv?action=...&server=...`

## Building

```bash
cd C:\cevict-live\apps\SwitchbackSimple
gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

Requirements: JDK 17+, Android SDK, Gradle

## Deep Link Format

```
switchback://import/BASE64_CONFIG
```

Where BASE64_CONFIG decodes to:
```json
{"server":"http://example.com:8080","username":"user","password":"pass","epg":"http://example.com/xmltv.php"}
```

## vs IPTVviewer (Deprecated)

IPTVviewer is a React Native / Expo app that was the original prototype. SwitchbackSimple supersedes it because:
- **No Expo build chain** — plain Gradle APK, no cloud builds needed
- **Smaller APK** — WebView + JS vs full React Native runtime
- **More features** — Switchback slots, language filter, phone pairing, full D-pad support
- **Simpler updates** — Change HTML/JS assets, rebuild APK
- **Better TV support** — Full keyboard/D-pad focus management built for Android TV

The only feature IPTVviewer had that SwitchbackSimple didn't was EPG-based ad detection with program boundary analysis — this has now been ported.
