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
│   │   ├── index.html             # Full SPA UI (~1650 lines HTML/CSS)
│   │   ├── app.js                 # All application logic (~4500 lines)
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
- **Bandwidth test** — 10-second speed test with repeated fetches + ping averaging
- **Stream health** — Buffer %, FPS, latency, dropped frames from HLS.js stats

### Content
- **Live TV** — Full Xtream `get_live_streams` + `get_live_categories` with category pills
- **Movies (VOD)** — `get_vod_streams` + `get_vod_categories` with poster grid
- **Series** — `get_series` + `get_series_categories` + episode picker
- **EPG (TV Guide)** — `get_short_epg` per channel, time navigation, now-playing indicators, category filter dropdown
- **Catch-Up TV** — 7-day archive for `tv_archive=1` channels
- **Search** — Cross-content search (live + VOD + series)

### Channel Management
- **Switchback Slots** — 2 free / 4 Pro quick-switch slots with true channel swap
- **Favorites** — Star channels, Smart Categories (Sports/News/Movies/Kids/Music/Docs/Intl/Local), backup/restore to localStorage
- **★ Favorites in dropdowns** — Channel list and EPG category dropdowns include a "★ Favorites" filter option
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
- **Settings screen**: DOM-order sequential nav (ArrowUp/ArrowDown step through every element top-to-bottom)
- **Other screens**: Spatial navigation (nearest element in arrow direction)
- Tab key intercepted for controlled focus cycling
- Per-screen first-focus selectors (channels→category dropdown, search→input, etc.)
- Toggle switches, labels, checkboxes respond to Enter/Space
- Long-press Enter/OK on channel rows opens favorites context menu (keydown/keyup timer)
- Back key: dismisses modals → closes player → history stack → exit confirm
- Exit confirm Cancel properly dismisses and refocuses sidebar
- All modals (Smart Add, context menu, exit dialog) dismiss on Back/Escape key

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
| `user_timezone` | string | IANA timezone for EPG/clock (e.g. `America/Chicago`) |
| `fav_channels_backup` | JSON array | Backup copy of favorites |
| `fav_backup_date` | string | Timestamp of last favorites backup |

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

## Proxy (LocalServer) Resilience

- **JSON passthrough on non-2xx**: Many IPTV providers return non-standard HTTP codes (e.g. 513) but include valid JSON in the error stream. The proxy reads the full error body and if it looks like JSON (`[` or `{` prefix), passes it through as HTTP 200 with `application/json`.
- **Retry logic**: LocalServer retries 5xx errors up to 2 times with backoff. The JS `api()` function also retries 3 times with 2s/4s/6s delays.

## Timezone Support

- Timezone picker in Settings (injected below EPG URL field)
- Applies to `formatEpgTime()` and player clock via `Intl.DateTimeFormat` `timeZone` option
- Stored in `localStorage` as `user_timezone`

## Boot Sequence

1. `DOMContentLoaded` → `nav('channels')` (skips home screen, goes straight to Live TV)
2. `bootData()` checks credentials → applies bundled default provider if none
3. `api('get_user_info')` validates auth
4. `get_live_categories` + `get_live_streams` in parallel (`Promise.allSettled`)
5. VOD + Series categories/streams loaded in background (non-blocking)
6. Device license check (Supabase) — fire-and-forget, never blocks boot

## vs IPTVviewer (Deprecated)

IPTVviewer is a React Native / Expo app that was the original prototype. SwitchbackSimple supersedes it because:
- **No Expo build chain** — plain Gradle APK, no cloud builds needed
- **Smaller APK** — WebView + JS vs full React Native runtime
- **More features** — Switchback slots, language filter, phone pairing, full D-pad support
- **Simpler updates** — Change HTML/JS assets, rebuild APK
- **Better TV support** — Full keyboard/D-pad focus management built for Android TV

The only feature IPTVviewer had that SwitchbackSimple didn't was EPG-based ad detection with program boundary analysis — this has now been ported.

## Recent Changes (March 2026)

- **Boot to Live TV** — Skips home screen, goes straight to channel list
- **EPG category filter** — Dropdown on TV Guide screen to filter by category or favorites
- **Timezone picker** — Settings option to override EPG/clock timezone
- **Speed test 10s** — Extended from quick single-fetch to 10-second repeated fetch + ping averaging
- **Sidebar collapse button** — Accessible via D-pad (tabindex, focus ring)
- **Settings single-column layout** — Changed from 2-column grid to single column for D-pad accessibility
- **Settings sequential nav** — ArrowUp/ArrowDown steps through all elements in DOM order
- **★ Favorites in dropdowns** — Channel list + EPG dropdowns include favorites filter
- **Favorites backup/restore** — Replaced clipboard export with localStorage backup/restore
- **Long-press Enter** — Holding OK/Enter on channel row triggers context menu (add to favorites)
- **Modal dismiss** — All modals/menus close on Back/Escape key
- **API retry logic** — JS api() retries 3x with backoff; proxy passes JSON on non-2xx codes
- **Proxy JSON passthrough** — Handles providers returning HTTP 513 with valid JSON body
