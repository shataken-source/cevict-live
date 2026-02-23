# IPTVviewer (Switchback TV) — Audit Report
**Date:** 2026-02-22

---

## What This App Is

**Switchback TV** is a React Native / Expo IPTV viewer for Android TV and mobile. It:

- Loads M3U playlists from any URL (or IPTV provider credentials)
- Plays live streams via `expo-av`
- Shows an EPG (Electronic Program Guide) from any XMLTV URL
- Tracks channel history and favorites (with smart auto-categorization)
- Detects and mutes/reduces volume during commercials (heuristic-based)
- Supports two IPTV providers: Link4TV and Dezor

**Screens:** Home → Player → EPG → Favorites → History → Settings  
**State:** Zustand store + AsyncStorage persistence  
**Services:** 31 service files covering EPG, ad detection, VPN, Chromecast, recording, weather, TMDB, TVMaze, and more

---

## Architecture

```
src/
├── screens/          # 7 screens (Home, Player, EPG, Favorites, History, Settings, Pricing)
├── services/         # 31 service files
├── store/useStore.ts # Zustand global state
├── types/index.ts    # Shared interfaces
├── hooks/            # Custom hooks
├── modules/          # Plugin/module system
├── components/       # EPG grid components
└── data/             # Sample playlist data
```

---

## Bugs Fixed (This Audit)

### 🔴 HIGH — `FavoritesScreen` wrong props interface (crash)
**File:** `src/screens/FavoritesScreen.tsx`  
**Problem:** Screen was exported as a named export (`export function`) and expected `onChannelSelect`/`onClose` callback props. But `HomeScreen` navigates to it via `navigation.navigate('Favorites')` — React Navigation passes `navigation` prop, not callbacks. The screen would crash immediately on open.  
**Fix:** Converted to `export default function`, replaced props with `navigation: any`, implemented `onChannelSelect` and `onClose` internally using `navigation.navigate('Player', { channel })` and `navigation.goBack()`.

---

### 🔴 HIGH — `handleDeletePlaylist` only persists to AsyncStorage, not Zustand store
**File:** `src/screens/SettingsScreen.tsx`  
**Problem:** Deleting a playlist saved the filtered list to AsyncStorage but never called any store action — the playlist remained visible in the UI until app restart.  
**Fix:** Added `setPlaylists` action to the Zustand store. `handleDeletePlaylist` now calls `setPlaylists(updatedPlaylists)` before saving to AsyncStorage. Also added a confirmation `Alert` before destructive delete.

---

### 🔴 HIGH — `setPlaylists` missing from Zustand store
**File:** `src/store/useStore.ts`  
**Problem:** No bulk-replace action existed for the playlists array. Required for delete to work correctly.  
**Fix:** Added `setPlaylists: (playlists: Playlist[]) => void` to the interface and implementation. Also widened `setCurrentPlaylist` to accept `Playlist | null` (needed when last playlist is deleted).

---

### 🟡 MEDIUM — `M3UParser.fetchAndParse` — no timeout, no HTTP error check
**File:** `src/services/M3UParser.ts`  
**Problem:** `fetch(url)` with no timeout would hang indefinitely on a dead server. Also, a 401/403/404 response would be silently parsed as an empty/invalid M3U rather than throwing an error.  
**Fix:** Added `AbortController` with 10-second timeout. Added `if (!response.ok)` check that throws `HTTP 4xx/5xx` with status text.

---

### 🟡 MEDIUM — `EPGService.parseXMLTVDate` ignores timezone offset
**File:** `src/services/EPGService.ts`  
**Problem:** XMLTV timestamps include a timezone offset (e.g. `20260222183000 +0000` or `20260222183000 -0500`). The parser ignored everything after the 14-digit datetime, creating dates in local time instead of UTC. This causes "Now Playing" to show the wrong program by hours.  
**Fix:** Parse the optional `[+-]HHMM` suffix, convert to offset minutes, and build the date via `Date.UTC()` minus the offset — producing a correct absolute UTC timestamp regardless of device timezone.

---

## Remaining Issues (Not Fixed — Need Decision)

### 🟡 MEDIUM — `autoPlay` toggle in Settings is disconnected
**File:** `src/screens/SettingsScreen.tsx:23`  
`const [autoPlay, setAutoPlay] = useState(true)` — this is local component state only. It's never read by the player, never persisted to AsyncStorage, and never stored in Zustand. The toggle appears in the UI but does nothing.  
**Fix needed:** Add `autoPlay` to the Zustand store and `PlaylistManager.saveSettings`, then read it in `PlayerScreen` to conditionally set `shouldPlay`.

---

### 🟡 MEDIUM — IPTV credentials not persisted
**File:** `src/screens/SettingsScreen.tsx`  
Username/password/server fields are local `useState` — cleared on every app restart. User must re-enter credentials each time.  
**Fix needed:** Add `IPTVCredentials` to `PlaylistManager.saveSettings` / `loadSettings`, and populate the fields in a `useEffect` on mount.

---

### 🟡 MEDIUM — `AdDetectionService` is heuristic-only, not real audio analysis
**File:** `src/services/AdDetectionService.ts`  
The "ad detection" uses time-based heuristics (commercial slots at :00/:15/:30/:45) and random probability simulation — it cannot actually analyze audio from the stream. On React Native, real audio level monitoring requires a native module (`react-native-audio-recorder-player` or similar).  
**Reality check:** This feature will mute at random intervals. Either wire it to a real audio analysis library or disable it by default and label it "experimental."

---

### 🟠 LOW — `Clipboard` deprecated import
**File:** `src/screens/FavoritesScreen.tsx:13`  
`import { Clipboard } from 'react-native'` is deprecated. Should be `import Clipboard from '@react-native-clipboard/clipboard'`.

---

### 🟠 LOW — `navigation: any` throughout all screens
All screens type `navigation` as `any`. Should use typed React Navigation props (`NativeStackScreenProps<RootStackParamList, 'Home'>` etc.) to catch route param bugs at compile time.

---

### 🟠 LOW — `EPGScreen` matches channels by `channel.id` not `tvgId`
**File:** `src/screens/EPGScreen.tsx:75`  
EPG programs use `channelId` from the XMLTV file (e.g. `"CNN.us"`), but the code matches against `channel.id` (e.g. `"link4tv-playlist-42"`). These will never match unless the playlist's `tvgId` is used instead.  
**Fix needed:** Match EPG programs against `channel.tvgId` first, fall back to `channel.id`.

---

### 🟠 LOW — `handleAddPlaylist` uses `alert()` instead of `Alert.alert()`
**File:** `src/screens/HomeScreen.tsx:198`  
`alert('Failed to load playlist...')` — `alert()` is the browser global, not the React Native `Alert` API. Works on some platforms but is not reliable on Android TV.

---

## Suggested Enhancements

These are genuinely useful additions for an Android TV IPTV app:

| Enhancement | Value | Effort |
|---|---|---|
| **Channel logo images** | Show `channel.logo` in channel list using `<Image>` | Low |
| **Group/category filter tabs** | Filter channel list by M3U `group-title` (Sports, News, Movies, etc.) | Low |
| **EPG tvgId matching fix** | Fix program guide to actually show correct "Now Playing" | Low |
| **Persist IPTV credentials** | Don't make user re-enter server/user/pass every restart | Low |
| **Channel number support** | Parse `tvg-chno` from M3U, allow number-pad channel switching | Medium |
| **Picture-in-Picture** | Android PiP mode when backgrounding the app | Medium |
| **Stream quality selector** | If provider offers multiple qualities, let user pick | Medium |
| **Playlist auto-refresh** | Re-fetch M3U on app start to pick up new channels | Medium |
| **Sleep timer UI** | `SleepTimerService` exists but has no UI — wire it up | Low |
| **Recording UI** | `RecordingService` exists but has no UI | High |
| **Chromecast button** | `ChromecastService` exists but has no UI | Medium |

---

## Services That Exist But Have No UI

The codebase has many services that are fully implemented but never called from any screen:

- `RecordingService.ts` — DVR recording
- `ChromecastService.ts` — Cast to TV
- `SleepTimerService.ts` — Auto-shutoff timer
- `TimeShiftBufferService.ts` — Pause/rewind live TV
- `VPNService.ts` / `SurfsharkService.ts` / `WireGuardNative.ts` — VPN integration
- `VoiceControlService.ts` — Voice commands
- `WeatherService.ts` — Weather overlay
- `NewsService.ts` — News ticker
- `TMDBService.ts` / `TVMazeService.ts` / `WatchmodeService.ts` — Metadata enrichment
- `ChannelSurfingService.ts` — Swipe-to-surf
- `GestureService.ts` — Gesture controls
- `DeviceLicensingService.ts` — License management
- `AnalyticsService.ts` — Usage analytics

These are all dead code until wired to screens. Prioritize `SleepTimerService` and `ChromecastService` — both are high-value, low-risk to add UI for.
