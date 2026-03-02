# Switchback TV Remote – LAN mode setup

The phone remote can control the TV app over your local network (LAN) using a small WebSocket server.

**Modes:** Use the tabs at the top to switch between **Switchback TV** (slots, guide, DVR, etc.) and **Universal** (power, volume, input, D-pad, number pad). Universal sends `u_*` actions over the same connection; Switchback TV ignores them. You can add an IR blaster or HDMI-CEC bridge that listens for `u_*` to control other devices.

## 1. Start the server

On a machine that is on the same LAN as both the **phone** and the **TV** (e.g. your PC, Raspberry Pi, or the same computer where the TV app runs in a browser):

```bash
cd apps/IPTVviewer/website
npm install
npm run remote-server
```

Default port: **8765**. To use another port:

```bash
node remote-server.js 9876
# or
REMOTE_SERVER_PORT=9876 node remote-server.js
```

Leave this terminal running.

## 2. Connect the phone (remote)

1. Open the remote in your phone browser: `https://your-site.com/remote.html` (or the URL where the website is hosted).
2. Tap the connection label (top right) to open the connect modal.
3. Choose **LAN / Network**.
4. Enter the **IP address** of the machine where the server is running (e.g. `192.168.1.10`). Do not include port; the remote uses 8765.
5. Tap **Connect**. You should see "✓ Connected!".

## 3. Connect the TV app

- **IPTVviewer website (browser):** The page connects automatically to `ws://(your host):8765`. If the server runs on the same host as the website, it works with no config. If the server runs on another machine, set before loading the TV page:
  - In the browser console: `localStorage.setItem('remote_ws_server', '192.168.1.10');` then reload.
- **SwitchbackSimple (Android TV):** The app tries `localhost:8765` first, then `remote_ws_server` from localStorage. To use a server on another machine (e.g. Pi), set the server IP once (e.g. from a settings screen or dev tools):  
  `localStorage.setItem('remote_ws_server', '192.168.1.10');` then restart the app.

## 4. Same-device mode (no server)

If the remote and the TV app are open in the **same browser** (e.g. two tabs on the same PC), use **Same Device** in the connect modal. Commands and state sync via `localStorage`; no server or LAN needed.
