# Feature Status: What Works vs Placeholder

This doc clarifies which documented features are fully working vs stubbed.

## Working

- **Previous channel** – On-screen "Previous (channel name)" button; Back (hardware or in-app) returns to channel list.
- **M3U playlists** – Add by URL, load sample, Link4TV/Dezor; persisted via `react-native-fs`.
- **Favorites** – Star channels; filter by Favorites; persisted and restored on launch.
- **Search & filter** – Search by name/group; All / Favorites filter.
- **Channel history** – Store tracks last 50 channels (state only; not yet shown in UI).
- **Auto-hide controls** – Player controls hide after 5s; tap screen to show again.
- **Volume control** – On-screen Vol +/- and mute; value from store.
- **Ad detection (simulated)** – Toggle and volume reduction % in Settings; Player uses store config. No real audio analysis (would require native audio access).

## Partially working / Placeholder

- **EPG** – **Working:** Set an XMLTV URL in Settings → EPG; it’s persisted and the Player shows “Now: [program title]” for the current channel (match by `tvg-id`). Cached 1 hour.
- **Module system** – **Working:** Settings → Modules lists installed modules. Load/Unload run or stop a module. **Install from ZIP** uses [react-native-zip-archive](https://github.com/mockingbot/react-native-zip-archive): enter the full path to a .zip that contains manifest.json (at root or in a single folder), then tap Install from ZIP. The loader uses `new Function()` so only simple JS modules work; React/TSX would need bundling.
- **VPN** – UI and Connect/Disconnect are present; connection is simulated. **Surfshark server list** is wired: Settings → VPN → “Show” under Surfshark servers fetches [api.surfshark.com/v4/server/clusters](https://api.surfshark.com/v4/server/clusters); tap a server to set it as VPN Server. Real connect still needs a native WireGuard library and Surfshark auth. (e.g. [react-native-simple-openvpn](https://github.com/ccnnde/react-native-simple-openvpn) or [wireguard-native-bridge](https://www.npmjs.com/package/wireguard-native-bridge)). To support **Surfshark and several choices**: add one VPN library, then the app can support multiple configs—Surfshark, NordVPN, etc. often provide OpenVPN (.ovpn) or WireGuard configs you’d paste or select per profile.
- **Remote control** – Back button works (Android `BackHandler`). D-pad “Select = previous channel” is not wired; use the on-screen Previous button.

## Tech notes

- **TVEventHandler** was removed from Player (undefined `this` in function components; API not reliable in standard React Native). Back and on-screen buttons are used instead.
- **Ad detection** – Uses store `adConfig` (enabled + volumeReductionPercent). Settings changes apply when you return to the player.
