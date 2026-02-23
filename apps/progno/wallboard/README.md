# CEVICT Command Center - TV Wallboard

A real-time sports trading command center designed for TV viewing.

## 🚀 Quick Start (Easiest for TV)

1. **Install dependencies** (one time only):
   ```bash
   cd c:\cevict-live\apps\progno\wallboard
   npm install
   ```

2. **Start the server**:
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
