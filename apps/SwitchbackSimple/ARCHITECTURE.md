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

## JavaScript Layer (`app.js` — ~4500 lines)

### Code Organization (approximate sections)

```
Lines      Section
────────── ────────────────────────────────────────
1-50       Virtual keyboard suppression (TV input handling)
52-84      State object (S) — all app state + user_timezone
84-102     Environment detection (Android WebView vs Vercel web)
104-170    API client (buildApiUrl, api() with 3x retry + backoff)
172-190    Helpers (esc, streamUrl, channelInitials, colorFromName, saveState, formatEpgTime w/ timezone)
192-262    Navigation (nav(), sidebar toggle)
264-310    TV Home screen
312-400    Language/country channel filter (15 groups, keyword matching)
400-520    Settings init + language/category filter UI + timezone picker
520-600    Credential management (save, test, reset, clear)
600-710    Channels screen (live categories + streams + ★ Favorites in dropdown)
712-830    Movies screen (VOD grid)
832-910    Series screen + episode picker
910-1000   EPG / TV Guide (category dropdown w/ favorites, time slots, program grid)
1000-1070  Search (cross-content: live + VOD + series)
1070-1170  Favorites + Watch History + renderFavorites()
1170-1220  Devices screen (account info, stream usage)
1220-1300  Catch-Up TV (7-day archive)
1300-1500  HLS Player (openPlayer, loadStream, quality switching)
1500-1540  EPG bar + current program fetch
1540-1560  closePlayer (cleanup + ad detection reset)
1560-1620  Player controls (play/pause, mute, volume, seek, channel nav)
1620-1760  Back key handling + exit confirm (dismisses modals first) + modal checks
1760-1870  Player keyboard shortcuts (D-pad, media keys, numeric entry)
1870-1960  Player favorites + recording (bookmark) system
1960-2000  Quality stat polling + HLS level switching
2000-2100  Phone pairing flow (code generation, polling)
2100-2200  Boot sequence (credential check → API load → nav('channels'))
2200-2220  DOMContentLoaded init
2220-2350  Ad block toggle + Switchback slot management
2350-2460  Switchback panel UI (slot display, jump, cycle, clear)
2460-2530  Previous channel + ad block badge
2530-2650  EPG-based ad detection engine (ported from IPTVviewer)
2650-2720  Player quality panel (inline)
2720-2800  Sleep timer
2800-2920  Recordings (tabs, storage bar, progress)
2920-3100  Favorites: Smart Categories, Smart Add modal, backup/restore
3100-3300  Quality screen (10s bandwidth test, health grid, server status)
3300-3500  Settings upgrade (Dezor, EPG URL, ad volume, timezone picker)
3500-3700  Provider config import (JSON, Xtream URL, M3U, base64, file, deep link)
3700-3780  Dezor playlist loader
3780-3870  Channel list (numbers, EPG subtitle, toast, fav stars, long-press)
3870-3910  Player extras injection (sleep timer button)
3910-3970  Settings toggle persistence
3970-4000  Channel number assignment + EPG search/jump
4000-4060  Pricing/plan activation
4060-4170  Channel row context menu (long-press Enter/touch → fav + SB assign + back-key dismiss)
4170-4430  Canonical nav() + D-pad navigation engine
              • tvSpatialNearest() for grid screens
              • DOM-order sequential nav for settings screen
              • Sidebar zone nav (ArrowUp/Down + ArrowRight → content)
4430-4510  Remote command listener (localStorage, WebSocket, LAN)
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
  DOMContentLoaded → nav('channels') → bootData()
    → No creds + no default? → nav('setup') (QR screen + credential polling)
    → No creds + default? → Apply bundled provider → continue
    → Has creds? → api('get_user_info') → validate auth
      → Promise.allSettled([get_live_categories, get_live_streams])
      → api('get_vod_*') + api('get_series_*') [background, non-blocking]
      → checkDeviceLicense() [fire-and-forget, never blocks]

Channel Play:
  User clicks channel (or Enter on focused row) → openPlayer(ch)
    → loadStream(ch) → HLS.js or .ts fallback
    → fetchCurrentEPG(ch) → epgCache update → detectAdFromEPG()
    → setInterval(detectAdFromEPG, 5000) + boundary-aware EPG re-fetch

Long-press (touch OR hold Enter 700ms):
  Channel row → showChRowContextMenu(ch)
    → Add/Remove Favorite, Assign to Switchback Slot, Cancel
    → Dismiss via: tap outside, Cancel, Back/Escape key

Provider Import:
  Paste/file/deep-link → parseProviderConfig(raw)
    → applyImportedConfig(cfg) → save to localStorage → bootData()

Back Key Priority:
  1. Dismiss smart-add-modal / context-menu / exit-dialog
  2. Close player overlay
  3. Pop screen history stack
  4. Show exit confirm (if on channels/tvhome)

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
| `index.html` | ~70KB | Full SPA: HTML structure + CSS (inline, ~1650 lines) |
| `app.js` | ~220KB | All JavaScript logic (~4500 lines) |
| `hls.min.js` | ~414KB | HLS.js adaptive streaming library |
| `remote.html` | ~15KB | Phone remote control UI (served on :8124) |

## Security Model

1. **LocalServer** — localhost only, SSRF-protected, no path traversal
2. **RemoteServer** — LAN only + 4-digit PIN on every request
3. **No hardcoded credentials** — user must enter or import (bundled default provider for first-run)
4. **Cleartext traffic** — required for Xtream API servers (most use HTTP)
5. **WebView cache nuked on upgrade** — prevents stale JS/HTML from persisting
6. **Device license check** — Supabase lookup, fire-and-forget (never blocks boot)

## D-pad Navigation Engine

The keyboard handler (`document.addEventListener('keydown', ...)`) implements zone-aware navigation:

1. **Sidebar zone**: ArrowUp/Down cycles sidebar items (including collapse button). ArrowRight enters content.
2. **Content zone (Settings)**: DOM-order sequential nav. ArrowDown = next focusable, ArrowUp = previous. Wraps at boundaries.
3. **Content zone (other screens)**: Spatial navigation via `tvSpatialNearest()`. Finds the nearest element in the arrow direction by computing geometric distance from element bounding rects.
4. **ArrowLeft in content**: Spatial search left; if nothing found, returns to sidebar.
5. **Enter/Space**: Activates focused element (click, toggle, open dropdown, trigger keyboard on inputs).
6. **Long-press Enter (700ms)**: On channel rows, triggers context menu via keydown/keyup timer.

## Proxy Resilience

- **JSON passthrough**: `LocalServer.handleProxy()` reads the error stream on non-2xx responses. If content starts with `[` or `{`, passes through as HTTP 200 + `application/json`. Handles providers returning HTTP 513 with valid data.
- **Server retry**: LocalServer retries 5xx errors up to 2x with backoff.
- **Client retry**: JS `api()` retries up to 3x with 2s/4s/6s delays before throwing.
