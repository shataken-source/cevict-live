# CEVICT Command Center (TV Wallboard) — Deep Audit

**Audit date:** 2026-03-01  
**Scope:** The app that displays picks on your TV (`apps/progno/wallboard/`).  
**Method:** Code and config only; every finding cites file and line or exact string.

---

## 1. Identity and location

| Item | Evidence |
|------|----------|
| **Name** | CEVICT Command Center v3 (TV Wallboard) |
| **Location** | `C:\cevict-live\apps\progno\wallboard\` |
| **References** | `app.js` L2: `// CEVICT COMMAND CENTER v3 — REAL DATA`; `styles.css` L2: `CEVICT COMMAND CENTER — TV WALLBOARD (75" OPTIMIZED)`; `index.html` L7: `<title>CEVICT Command Center</title>`; `package.json` L4: `"description": "CEVICT Sports Trading Command Center - TV Wallboard"`; `README.md` L1: `# CEVICT Command Center - TV Wallboard` |
| **Entry points** | `index.html` (UI), `app.js` (logic), `server.js` (Node server) |
| **Start command** | `npm start` → `node server.js` (`package.json` L5) |
| **Port** | **3434** — `server.js` L7: `const PORT = 3434`; L87: `app.listen(PORT, '0.0.0.0', ...)` |

---

## 2. Architecture

- **Server:** Express on port 3434, binds `0.0.0.0` so the TV on the same network can open `http://<host-ip>:3434`.
- **API:** All `/api/*` requests are **proxied** to `localhost:3008` (progno Next.js). `server.js` L8: `const API_PORT = 3008`; L46–52: proxy `hostname: 'localhost', port: API_PORT`.
- **Static:** `express.static(path.join(__dirname, 'public'))` then `express.static(__dirname)` with `index: false`; `GET /` serves `index.html` via `res.sendFile(path.join(__dirname, 'index.html'))` (L77–79). So `index.html`, `app.js`, `styles.css` are served from the wallboard directory.
- **Progno must be running on 3008** for the wallboard to get data; `apps/progno/package.json` L8,L10: `"dev": "next dev -p 3008"`, `"start": "next start -p 3008"`.

---

## 3. Data flow (where picks come from)

Picks are loaded in `app.js` by `loadPicks()` (L211–265), which:

1. **Kalshi path (currently no-op):** Calls `loadKalshiPicks(today)` and `loadKalshiPicks(yesterday)`. `loadKalshiPicks` (L199–203) always returns `[]` with comment: "Kalshi-matched picks are not available via a separate endpoint yet."
2. **Primary path — progno picks API:** For `today` and `yesterday` (UTC date strings), fetches `API + '/progno/picks?date=' + date` (L222). Expects JSON with `data.picks` and `data.source` (L224–226).
3. **Fallback — progno predictions API:** If picks are still empty, fetches `API + '/progno/predictions?date=' + date` (L232) and maps response to pick shape (L234–246).
4. **Filtering:** `state.games` is set from `transformPicks(raw)` then filtered to **today CST** only (L258–262): `getGameDateCst(g.gameTime) === todayCst` (CST from `getTodayCst()`, L206–211).
5. **Live scores:** After picks are set, `loadLiveScores()` (L364) is called; it hits **ESPN directly** (not via proxy): `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard` (L374). `ESPN_SPORTS` map in `app.js` L11–20 maps sport keys to ESPN path.

**Other API usage (all via proxy to 3008):**

| Purpose | URL | Evidence |
|---------|-----|----------|
| Stats (ROI, etc.) | `GET /api/progno/predictions/stats` | `app.js` L428 |
| “My Bets” (actual_bets) | `GET /api/progno/wallboard/bets` | `app.js` L764 |
| Kalshi price watch | `GET /api/progno/kalshi/market?ticker=...` | `app.js` L674 |

**Backend routes verified to exist:**

- `app/api/progno/picks/route.ts` — exists (progno app).
- `app/api/progno/predictions/route.ts` — exists.
- `app/api/progno/predictions/stats/route.ts` — exists.
- `app/api/progno/wallboard/bets/route.ts` — exists; returns `actual_bets` for today CST and summary (verified in route).
- `app/api/progno/kalshi/market/route.ts` — exists.

---

## 4. Proxy security (server.js)

- **Allowlist:** Only paths in `ALLOWED_PROXY_PREFIXES` (L13–26) are proxied; e.g. `/api/progno/picks`, `/api/progno/predictions`, `/api/progno/wallboard/`, `/api/progno/kalshi/`. Admin/trading/cron are not in the list.
- **Method:** Only `GET` is allowed; L36–38: `if (req.method !== 'GET' || !isProxyAllowed(apiPath)) return res.status(403).json({ error: '...' })`.
- **Headers:** Before forwarding, `authorization`, `x-admin-secret`, and `cookie` are removed (L41–44).

---

## 5. WebSocket (/ws) — not implemented

- **Client:** `app.js` L170–184 connects to `ws://${window.location.host}/ws` (or wss if HTTPS), handles `score_update`, `odds_update`, `steam_alert`, and on close reconnects after 8s.
- **Server:** `server.js` does **not** register any WebSocket server or `/ws` handler. No `require('ws')` or upgrade logic. So the browser’s WebSocket to `/ws` will fail (404 or non-Upgrade response) and the “stream” dot stays disconnected.
- **README:** README.md L53–54 says “WebSocket at `/ws` for real-time updates” and documents message types — **documentation is wrong**; real-time updates are not available.

---

## 6. Documentation vs implementation

| README claim | Actual code |
|--------------|-------------|
| `/api/v1/predictions` | Not used. Code uses `/api/progno/predictions` and `/api/progno/picks`. |
| `/api/v1/kalshi-bets?tier=elite` | Not used. Kalshi data comes from picks that have `_kalshi` and from `/api/progno/kalshi/market?ticker=...`. |
| WebSocket at `/ws` | Not implemented on server; connection always fails. |

---

## 7. Audio assets — missing

- **HTML:** `index.html` L274–275 references `crowd-cheer.mp3` and `crowd-disappointment.mp3` (no path; same origin).
- **Check:** No `.mp3` files under `apps/progno/wallboard/` (search by glob `*.mp3` returns 0 files).
- **Effect:** Sound effects for score changes (e.g. `playSound('cheer')` / `'booSound'`) will 404; `el.play().catch(...)` (L155–159) will fail. Alerts and visuals still work.

---

## 8. Bugs fixed during audit

- **app.js L15:** `MLB: 'baseball/mlb',.` had a trailing period after the comma, causing a syntax error. Fixed to `MLB: 'baseball/mlb',`.
- **app.js L16:** `NCAA: 'basketball/mens-college-basketballi'` had a typo (trailing `i`). Fixed to `'basketball/mens-college-basketball'` (same as NCAAB).

---

## 9. Polling and timers

| Interval | Purpose | Evidence |
|----------|---------|----------|
| 10 s | Live scores (ESPN) + ticker + hero/edge/position refresh | `SCORES_MS = 10000`, `app.js` L7, L424–432 |
| 2 min | Full picks reload | `PICKS_REFRESH_MS = 120000`, L8, L435–441 |
| 5 min | Stats (ROI, etc.) | `REFRESH_MS = 300000`, L6, L434 |
| 60 s | “My Bets” (wallboard/bets) | L444–446 |
| 60 s | Kalshi price watch (per-ticker) | L721; first run after 10s (L723) |
| 8 s | Intel rotator (MODEL STATUS / SHARP ACTION / AT A GLANCE) | L627–630 |
| 15 s | Sound throttle (min gap between cheer/boo) | `SOUND_THROTTLE = 15000`, L9 |

---

## 10. Sample data

- `injectSampleData()` (L34–91) fills `state.games`, `state.myBets`, `state.myBetsSummary`, etc., for demo. It is **never called** from `init()` (L88–101). So the wallboard does not show sample data on load; it only shows data from APIs (or “No picks today” if APIs return empty).

---

## 11. Summary table

| Item | Status | Notes |
|------|--------|--------|
| Location | ✅ | `apps/progno/wallboard/` |
| Port | ✅ | 3434 (TV), proxy to 3008 (progno) |
| Picks source | ✅ | `/api/progno/picks` then `/api/progno/predictions` fallback |
| My Bets source | ✅ | `/api/progno/wallboard/bets` (actual_bets, today CST) |
| Live scores | ✅ | Direct ESPN API |
| Proxy allowlist | ✅ | GET only, no admin routes |
| WebSocket /ws | ❌ | Not implemented; doc wrong |
| README API URLs | ❌ | /api/v1/* not used |
| Audio files | ❌ | crowd-cheer.mp3, crowd-disappointment.mp3 missing |
| Syntax/typo (ESPN map) | ✅ Fixed | L15 comma+period; L16 NCAA typo |

---

## 12. How to run for TV

1. Start **progno** on port 3008: from `apps/progno`, `npm run dev` or `npm start`.
2. Start **wallboard**: from `apps/progno/wallboard`, `npm install` (once), then `npm start`.
3. On TV browser (or laptop): open `http://<machine-ip>:3434` (or `http://localhost:3434` on host). Allow port 3434 in Windows Firewall for private networks if the TV cannot connect.
4. Optional: add `crowd-cheer.mp3` and `crowd-disappointment.mp3` to the wallboard folder so score sound effects work.
