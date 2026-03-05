# SwitchbackSimple — Architecture & Code Map

## Overview

SwitchbackSimple is a native Android app that hosts a single-page application (SPA) inside a WebView. Two embedded NanoHTTPD servers handle asset serving and LAN remote control. All UI and business logic lives in vanilla JavaScript — no frameworks, no build step.

## Java Layer (3 classes)

### `MainActivity.java` — WebView Host
- **Package**: `com.switchback.lite`
- **Lifecycle**: Starts `LocalServer` (:8123) + `RemoteServer` (:8124) in `onCreate()`
- **WebView config**: JS enabled, DOM storage, mixed content allowed, no cache (force-fresh assets)
- **Deep links**: Handles `switchback://import/CODE` → calls `handleDeepLinkConfig(code)` in JS
- **File chooser**: Proxies `onShowFileChooser` for config file imports
- **Back key**: Dispatches `KEYCODE_BACK` to WebView (JS handles navigation/exit)
- **Remote key dispatch**: `dispatchRemoteKey(int keyCode)` injects D-pad events from `RemoteServer`
- **Cache nuke**: On version upgrade, deletes `app_webview`, `cache`, `code_cache` dirs

### `LocalServer.java` — Asset Server + CORS Proxy
- **Port**: 8123, bound to `127.0.0.1` (localhost only)
- **Asset serving**: `GET /index.html`, `GET /app.js`, etc. from APK `assets/` dir
- **Proxy**: `GET /proxy?url=<encoded>` — fetches external URLs, adds CORS headers
- **M3U8 rewriting**: Buffers HLS playlists, rewrites all segment/key URIs to route through `/proxy`
- **Stream handling**: Chunked response for video/audio (no buffering infinite streams)
- **SSRF protection**: Blocks private IPs (10.x, 172.16-31.x, 192.168.x, localhost)
- **Retry logic**: 2 retries on 5xx with exponential backoff
- **Path traversal**: Rejects `..` in asset paths

### `RemoteServer.java` — LAN Remote Control
- **Port**: 8124, bound to `0.0.0.0` (all interfaces)
- **PIN auth**: 4-digit PIN via `SecureRandom`, stored in `SharedPreferences`
- **Endpoints**:
  - `GET /pin?pin=XXXX` — verify PIN
  - `GET /key?name=Up&pin=XXXX` — inject keycode
- **Supported keys**: back, up, down, left, right, select/enter/ok, playpause, menu
- **LAN filter**: Only accepts 192.168.x, 10.x, 172.16-31.x, localhost

## JavaScript Layer (`app.js` — ~3900 lines)

### Code Organization (by line range)

```
Lines    Section
──────── ────────────────────────────────────────
1-50     Virtual keyboard suppression (TV input handling)
52-84    State object (S) — all app state in one object
84-102   Environment detection (Android WebView vs Vercel web)
104-146  API client (buildApiUrl, api())
148-176  Helpers (esc, streamUrl, channelInitials, colorFromName, saveState)
178-216  Navigation (nav(), sidebar toggle)
217-262  TV Home screen
264-303  Language/country channel filter (15 groups, keyword matching)
305-378  Settings init + language filter UI
380-448  Credential management (save, test, reset, clear)
450-526  Channels screen (live categories + streams)
528-603  Movies screen (VOD grid)
619-690  Series screen + episode picker
692-813  EPG / TV Guide (time slots, program grid)
815-891  Search (cross-content: live + VOD + series)
893-957  Favorites + Watch History
959-1006 Devices screen (account info, stream usage)
1008-1080 Catch-Up TV (7-day archive)
1086-1254 HLS Player (openPlayer, loadStream, quality switching)
1257-1278 EPG bar + current program fetch
1280-1290 closePlayer (cleanup + ad detection reset)
1292-1320 Player controls (play/pause, mute, volume, seek, channel nav)
1321-1401 Back key handling + exit confirm dialog
1402-1457 Player keyboard shortcuts (D-pad, media keys, numeric entry)
1459-1536 Player favorites + recording (bookmark) system
1538-1566 Quality stat polling + HLS level switching
1568-1661 Phone pairing flow (code generation, polling)
1671-1753 Boot sequence (credential check → API load → channel fetch)
1755-1766 DOMContentLoaded init
1768-1877 Ad block toggle + Switchback slot management
1870-1975 Switchback panel UI (slot display, jump, cycle, clear)
1977-2027 Previous channel + ad block badge
2029-2129 EPG-based ad detection engine (ported from IPTVviewer)
2131-2182 Player quality panel (inline)
2198-2247 Sleep timer
2248-2360 Recordings (tabs, storage bar, progress)
2390-2530 Favorites upgrade (Smart Categories, import/export, Smart Add)
2537-2694 Quality screen (bandwidth test, health grid, server status)
2698-2809 Settings upgrade (Dezor, EPG URL, ad volume slider)
2811-2985 Provider config import (JSON, Xtream URL, M3U, base64, file, deep link)
2987-3039 Dezor playlist loader
3042-3123 Channel list upgrade (numbers, EPG subtitle, toast)
3125-3147 Player extras injection (sleep timer button)
3148-3193 Settings toggle persistence
3203-3213 Channel number assignment
3217-3247 EPG search/jump
3250-3310 Pricing/plan activation
3312-3422 Channel row context menu (long-press → SB assign)
3426-3590 Canonical nav() with focusable stamp after screen switch
3600-3862 Spatial D-pad navigation engine (tvSpatialNearest, zone-aware)
3864-3990 Remote command listener (localStorage, WebSocket, LAN)
```

### State Object (`S`)

All mutable state lives in a single global object `S`:

```javascript
const S = {
  // Credentials
  server, user, pass,
  // Navigation
  currentScreen, _screenHistory,
  // Player
  currentChannel, currentChannelIndex, channelList, hlsInstance, playerMuted,
  prevChannel, currentQuality, adBlockVolume,
  // Data
  allChannels, liveCategories, vodCategories, seriesCategories,
  allVod, allSeries, epgCache, userInfo,
  // User data (persisted to localStorage)
  favorites, history, recordings, switchbackSlots,
  // Features
  adBlockEnabled, adBlockVolume, autoPlay, epgUrl, isPro,
  sleepTimer, sleepMinutes,
  // Ad detection
  _adMuted, _adRestoreVol, _adCheckTimer,
};
```

### Key Functions

| Function | Purpose |
|---|---|
| `bootData()` | Entry point — validates creds, loads user info + channels |
| `buildApiUrl(action, extra)` | Routes API calls through proxy (Android) or Vercel |
| `nav(screen)` | Screen switching + history + lazy init + focus management |
| `openPlayer(ch, list, idx)` | Opens player overlay, starts HLS, triggers EPG + ad detect |
| `loadStream(ch)` | HLS.js setup with fallback to .ts direct |
| `fetchCurrentEPG(ch)` | Gets short EPG, updates now-playing, triggers ad detection |
| `detectAdFromEPG()` | EPG-based ad detection (title patterns + duration + EPG gaps + boundary fetch) |
| `parseProviderConfig(raw)` | Parses JSON/URL/M3U/base64 config into credentials |
| `applyImportedConfig(raw)` | Applies parsed config, tests connection, boots data |
| `startPairing()` | Shows QR setup screen, polls for credentials pushed via LAN RemoteServer |
| `renderChannelList(list)` | Channel list with numbers, EPG subtitle, fav stars, long-press |
| `handleRemoteCommand(cmd)` | Processes remote control actions from localStorage polling |

### Data Flow

```
Boot:
  DOMContentLoaded → nav('tvhome') → bootData()
    → No creds? → startPairing() (QR screen + credential polling)
    → Has creds? → api('get_user_info') → validate
      → api('get_live_categories') + api('get_live_streams') [parallel]
      → api('get_vod_*') + api('get_series_*') [background]

Channel Play:
  User clicks channel → openPlayer(ch)
    → loadStream(ch) → HLS.js or .ts fallback
    → fetchCurrentEPG(ch) → epgCache update → detectAdFromEPG()
    → setInterval(detectAdFromEPG, 5000) + boundary-aware EPG re-fetch

Provider Import:
  Paste/file/deep-link → parseProviderConfig(raw)
    → applyImportedConfig(cfg) → save to localStorage → bootData()

Remote Control:
  Phone → GET /key?name=Up&pin=1234 → RemoteServer.java
    → MainActivity.dispatchRemoteKey() → WebView keydown event
  OR:
  Phone → POST /cmd → RemoteServer.java → handleRemoteCommand()
  OR:
  Phone → localStorage('sb_remote_cmd') → polling (200ms) → handleRemoteCommand()
```

## Build & Dependencies

```groovy
// build.gradle
compileSdk 34, minSdk 23, targetSdk 34
dependencies:
  androidx.appcompat:1.6.1
  androidx.webkit:1.8.0
  org.nanohttpd:nanohttpd:2.3.1
```

- **Version**: 4.3 (versionCode 35)
- **Package**: `com.switchback.lite`
- **Signing**: Debug keystore (release builds use same for now)
- **Manifest features**: `leanback` (optional), `touchscreen` (optional) — supports both TV and phone

## Asset Files

| File | Size | Purpose |
|---|---|---|
| `index.html` | ~58KB | Full SPA: HTML structure + CSS (inline) |
| `app.js` | ~200KB | All JavaScript logic |
| `hls.min.js` | ~414KB | HLS.js adaptive streaming library |
| `remote.html` | ~15KB | Phone remote control UI (served on :8124) |

## Security Model

1. **LocalServer** — localhost only, SSRF-protected, no path traversal
2. **RemoteServer** — LAN only + 4-digit PIN on every request
3. **No hardcoded credentials** — user must enter or import
4. **Cleartext traffic** — required for Xtream API servers (most use HTTP)
5. **WebView cache nuked on upgrade** — prevents stale JS/HTML from persisting
