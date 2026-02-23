# CEVICT Command Center - TV Wallboard

Your ultimate sports betting monitoring dashboard for watching games.

## 🎯 What It Does

Real-time monitoring dashboard that displays beside your TV while watching games. Tracks all your bets, shows live scores, alerts on important events, and plays audio feedback when your picks score.

## ✨ Features

### 📊 Stats Dashboard (6 Real-Time Metrics)
- **Today P&L**: Live profit/loss calculation with color coding (green/red)
- **Win Rate**: Win percentage with W-L-P record
- **Live Bets**: Number of active bets in play
- **Kalshi**: Total value of Kalshi positions
- **Polymarket**: Ready for when legal in USA (stub)
- **Alerts**: Count of active alerts

### 💰 Bet Tracking
- **Auto-saves to browser** (localStorage - never lose your bets)
- **Manual bet entry** - Click ➕ Add Bet button
- **Click ⚙️ to cycle bet results**: pending → win → loss → push
- **P&L auto-calculation** based on odds and stakes
- **Visual status**: Green dot (win), Red dot (loss), Yellow dot (push)

### 📈 Kalshi Integration
- Click "📈 Kalshi" to load positions
- Tries `/api/markets/kalshi/positions` endpoint
- Falls back to demo data if API not ready
- Separate tracking from manual bets

### 🪙 Polymarket Stub
- Click "🪙 Polymarket" button
- Shows "🚧 Not yet legal in USA - stub ready for future"
- Infrastructure ready for when legalized
- Will use `/api/markets/polymarket/positions`

### 🏀 Live Scores
- Rotates through NBA, NCAAB, NHL, MLB, NFL every 15 seconds
- Shows live scores with Final/Live badges
- Hover effects with gradient borders
- Click to see details

### 🔊 Audio Feedback
- **Crowd cheer MP3** (`./crowd-cheer.mp3`) when your pick scores
- **Disappointment MP3** (`./crowd-disappointment.mp3`) when opponent scores
- Fallback to synthesized audio if MP3s missing
- Toggle with M key or 🔊 button

### 🎨 Visual Feedback
- **Green glow + pulse** when your bet's team scores
- **Red glow + pulse** when opponent scores
- Massive scaling (108%) with shadow effects
- Animations last 1.2 seconds

### 🚨 Alert System
- **Red alerts**: Critical (scoring plays, lead changes, big line moves)
- **Yellow alerts**: Medium (moderate line moves, starting soon)
- **Green alerts**: Info (data loaded, picks loaded)
- Auto-plays tones based on severity
- Scrolling ticker at bottom

### ⌨️ Keyboard Shortcuts
- **M** - Toggle mute
- **P** - Paste picks JSON
- **B** - Paste bets JSON
- **L** - Load today's predictions
- **E** - Load early lines
- **T** - Test alert
- **C** - Test crowd/boo audio

## 🚀 How to Use

### Initial Setup
1. Open `c:\cevict-live\apps\progno\cevict-tv-wallboard\index.html` in browser
2. Press F11 for fullscreen
3. Display on TV/second monitor beside your main TV

### Adding Bets

**Method 1: Manual Entry**
1. Click ➕ Add Bet button
2. Enter: Away Team, Home Team, Your Pick, Odds, Stake
3. Bet auto-saves to browser

**Method 2: Load from Kalshi**
1. Click 📈 Kalshi button
2. Positions load automatically
3. Updates Kalshi stat card

**Method 3: Paste JSON**
1. Press B key or click 💼 Paste Bets
2. Paste JSON: `{bets: [{home_team, away_team, side, stake, price}]}`
3. Bets merge with existing

### Tracking Results

**During Game:**
- Watch live scores update every 15 seconds
- Hear crowd cheer when your pick scores
- See green glow animation on that game
- Hear boo when opponent scores

**After Game:**
- Click ⚙️ on any bet to cycle result
- Pending → Win → Loss → Push → Pending
- P&L updates automatically
- Win rate recalculates

### Loading Predictions
1. Press L key or click 📅 Today's Predictions
2. Loads from Supabase via `/api/progno/picks`
3. Shows in alerts panel
4. Updates Active Picks stat

## 📁 File Structure

```
cevict-tv-wallboard/
├── index.html              # Main wallboard (all-in-one file)
├── crowd-cheer.mp3         # Audio for good events
├── crowd-disappointment.mp3 # Audio for bad events
└── README.md              # This file
```

## 🎵 Audio Files

Place these MP3 files in the same folder as `index.html`:

- **crowd-cheer.mp3**: Plays when your pick scores
- **crowd-disappointment.mp3**: Plays when opponent scores

If missing, wallboard uses synthesized audio fallback.

## 💾 Data Persistence

**Bets**: Saved to browser localStorage as `cevict_wallboard_bets`
- Survives page refresh
- Persists across sessions
- Clear browser data to reset

**Kalshi/Polymarket**: Session only (not saved)
- Reload each time you open wallboard
- Click buttons to refresh

## 🔧 API Endpoints Used

- `/api/progno/v2?action=live-scores&sport=X` - Live scores
- `/api/progno/v2?action=games&sport=X` - Odds/lines
- `/api/progno/picks?date=YYYY-MM-DD` - Daily predictions
- `/api/markets/kalshi/positions` - Kalshi positions
- `/api/markets/polymarket/positions` - Polymarket (future)

## 🎨 Color System

- **Green** (#10b981): Wins, good events, info
- **Red** (#ef4444): Losses, bad events, critical
- **Yellow** (#f59e0b): Pushes, warnings, medium
- **Blue** (#3b82f6): Technical, headers, accents
- **Purple** (#a855f7): Gradients, highlights
- **Cyan** (#06b6d4): Labels, secondary accents

## 📊 Stats Calculations

**P&L Formula:**
```javascript
For each WIN:
  if odds > 0: profit = stake * (odds / 100)
  if odds < 0: profit = stake * (100 / abs(odds))
  pnl += profit

For each LOSS:
  pnl -= stake
```

**Win Rate:**
```javascript
winRate = (wins / (wins + losses)) * 100
```

## 🐛 Troubleshooting

**No audio playing:**
- Check browser autoplay settings
- Click anywhere on page to enable audio
- Press M to unmute
- Check MP3 files exist

**Bets not saving:**
- Check browser localStorage enabled
- Not in incognito/private mode
- Clear old data if corrupted

**Kalshi not loading:**
- API endpoint may not be ready
- Uses demo data as fallback
- Check console for errors

**Scores not updating:**
- Check internet connection
- API may be rate-limited
- Refresh page to restart

## 🎯 Pro Tips

1. **Fullscreen mode** (F11) for best experience
2. **Add bets before games start** for live tracking
3. **Use keyboard shortcuts** for quick actions
4. **Click ⚙️ to update results** as games finish
5. **Load predictions daily** with L key
6. **Test audio** (C key) before games start
7. **Mute during commercials** (M key)

## 🚀 Future Enhancements

When Polymarket is legal in USA:
- Full Polymarket integration ready
- Same tracking as Kalshi
- Auto-load positions
- P&L calculations

## 📝 Notes

- Designed for 1920x1080+ displays
- Best on Chrome/Edge (WebAudio support)
- Works offline after initial load
- No server required (static HTML)
- All data stays in your browser

---

**Built for**: Watching games with real-time bet tracking  
**Perfect for**: Second monitor beside TV  
**Status**: Production ready 🚀
