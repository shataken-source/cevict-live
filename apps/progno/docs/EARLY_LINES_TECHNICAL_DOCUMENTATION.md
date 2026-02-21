# Early Lines System - Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [API Reference](#api-reference)
5. [Data Models](#data-models)
6. [Setup & Configuration](#setup--configuration)
7. [Usage Examples](#usage-examples)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Early Lines System is a comprehensive sports betting intelligence platform that captures early odds (2-5 days before games), tracks injuries and breaking news, detects line movements, and identifies line-move arbitrage opportunities.

### Key Features
- **Multi-source odds aggregation** from The Odds API, Action Network, and ESPN
- **Real-time injury tracking** using ESPN Hidden API with impact scoring (0-100)
- **Breaking news monitoring** with odds impact assessment (High/Medium/Low)
- **Line-move detection** comparing early odds to current odds
- **Arb opportunity identification** when picks flip sides or both show +EV
- **Admin dashboard integration** with visual odds impact badges

### Business Value
- **Early value capture**: Bet at favorable odds before lines move
- **Hedge opportunities**: When picks flip, you have both sides at +EV prices
- **Risk mitigation**: Track injuries and news that move lines
- **Data-driven decisions**: 639+ injuries tracked, 154+ games monitored

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Data Sources                             │
├─────────────────────────────────────────────────────────────┤
│  The Odds API  │  ESPN Hidden API  │  Action Network        │
│  (11+ books)   │  (Injuries/News)  │  (Early odds)          │
└────────┬────────────────┬────────────────┬──────────────────┘
         │                │                │
         ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│              Early Odds Aggregator                           │
│  - Fetches odds from multiple sources                       │
│  - Deduplicates by gameId                                   │
│  - Detects line movements                                   │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│         Injury/News Tracker                                  │
│  - Fetches injury reports from ESPN                         │
│  - Calculates impact scores (0-100)                         │
│  - Assesses odds impact (High/Medium/Low)                   │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│         Line-Move Arb Detector                               │
│  - Compares early picks vs regular picks                    │
│  - Detects when picks flip sides                            │
│  - Calculates hedge stakes                                  │
│  - Generates arb summaries                                  │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│         API Endpoint (/api/early-lines/analysis)             │
│  - Aggregates all data sources                              │
│  - Returns comprehensive analysis                           │
│  - Enriches arbs with injury/news context                   │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│         Admin Dashboard (Early Lines Tab)                    │
│  - Visual display of early odds                             │
│  - Injury report with impact badges                         │
│  - Breaking news with odds impact                           │
│  - Arb opportunities with hedge calculations                │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Odds Collection** (Every API call)
   - The Odds API fetches current odds from 11+ sportsbooks
   - ESPN API fetches game schedules and basic odds
   - Action Network provides early line data
   - All sources deduplicated by gameId

2. **Injury/News Monitoring** (Every API call)
   - ESPN Hidden API fetches injury reports for all teams
   - Impact scores calculated based on player position, status, stats
   - Breaking news fetched from ESPN news feed
   - Odds impact assessed based on keywords and context

3. **Line Movement Detection** (When comparing early vs current)
   - Early odds compared to current odds
   - Significant movements flagged (>3 points ML, >1.5 spread, >3 total)
   - Movement reasons inferred from injury/news data

4. **Arb Detection** (When early and regular picks exist)
   - Early picks loaded from `predictions-early-YYYY-MM-DD.json`
   - Regular picks loaded from `predictions-YYYY-MM-DD.json`
   - Picks compared by gameId
   - Arbs flagged when picks flip or both show +EV

---

## Components

### 1. Early Odds Aggregator
**File**: `app/lib/early-odds-aggregator.ts`

**Purpose**: Fetches and aggregates early odds from multiple sources.

**Key Methods**:
```typescript
class EarlyOddsAggregator {
  // Aggregate odds from all sources
  async aggregateEarlyOdds(sports: string[], daysAhead: number): Promise<EarlyOdds[]>
  
  // Fetch from Action Network
  async fetchActionNetworkEarlyOdds(sport: string, daysAhead: number): Promise<EarlyOdds[]>
  
  // Fetch from ESPN
  async fetchESPNEarlyOdds(sport: string, daysAhead: number): Promise<EarlyOdds[]>
  
  // Detect line movement
  detectLineMovement(earlyOdds: EarlyOdds, currentOdds: EarlyOdds): LineMovement
}
```

**Data Structures**:
```typescript
interface EarlyOdds {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  capturedAt: string;
  source: 'fanduel' | 'draftkings' | 'betmgm' | 'caesars' | 'betonlineag' | 'bovada' | 'action_network' | 'espn';
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

interface LineMovement {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  earlyOdds: EarlyOdds;
  currentOdds: EarlyOdds;
  movement: {
    mlShift: number;      // Positive = home became favorite
    spreadShift: number;  // Positive = home got more points
    totalShift: number;   // Positive = total went up
  };
  significantMove: boolean;
  capturedAt: string;
}
```

### 2. Injury/News Tracker
**File**: `app/lib/injury-news-tracker.ts`

**Purpose**: Tracks injuries and breaking news from ESPN Hidden API.

**Key Methods**:
```typescript
class InjuryNewsTracker {
  // Fetch injuries for a sport
  async fetchInjuries(sport: string): Promise<InjuryReport[]>
  
  // Fetch breaking news
  async fetchBreakingNews(sport: string): Promise<BreakingNews[]>
  
  // Get all updates for multiple sports
  async getAllUpdates(sports: string[]): Promise<{
    injuries: InjuryReport[];
    news: BreakingNews[];
  }>
}
```

**Data Structures**:
```typescript
interface InjuryReport {
  playerId: string;
  playerName: string;
  team: string;
  sport: string;
  status: 'out' | 'doubtful' | 'questionable' | 'probable' | 'day-to-day';
  injury: string;
  lastUpdate: string;
  impactScore?: number; // 0-100, higher = more impact on odds
}

interface BreakingNews {
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

**Impact Scoring Algorithm**:
```typescript
// Base score: 50
// + 30 if high-impact position (QB, P, SP, C, G)
// + 20 if status = 'out'
// + 10 if status = 'doubtful'
// + 5 if status = 'questionable'
// + 10 if player has stats (likely starter)
// Max: 100
```

**Odds Impact Assessment**:
```typescript
// High: Keywords like "out for season", "suspended", "traded", "fired", "qb", "starting pitcher"
// Medium: Keywords like "out", "doubtful", "injury", "benched", "lineup change"
// Low: Everything else
```

### 3. Line-Move Arb Detector
**File**: `app/lib/line-move-arb-detector.ts`

**Purpose**: Compares early picks to regular picks and identifies arbitrage opportunities.

**Key Methods**:
```typescript
class LineMoveArbDetector {
  // Detect arb opportunities
  detectLineMoveArbs(
    earlyPicks: Pick[],
    regularPicks: Pick[],
    lineMovements: LineMovement[]
  ): LineMoveArbOpportunity[]
  
  // Generate human-readable summary
  generateArbSummary(arb: LineMoveArbOpportunity): string
  
  // Calculate optimal hedge stake
  calculateHedgeStake(
    earlyStake: number,
    earlyOdds: number,
    currentOdds: number
  ): {
    hedgeStake: number;
    guaranteedProfit: number;
    profitIfEarlyWins: number;
    profitIfCurrentWins: number;
  }
}
```

**Data Structures**:
```typescript
interface Pick {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  pick: string; // Team name
  confidence: number;
  expectedValue: number;
  odds: number;
  reasoning?: string;
}

interface LineMoveArbOpportunity {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  
  // Early position
  earlyPick: Pick;
  earlyOdds: number;
  earlyEV: number;
  
  // Current position
  regularPick: Pick;
  currentOdds: number;
  currentEV: number;
  
  // Line movement
  lineMovement: LineMovement;
  
  // Arb analysis
  pickFlipped: boolean;
  combinedEV: number;
  hedgeOpportunity: boolean;
  
  // Context
  triggerNews?: string[];
  injuryReports?: string[];
}
```

### 4. The Odds API Integration
**File**: `app/lib/odds-sources/the-odds-api.ts`

**Purpose**: Fetches odds from The Odds API (11+ sportsbooks).

**Configuration**:
```typescript
// Environment variable: THE_ODDS_API_KEY or ODDS_API_KEY_2 or ODDS_API_KEY
// Free tier: 500 requests/month
// Resets: 1st of each month
```

**Supported Sports**:
```typescript
const sportMap = {
  'NFL': 'americanfootball_nfl',
  'NCAAF': 'americanfootball_ncaaf',
  'NBA': 'basketball_nba',
  'NCAAB': 'basketball_ncaab',
  'MLB': 'baseball_mlb',
  'NHL': 'icehockey_nhl'
}
```

**Supported Sportsbooks**:
- FanDuel
- DraftKings
- BetMGM
- Caesars (William Hill)
- BetRivers
- BetOnline.ag
- Bovada
- BetUS
- MyBookie.ag
- Fanatics
- LowVig.ag

---

## API Reference

### GET /api/early-lines/analysis

Comprehensive endpoint that aggregates early odds, injuries, news, line movements, and arb opportunities.

**Query Parameters**:
```typescript
{
  sports?: string;        // Comma-separated list (e.g., "NFL,NBA,NCAAB")
                         // Default: "NFL,NBA,NCAAB"
  
  daysAhead?: number;    // How many days ahead to look for early odds
                         // Default: 3
  
  includeInjuries?: boolean;  // Include injury data
                              // Default: true
  
  includeNews?: boolean;      // Include breaking news
                              // Default: true
}
```

**Example Request**:
```bash
curl "http://localhost:3008/api/early-lines/analysis?sports=NFL,NBA&daysAhead=3"
```

**Response Structure**:
```typescript
{
  success: boolean;
  timestamp: string;
  summary: {
    sports: string;
    daysAhead: number;
    earlyGames: number;
    earlyPicks: number;
    regularPicks: number;
    significantMoves: number;
    arbOpportunities: number;
    injuries: number;
    news: number;
  };
  data: {
    earlyOdds: EarlyOdds[];
    injuries: InjuryReport[];
    news: BreakingNews[];
    lineMovements: LineMovement[];
    arbOpportunities: LineMoveArbOpportunity[];
    topArbSummaries: string[];
  };
}
```

**Example Response**:
```json
{
  "success": true,
  "timestamp": "2026-02-21T06:47:00.000Z",
  "summary": {
    "sports": "NFL, NBA",
    "daysAhead": 3,
    "earlyGames": 154,
    "earlyPicks": 0,
    "regularPicks": 0,
    "significantMoves": 0,
    "arbOpportunities": 0,
    "injuries": 639,
    "news": 4
  },
  "data": {
    "earlyOdds": [
      {
        "gameId": "6d02351fc9049e70d91ef8f2e483841f",
        "sport": "NBA",
        "homeTeam": "Phoenix Suns",
        "awayTeam": "Orlando Magic",
        "gameDate": "2026-02-21T22:10:00Z",
        "capturedAt": "2026-02-21T06:47:00.000Z",
        "source": "fanduel",
        "odds": {
          "homeML": -120,
          "awayML": 102,
          "spread": -1.5,
          "spreadOdds": -108,
          "total": 218.5,
          "overOdds": -115,
          "underOdds": -105
        }
      }
    ],
    "injuries": [
      {
        "playerId": "4278067",
        "playerName": "Nic Claxton",
        "team": "Brooklyn Nets",
        "sport": "NBA",
        "status": "out",
        "injury": "Claxton missed the first leg of the back-to-back set Thursday...",
        "lastUpdate": "2026-02-20T19:19Z",
        "impactScore": 100
      }
    ],
    "news": [
      {
        "id": "47992564",
        "headline": "Jaxon Smith-Njigba: Believe I deserve to be highest-paid WR",
        "description": "...",
        "sport": "NFL",
        "teams": ["Seattle Seahawks"],
        "publishedAt": "2026-02-21T06:25:45Z",
        "source": "ESPN",
        "oddsImpact": "medium"
      }
    ],
    "lineMovements": [],
    "arbOpportunities": [],
    "topArbSummaries": []
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Error message here"
}
```

**Rate Limits**:
- The Odds API: 500 requests/month (free tier)
- ESPN API: No documented limits (use responsibly)
- Action Network: No documented limits (use responsibly)

---

## Data Models

### Complete Type Definitions

```typescript
// Early Odds
interface EarlyOdds {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  capturedAt: string;
  source: 'fanduel' | 'draftkings' | 'betmgm' | 'caesars' | 'betonlineag' | 
          'bovada' | 'betus' | 'mybookieag' | 'fanatics' | 'lowvig' | 
          'action_network' | 'espn';
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

// Injury Report
interface InjuryReport {
  playerId: string;
  playerName: string;
  team: string;
  sport: string;
  status: 'out' | 'doubtful' | 'questionable' | 'probable' | 'day-to-day';
  injury: string;
  lastUpdate: string;
  impactScore?: number;
}

// Breaking News
interface BreakingNews {
  id: string;
  headline: string;
  description: string;
  sport: string;
  teams: string[];
  publishedAt: string;
  source: string;
  oddsImpact: 'high' | 'medium' | 'low';
}

// Line Movement
interface LineMovement {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  earlyOdds: EarlyOdds;
  currentOdds: EarlyOdds;
  movement: {
    mlShift: number;
    spreadShift: number;
    totalShift: number;
  };
  significantMove: boolean;
  capturedAt: string;
}

// Pick
interface Pick {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  pick: string;
  confidence: number;
  expectedValue: number;
  odds: number;
  reasoning?: string;
}

// Arb Opportunity
interface LineMoveArbOpportunity {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  earlyPick: Pick;
  earlyOdds: number;
  earlyEV: number;
  regularPick: Pick;
  currentOdds: number;
  currentEV: number;
  lineMovement: LineMovement;
  pickFlipped: boolean;
  combinedEV: number;
  hedgeOpportunity: boolean;
  triggerNews?: string[];
  injuryReports?: string[];
}
```

---

## Setup & Configuration

### Prerequisites
- Node.js 18+
- Next.js 15+
- The Odds API key (free tier)

### Environment Variables

Add to `.env.local`:
```bash
# The Odds API (Required)
THE_ODDS_API_KEY=your_key_here
# OR
ODDS_API_KEY_2=your_key_here
# OR
ODDS_API_KEY=your_key_here

# Optional: Other API keys
NEWS_API_KEY=your_news_api_key
OPENWEATHER_API_KEY=your_weather_api_key
```

### Installation

1. **Install dependencies** (already done if using existing Progno setup)
```bash
cd apps/progno
npm install
```

2. **Get The Odds API key**
   - Visit https://the-odds-api.com/
   - Sign up for free account
   - Copy API key
   - Add to `.env.local`

3. **Verify setup**
```bash
# Start dev server
npm run dev

# Test API endpoint
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA"
```

### File Structure
```
apps/progno/
├── app/
│   ├── api/
│   │   └── early-lines/
│   │       └── analysis/
│   │           └── route.ts          # Main API endpoint
│   ├── lib/
│   │   ├── early-odds-aggregator.ts  # Odds aggregation
│   │   ├── injury-news-tracker.ts    # Injury/news tracking
│   │   ├── line-move-arb-detector.ts # Arb detection
│   │   └── odds-sources/
│   │       └── the-odds-api.ts       # The Odds API integration
│   └── progno/
│       └── admin/
│           └── page.tsx              # Admin dashboard (includes Early Lines tab)
├── components/
│   └── admin/
│       └── EarlyLinesSection.tsx     # Early Lines UI component
├── docs/
│   ├── EARLY_LINES_STRATEGY.md       # Strategy overview
│   ├── early-lines-gold.txt          # Research notes
│   ├── EARLY_LINES_IMPLEMENTATION.md # Setup guide
│   └── EARLY_LINES_TECHNICAL_DOCUMENTATION.md  # This file
└── .env.local                        # Environment variables
```

---

## Usage Examples

### Example 1: Fetch Early Odds for NBA

```typescript
import { EarlyOddsAggregator } from '@/app/lib/early-odds-aggregator';

const aggregator = new EarlyOddsAggregator();
const odds = await aggregator.aggregateEarlyOdds(['NBA'], 3);

console.log(`Found ${odds.length} NBA games with early odds`);
odds.forEach(game => {
  console.log(`${game.awayTeam} @ ${game.homeTeam}`);
  console.log(`  ML: ${game.odds.awayML} / ${game.odds.homeML}`);
  console.log(`  Spread: ${game.odds.spread} (${game.odds.spreadOdds})`);
  console.log(`  Total: ${game.odds.total} (O${game.odds.overOdds}/U${game.odds.underOdds})`);
});
```

### Example 2: Track Injuries for Multiple Sports

```typescript
import { InjuryNewsTracker } from '@/app/lib/injury-news-tracker';

const tracker = new InjuryNewsTracker();
const { injuries, news } = await tracker.getAllUpdates(['NFL', 'NBA', 'NCAAB']);

// Filter high-impact injuries
const highImpact = injuries.filter(inj => inj.impactScore && inj.impactScore >= 80);
console.log(`${highImpact.length} high-impact injuries:`);
highImpact.forEach(inj => {
  console.log(`  ${inj.playerName} (${inj.team}) - ${inj.status}: ${inj.injury}`);
});

// Filter high-impact news
const highImpactNews = news.filter(n => n.oddsImpact === 'high');
console.log(`${highImpactNews.length} high-impact news items:`);
highImpactNews.forEach(n => {
  console.log(`  ${n.headline} (${n.teams.join(', ')})`);
});
```

### Example 3: Detect Line-Move Arbs

```typescript
import { LineMoveArbDetector } from '@/app/lib/line-move-arb-detector';
import { readFileSync } from 'fs';

// Load picks from files
const earlyPicks = JSON.parse(readFileSync('predictions-early-2026-02-21.json', 'utf-8')).picks;
const regularPicks = JSON.parse(readFileSync('predictions-2026-02-21.json', 'utf-8')).picks;

// Get line movements (from aggregator)
const lineMovements = []; // Populated by EarlyOddsAggregator

const detector = new LineMoveArbDetector();
const arbs = detector.detectLineMoveArbs(earlyPicks, regularPicks, lineMovements);

console.log(`Found ${arbs.length} arb opportunities`);
arbs.forEach(arb => {
  console.log(detector.generateArbSummary(arb));
  
  // Calculate hedge stake
  const hedge = detector.calculateHedgeStake(100, arb.earlyOdds, arb.currentOdds);
  console.log(`Hedge stake: $${hedge.hedgeStake}`);
  console.log(`Guaranteed profit: $${hedge.guaranteedProfit}`);
});
```

### Example 4: Admin Dashboard Usage

1. Navigate to `http://localhost:3008/progno/admin`
2. Click **"EARLY LINES"** tab
3. Enter sports (e.g., "NFL,NBA,NCAAB")
4. Click **"Fetch Early Lines"**
5. View:
   - Summary stats (games, injuries, news, arbs)
   - Early odds with moneyline, spread, totals
   - Injury report with impact badges
   - Breaking news with odds impact badges
   - Arb opportunities (when available)

---

## Deployment

### Vercel Deployment

1. **Environment Variables**
   - Go to Vercel dashboard → Project Settings → Environment Variables
   - Add `THE_ODDS_API_KEY` with your API key
   - Add to Production, Preview, and Development environments

2. **Deploy**
```bash
# From apps/progno directory
git add .
git commit -m "feat: add early lines system"
git push

# Vercel will auto-deploy
```

3. **Verify Deployment**
```bash
curl "https://your-domain.vercel.app/api/early-lines/analysis?sports=NBA"
```

### Cron Jobs (Optional)

Add to `vercel.json` for automated early odds capture:

```json
{
  "crons": [
    {
      "path": "/api/early-lines/capture",
      "schedule": "0 8 * * *"
    }
  ]
}
```

**Note**: You'll need to create the `/api/early-lines/capture` endpoint to store odds in a database.

### Database Storage (Future Enhancement)

For historical tracking, create Supabase tables:

```sql
-- Early odds table
CREATE TABLE early_odds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT NOT NULL,
  sport TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  game_date TIMESTAMP NOT NULL,
  captured_at TIMESTAMP NOT NULL,
  source TEXT NOT NULL,
  odds JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Injuries table
CREATE TABLE injuries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  team TEXT NOT NULL,
  sport TEXT NOT NULL,
  status TEXT NOT NULL,
  injury TEXT NOT NULL,
  impact_score INTEGER,
  last_update TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Arb opportunities table
CREATE TABLE arb_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT NOT NULL,
  sport TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  early_pick TEXT NOT NULL,
  early_odds INTEGER NOT NULL,
  regular_pick TEXT NOT NULL,
  current_odds INTEGER NOT NULL,
  combined_ev DECIMAL NOT NULL,
  pick_flipped BOOLEAN NOT NULL,
  detected_at TIMESTAMP DEFAULT NOW()
);
```

---

## Troubleshooting

### Issue: No odds data returned

**Symptoms**: `earlyOdds: []` in API response

**Solutions**:
1. Check API key is set in environment variables
2. Verify API key is valid: `curl "https://api.the-odds-api.com/v4/sports/?apiKey=YOUR_KEY"`
3. Check quota hasn't been exceeded (500 requests/month)
4. Restart dev server to reload environment variables

### Issue: 401 Unauthorized from The Odds API

**Symptoms**: `[The Odds API] Failed: 401`

**Solutions**:
1. Verify API key is correct
2. Check environment variable name: `THE_ODDS_API_KEY` or `ODDS_API_KEY_2` or `ODDS_API_KEY`
3. Restart server after adding/changing env variables
4. Check API key hasn't expired

### Issue: No injuries found

**Symptoms**: `injuries: []` in API response

**Solutions**:
1. ESPN API may be rate limiting - add delays between requests
2. Check sport name is correct (NBA, NFL, NCAAB, etc.)
3. Verify ESPN API endpoint is accessible: `curl "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams"`

### Issue: No arb opportunities detected

**Symptoms**: `arbOpportunities: 0`

**Expected**: This is normal when:
- No early picks file exists (`predictions-early-YYYY-MM-DD.json`)
- No regular picks file exists (`predictions-YYYY-MM-DD.json`)
- No picks have flipped sides
- No significant line movements detected

**To generate arbs**:
1. Run early picks generation (2-5 days before games)
2. Wait for line movements (injuries, news)
3. Run regular picks generation (0-2 days before games)
4. System will detect arbs automatically

### Issue: Admin dashboard not loading

**Symptoms**: Blank screen or errors in console

**Solutions**:
1. Check browser console for errors
2. Verify server is running: `npm run dev`
3. Clear browser cache
4. Check component imports are correct

### Issue: Slow API response

**Symptoms**: API takes >30 seconds to respond

**Solutions**:
1. Reduce number of sports in query
2. Reduce `daysAhead` parameter
3. Set `includeInjuries=false` or `includeNews=false` if not needed
4. The Odds API can be slow - consider caching results

---

## Performance Optimization

### Caching Strategy

```typescript
// Cache odds for 5 minutes
const CACHE_TTL = 5 * 60 * 1000;
const oddsCache = new Map<string, { data: EarlyOdds[]; timestamp: number }>();

async function getCachedOdds(sport: string): Promise<EarlyOdds[]> {
  const cached = oddsCache.get(sport);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchOdds(sport);
  oddsCache.set(sport, { data, timestamp: Date.now() });
  return data;
}
```

### Rate Limiting

```typescript
// Limit to 1 request per second per source
const rateLimiter = new Map<string, number>();

async function rateLimitedFetch(source: string, url: string) {
  const lastRequest = rateLimiter.get(source) || 0;
  const timeSinceLastRequest = Date.now() - lastRequest;
  
  if (timeSinceLastRequest < 1000) {
    await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest));
  }
  
  rateLimiter.set(source, Date.now());
  return fetch(url);
}
```

---

## Testing

### Unit Tests

```typescript
// Example test for impact score calculation
describe('InjuryNewsTracker', () => {
  it('should calculate high impact score for QB out', () => {
    const tracker = new InjuryNewsTracker();
    const athlete = { position: { abbreviation: 'QB' }, statistics: [{}] };
    const injury = { status: 'Out' };
    
    const score = tracker['calculateImpactScore'](athlete, injury);
    expect(score).toBeGreaterThanOrEqual(80);
  });
});
```

### Integration Tests

```bash
# Test API endpoint
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA" | jq .

# Verify response structure
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA" | jq '.success'
# Should return: true

# Check data counts
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA" | jq '.summary'
```

---

## Monitoring & Logging

### Key Metrics to Track

1. **API Response Time**: Should be <30 seconds
2. **Odds Count**: Should be >0 for popular sports
3. **Injury Count**: Should be >0 for active seasons
4. **Arb Count**: Will vary, 0 is normal
5. **Error Rate**: Should be <5%

### Logging Examples

```typescript
console.log('[Early Lines] Fetching early odds for:', sports.join(', '));
console.log('[Early Lines] Found', earlyOdds.length, 'games with early odds');
console.log('[Early Lines] Found', injuries.length, 'injuries,', news.length, 'news items');
console.log('[Early Lines] Detected', lineMovements.length, 'significant line movements');
console.log('[Early Lines] Found', arbOpportunities.length, 'line-move arb opportunities');
```

---

## Future Enhancements

### Planned Features

1. **Database Storage**
   - Store historical odds in Supabase
   - Track line movement over time
   - Analyze arb performance

2. **Automated Alerts**
   - Email/SMS when high-value arbs detected
   - Push notifications for breaking news
   - Slack integration for team updates

3. **Weather Integration**
   - OpenWeatherMap API for outdoor sports
   - Impact on totals (wind, rain, temperature)
   - Weather alerts for game conditions

4. **Advanced Analytics**
   - Arb success rate tracking
   - Line movement patterns
   - Injury impact analysis
   - Optimal hedge timing

5. **Additional Data Sources**
   - Sleeper App for fastest breaking news
   - Sports Injury Central for detailed analysis
   - BettingPros for expert picks
   - SportsInsights for sharp money tracking

---

## Support & Resources

### Documentation
- Strategy overview: `docs/EARLY_LINES_STRATEGY.md`
- Setup guide: `docs/EARLY_LINES_IMPLEMENTATION.md`
- Research notes: `docs/early-lines-gold.txt`
- This file: `docs/EARLY_LINES_TECHNICAL_DOCUMENTATION.md`

### External Resources
- The Odds API: https://the-odds-api.com/
- ESPN Hidden API: https://gist.github.com/akeaswaran/b48b02f1c94f873c6655e7129910fc3b
- Action Network: https://www.actionnetwork.com/
- OpenWeatherMap: https://openweathermap.org/api

### Contact
For questions or issues, refer to the main Progno documentation or create an issue in the repository.

---

## Changelog

### v1.0.0 (2026-02-21)
- Initial release
- Early odds aggregation from The Odds API, Action Network, ESPN
- Injury tracking with impact scoring
- Breaking news monitoring with odds impact assessment
- Line-move arb detection
- Admin dashboard integration
- Comprehensive documentation

---

## License

This is part of the Progno sports betting intelligence platform. All rights reserved.
