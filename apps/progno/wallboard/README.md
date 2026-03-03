# CEVICT Command Center - TV Wallboard

A real-time sports trading command center designed for TV viewing.

## 🚀 Quick Start (Easiest for TV)

1. **Install dependencies** (one time only):
   ```bash
   cd c:\cevict-live\apps\progno\wallboard
   npm install
   ```

2. **Start the server (local Progno)**:
   ```bash
   npm start
   ```

3. **Access on TV** (choose one):
   - **Option A - Cast from Chrome**:
     - Open `http://localhost:3434` on your laptop
     - Click the Cast icon in Chrome
     - Select your TV

   - **Option B - TV Browser**:
     - Scan the QR code shown in terminal with your phone
     - Send link to TV or bookmark it

   - **Option C - Direct URL**:
     - On TV browser: `http://[YOUR-LAPTOP-IP]:3434`
     - Find your IP: `ipconfig` (look for IPv4 Address)

4. **Press F11** for fullscreen

## 🔗 Running Against Production Progno & Alpha-hunter

The wallboard reads data from whatever Progno deployment you point it at. In production you want it to use your **live Progno instance**, which already reflects real bets placed by **alpha-hunter** (via Supabase).

### 1. Choose the Progno base URL

- If you use the default Vercel deployment:
  - `https://prognoultimatev2-cevict-projects.vercel.app`
- If you have a custom domain (recommended):
  - Use that instead, e.g. `https://progno.yourdomain.com`

You can confirm the production domain in **Vercel → progno project → Settings → Domains**.

### 2. Set `PROGNO_BASE_URL` and start wallboard

From PowerShell on your main machine:

```powershell
cd C:\cevict-live\apps\progno\wallboard

# Point wallboard at production Progno (replace with your actual domain if different)
$env:PROGNO_BASE_URL = "https://prognoultimatev2-cevict-projects.vercel.app"

npm install   # first time only
npm start
```

The wallboard server (`server.js`) will:

- Listen on `http://localhost:3434`
- Proxy safe, read-only API calls (e.g. `/api/progno/picks`, `/api/progno/predictions`, `/api/progno/wallboard/...`) to `PROGNO_BASE_URL`
- Never forward admin, trading, or cron endpoints

As long as **alpha-hunter in production** is writing bets and results into the same Supabase project that Progno uses, those results will appear on the wallboard automatically.

### 3. View on TV using production data

Once `npm start` is running with `PROGNO_BASE_URL` set:

- On this machine: open `http://localhost:3434` and press **F11** or **F** for fullscreen.
- On a TV on the same network:
  - Open `http://[YOUR-LAPTOP-IP]:3434` in the TV browser.
  - If it can’t connect, allow port **3434** in Windows Firewall (Private networks).
- Or cast from Chrome while viewing `http://localhost:3434`.

## Features

- **Live Game Ribbon**: Scrolling ticker showing all active games with scores, win probability, and edge
- **Primary Game Panel**: Detailed view of selected game with live probability gauge and edge metrics
- **Position Tracking**: Real-time display of open bets with live EV and P/L
- **Bankroll Management**: Visual risk meter and exposure tracking
- **Audio Feedback**: Sound effects for significant events (scores, probability swings)
- **Rotating Intel**: Weather, injuries, and trend data
- **Performance Metrics**: ROI, accuracy, and edge tracking

## Keyboard Shortcuts

- **F** or **F11**: Toggle fullscreen mode

## Data Sources

The wallboard connects to your existing API endpoints:
- `/api/v1/predictions` - Live game predictions
- `/api/v1/kalshi-bets?tier=elite` - Active positions
- WebSocket at `/ws` for real-time updates

## WebSocket Message Format

```javascript
{
  type: 'score_update' | 'odds_update' | 'prediction_update' | 'bet_result',
  payload: {
    gameId: string,
    // ... event-specific data
  }
}
```

## Customization

Edit `styles.css` to adjust:
- Colors and theme
- Font sizes for different screen sizes
- Animation speeds
- Layout proportions

## TV Optimization

Designed for 55-65" displays at 8-12 feet viewing distance:
- Large, bold typography
- High contrast colors
- Passive consumption (no interaction required)
- Auto-scrolling and rotating content
