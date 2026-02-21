# Early Lines System - Complete Documentation Index

## 🎯 Overview

The Early Lines System is a comprehensive sports betting intelligence platform that captures early odds (2-5 days before games), tracks injuries and breaking news, detects line movements, and identifies line-move arbitrage opportunities.

### Quick Stats
- **154 games** monitored with early odds
- **639 injuries** tracked with impact scores
- **11+ sportsbooks** aggregated
- **3 sports** supported (NFL, NBA, NCAAB)
- **Real-time** injury and news monitoring

---

## 📚 Documentation

### For Developers

1. **[Technical Documentation](./EARLY_LINES_TECHNICAL_DOCUMENTATION.md)**
   - Complete system architecture
   - Component details and data flow
   - Data models and type definitions
   - Performance optimization
   - Testing strategies

2. **[API Guide](./EARLY_LINES_API_GUIDE.md)**
   - API endpoint reference
   - Request/response examples
   - Query parameters
   - Integration examples (React, Python, etc.)
   - Rate limits and best practices

3. **[Setup Guide](./EARLY_LINES_SETUP_GUIDE.md)**
   - Step-by-step installation
   - Environment configuration
   - Testing procedures
   - Deployment to Vercel
   - Maintenance tasks

### For Strategy

4. **[Strategy Overview](./EARLY_LINES_STRATEGY.md)**
   - Early lines betting strategy
   - Line-move arbitrage explained
   - When to bet early vs regular
   - Hedge calculations

5. **[Implementation Notes](./EARLY_LINES_IMPLEMENTATION.md)**
   - Original implementation plan
   - Component breakdown
   - Data sources overview

6. **[Research Notes](./early-lines-gold.txt)**
   - Finding earliest odds
   - Sharp sportsbooks
   - Breaking news sources
   - Weather integration ideas

---

## 🚀 Quick Start

### 1. Get API Key
Visit https://the-odds-api.com/ and sign up for free (500 requests/month)

### 2. Configure Environment
```bash
# Add to apps/progno/.env.local
THE_ODDS_API_KEY=your_api_key_here
```

### 3. Start Server
```bash
cd apps/progno
npm run dev
```

### 4. Test API
```bash
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA"
```

### 5. Access Dashboard
Open `http://localhost:3008/progno/admin` → Click **EARLY LINES** tab

---

## 🏗️ System Architecture

```
Data Sources → Aggregator → API Endpoint → Admin Dashboard
     ↓              ↓             ↓              ↓
The Odds API   Early Odds    /api/early-   Early Lines
ESPN API       Aggregator    lines/        Section
Action Net     Injury/News   analysis      Component
               Tracker
               Line-Move
               Arb Detector
```

---

## 📊 Key Features

### Early Odds Aggregation
- Fetches odds from **11+ sportsbooks** via The Odds API
- Captures odds **2-5 days before games**
- Supports moneyline, spread, and totals
- Deduplicates by gameId

### Injury Tracking
- Real-time injury reports from **ESPN Hidden API**
- Impact scoring (0-100) based on:
  - Player position (QB, P, SP = high impact)
  - Injury status (out, doubtful, questionable)
  - Player stats (starter vs bench)
- Visual impact badges in admin UI

### Breaking News Monitoring
- ESPN news feed integration
- Odds impact assessment (High/Medium/Low)
- Keywords: "out for season", "suspended", "traded", "fired"
- Team-specific filtering

### Line Movement Detection
- Compares early odds to current odds
- Flags significant movements:
  - Moneyline: >3 points
  - Spread: >1.5 points
  - Total: >3 points
- Infers movement reasons from injury/news

### Arb Opportunity Detection
- Compares early picks to regular picks
- Identifies when picks flip sides
- Calculates combined EV
- Suggests hedge stakes
- Enriches with injury/news context

---

## 🎮 Usage Examples

### Fetch Early Odds
```bash
# Single sport
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA"

# Multiple sports
curl "http://localhost:3008/api/early-lines/analysis?sports=NFL,NBA,NCAAB"

# Custom days ahead
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA&daysAhead=5"
```

### Admin Dashboard
1. Navigate to `http://localhost:3008/progno/admin`
2. Click **EARLY LINES** tab
3. Enter sports: `NBA,NFL,NCAAB`
4. Click **Fetch Early Lines**
5. View odds, injuries, news, and arbs

### Programmatic Usage
```typescript
import { EarlyOddsAggregator } from '@/app/lib/early-odds-aggregator';

const aggregator = new EarlyOddsAggregator();
const odds = await aggregator.aggregateEarlyOdds(['NBA'], 3);

console.log(`Found ${odds.length} games with early odds`);
```

---

## 📁 File Structure

```
apps/progno/
├── app/
│   ├── api/
│   │   └── early-lines/
│   │       └── analysis/
│   │           └── route.ts              # Main API endpoint
│   ├── lib/
│   │   ├── early-odds-aggregator.ts      # Odds aggregation
│   │   ├── injury-news-tracker.ts        # Injury/news tracking
│   │   ├── line-move-arb-detector.ts     # Arb detection
│   │   └── odds-sources/
│   │       └── the-odds-api.ts           # The Odds API integration
│   └── progno/
│       └── admin/
│           └── page.tsx                  # Admin dashboard
├── components/
│   └── admin/
│       └── EarlyLinesSection.tsx         # Early Lines UI
├── docs/
│   ├── EARLY_LINES_TECHNICAL_DOCUMENTATION.md
│   ├── EARLY_LINES_API_GUIDE.md
│   ├── EARLY_LINES_SETUP_GUIDE.md
│   ├── EARLY_LINES_STRATEGY.md
│   ├── EARLY_LINES_IMPLEMENTATION.md
│   ├── README_EARLY_LINES.md             # This file
│   ├── early-lines-gold.txt
│   ├── early-lines-gold2.txt
│   └── early-lines-gold3.txt
└── .env.local                            # Environment variables
```

---

## 🔧 Configuration

### Environment Variables
```bash
# Required
THE_ODDS_API_KEY=your_key_here

# Optional (future enhancements)
NEWS_API_KEY=your_news_api_key
OPENWEATHER_API_KEY=your_weather_api_key
SLACK_WEBHOOK_URL=your_slack_webhook
```

### Supported Sports
- `NFL` - National Football League
- `NCAAF` - College Football
- `NBA` - National Basketball Association
- `NCAAB` - College Basketball
- `MLB` - Major League Baseball
- `NHL` - National Hockey League

### Supported Sportsbooks
FanDuel, DraftKings, BetMGM, Caesars, BetRivers, BetOnline.ag, Bovada, BetUS, MyBookie.ag, Fanatics, LowVig.ag

---

## 🚢 Deployment

### Vercel (Production)

1. **Set environment variables** in Vercel dashboard
2. **Push to git**: `git push`
3. **Verify deployment**: `curl "https://your-domain.vercel.app/api/early-lines/analysis?sports=NBA"`

### Local (Development)

1. **Install dependencies**: `npm install`
2. **Set environment variables**: Edit `.env.local`
3. **Start server**: `npm run dev`
4. **Test**: `curl "http://localhost:3008/api/early-lines/analysis?sports=NBA"`

---

## 📈 Performance

### Response Times
- **Odds only**: ~5 seconds
- **With injuries/news**: ~30 seconds
- **Cached**: <1 second

### API Limits
- **The Odds API**: 500 requests/month (free tier)
- **ESPN API**: No documented limits (use responsibly)

### Optimization Tips
1. **Cache results** for 5-10 minutes
2. **Use `includeInjuries=false`** for faster responses
3. **Limit sports** to only what you need
4. **Implement rate limiting** to avoid quota exhaustion

---

## 🐛 Troubleshooting

### No odds data returned
- Check API key is set in `.env.local`
- Restart server: `npm run dev`
- Verify quota: `curl -I "https://api.the-odds-api.com/v4/sports/?apiKey=YOUR_KEY"`

### 401 Unauthorized
- Verify API key is correct
- Check environment variable name: `THE_ODDS_API_KEY`
- Restart server

### Slow response
- Use `includeInjuries=false&includeNews=false`
- Reduce number of sports
- Implement caching

### Admin dashboard blank
- Check browser console for errors
- Verify server is running
- Clear browser cache

---

## 🎯 Workflow

### Daily Workflow

1. **Morning (8 AM)**
   - Check admin dashboard for new early odds
   - Review injury reports
   - Note significant line movements

2. **Early Run (2-5 days before games)**
   - Generate early picks
   - Save to `predictions-early-YYYY-MM-DD.json`
   - Place early bets on +EV opportunities

3. **Regular Run (0-2 days before games)**
   - Generate regular picks
   - Save to `predictions-YYYY-MM-DD.json`
   - Check for line-move arbs

4. **Arb Execution**
   - Review arb opportunities in admin dashboard
   - Calculate hedge stakes
   - Place hedge bets if profitable

5. **Evening**
   - Track results
   - Update strategy based on performance

---

## 📊 Data Models

### Early Odds
```typescript
{
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  capturedAt: string;
  source: string;
  odds: {
    homeML?: number;
    awayML?: number;
    spread?: number;
    spreadOdds?: number;
    total?: number;
    overOdds?: number;
    underOdds?: number;
  };
}
```

### Injury Report
```typescript
{
  playerId: string;
  playerName: string;
  team: string;
  sport: string;
  status: 'out' | 'doubtful' | 'questionable' | 'probable' | 'day-to-day';
  injury: string;
  lastUpdate: string;
  impactScore?: number; // 0-100
}
```

### Breaking News
```typescript
{
  id: string;
  headline: string;
  description: string;
  sport: string;
  teams: string[];
  publishedAt: string;
  source: string;
  oddsImpact: 'high' | 'medium' | 'low';
}
```

### Arb Opportunity
```typescript
{
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  earlyPick: Pick;
  earlyOdds: number;
  regularPick: Pick;
  currentOdds: number;
  pickFlipped: boolean;
  combinedEV: number;
  hedgeOpportunity: boolean;
  triggerNews?: string[];
  injuryReports?: string[];
}
```

---

## 🔮 Future Enhancements

### Planned Features
1. **Database storage** for historical tracking
2. **Automated alerts** via email/SMS/Slack
3. **Weather integration** for outdoor sports
4. **Advanced analytics** (success rate, patterns)
5. **Additional data sources** (Sleeper, SportsInsights)

### Roadmap
- **Q1 2026**: Database integration, automated alerts
- **Q2 2026**: Weather integration, advanced analytics
- **Q3 2026**: Additional data sources, mobile app
- **Q4 2026**: Machine learning for arb prediction

---

## 📞 Support

### Documentation
- Technical: `EARLY_LINES_TECHNICAL_DOCUMENTATION.md`
- API: `EARLY_LINES_API_GUIDE.md`
- Setup: `EARLY_LINES_SETUP_GUIDE.md`
- Strategy: `EARLY_LINES_STRATEGY.md`

### Resources
- The Odds API: https://the-odds-api.com/
- ESPN Hidden API: https://gist.github.com/akeaswaran/b48b02f1c94f873c6655e7129910fc3b
- Action Network: https://www.actionnetwork.com/

---

## 📝 Changelog

### v1.0.0 (2026-02-21)
- ✅ Initial release
- ✅ Early odds aggregation from The Odds API
- ✅ Injury tracking with impact scoring
- ✅ Breaking news monitoring
- ✅ Line-move arb detection
- ✅ Admin dashboard integration
- ✅ Comprehensive documentation

---

## 📄 License

This is part of the Progno sports betting intelligence platform. All rights reserved.

---

## 🙏 Acknowledgments

- **The Odds API** for comprehensive odds data
- **ESPN** for injury and news data
- **Action Network** for early line data
- **Progno Team** for the core prediction engine

---

**Last Updated**: February 21, 2026

**Version**: 1.0.0

**Status**: ✅ Production Ready
