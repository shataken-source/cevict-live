# Early Lines API Usage Guide

## Quick Start

### Basic Usage

```bash
# Fetch early odds for NBA
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA"

# Fetch for multiple sports
curl "http://localhost:3008/api/early-lines/analysis?sports=NFL,NBA,NCAAB"

# Customize days ahead
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA&daysAhead=5"

# Exclude injuries/news for faster response
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA&includeInjuries=false&includeNews=false"
```

---

## API Endpoint Reference

### GET /api/early-lines/analysis

**Base URL**: `http://localhost:3008` (development) or `https://your-domain.vercel.app` (production)

**Full URL**: `/api/early-lines/analysis`

**Method**: `GET`

**Authentication**: None required

---

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sports` | string | `"NFL,NBA,NCAAB"` | Comma-separated list of sports to fetch |
| `daysAhead` | number | `3` | How many days ahead to look for early odds |
| `includeInjuries` | boolean | `true` | Whether to include injury data |
| `includeNews` | boolean | `true` | Whether to include breaking news |

### Supported Sports

- `NFL` - National Football League
- `NCAAF` - College Football
- `NBA` - National Basketball Association
- `NCAAB` - College Basketball
- `MLB` - Major League Baseball
- `NHL` - National Hockey League

---

## Response Format

### Success Response

**Status Code**: `200 OK`

**Content-Type**: `application/json`

```json
{
  "success": true,
  "timestamp": "2026-02-21T06:47:00.000Z",
  "summary": {
    "sports": "NBA",
    "daysAhead": 3,
    "earlyGames": 6,
    "earlyPicks": 0,
    "regularPicks": 0,
    "significantMoves": 0,
    "arbOpportunities": 0,
    "injuries": 639,
    "news": 4
  },
  "data": {
    "earlyOdds": [...],
    "injuries": [...],
    "news": [...],
    "lineMovements": [...],
    "arbOpportunities": [...],
    "topArbSummaries": [...]
  }
}
```

### Error Response

**Status Code**: `500 Internal Server Error`

**Content-Type**: `application/json`

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

---

## Response Fields

### Summary Object

| Field | Type | Description |
|-------|------|-------------|
| `sports` | string | Sports included in the analysis |
| `daysAhead` | number | Days ahead parameter used |
| `earlyGames` | number | Number of games with early odds found |
| `earlyPicks` | number | Number of early picks loaded |
| `regularPicks` | number | Number of regular picks loaded |
| `significantMoves` | number | Number of significant line movements detected |
| `arbOpportunities` | number | Number of line-move arb opportunities found |
| `injuries` | number | Number of injuries tracked |
| `news` | number | Number of breaking news items found |

### Early Odds Object

```typescript
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
```

| Field | Type | Description |
|-------|------|-------------|
| `gameId` | string | Unique identifier for the game |
| `sport` | string | Sport (NBA, NFL, etc.) |
| `homeTeam` | string | Home team name |
| `awayTeam` | string | Away team name |
| `gameDate` | string | ISO 8601 timestamp of game start |
| `capturedAt` | string | ISO 8601 timestamp when odds were captured |
| `source` | string | Sportsbook source |
| `odds.homeML` | number | Home team moneyline (American odds) |
| `odds.awayML` | number | Away team moneyline (American odds) |
| `odds.spread` | number | Point spread (positive = home underdog) |
| `odds.spreadOdds` | number | Odds for the spread bet |
| `odds.total` | number | Over/under total points |
| `odds.overOdds` | number | Odds for over bet |
| `odds.underOdds` | number | Odds for under bet |

### Injury Report Object

```typescript
{
  "playerId": "4278067",
  "playerName": "Nic Claxton",
  "team": "Brooklyn Nets",
  "sport": "NBA",
  "status": "out",
  "injury": "Claxton missed the first leg...",
  "lastUpdate": "2026-02-20T19:19Z",
  "impactScore": 100
}
```

| Field | Type | Description |
|-------|------|-------------|
| `playerId` | string | ESPN player ID |
| `playerName` | string | Player's full name |
| `team` | string | Team name |
| `sport` | string | Sport (NBA, NFL, etc.) |
| `status` | string | `out`, `doubtful`, `questionable`, `probable`, `day-to-day` |
| `injury` | string | Injury description/notes |
| `lastUpdate` | string | ISO 8601 timestamp of last update |
| `impactScore` | number | 0-100 score indicating impact on odds |

**Impact Score Calculation**:
- Base: 50
- +30 if high-impact position (QB, P, SP, C, G)
- +20 if status = 'out'
- +10 if status = 'doubtful'
- +5 if status = 'questionable'
- +10 if player has stats (likely starter)
- Max: 100

### Breaking News Object

```typescript
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
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | ESPN news article ID |
| `headline` | string | News headline |
| `description` | string | News description/summary |
| `sport` | string | Sport (NBA, NFL, etc.) |
| `teams` | string[] | Teams mentioned in the article |
| `publishedAt` | string | ISO 8601 timestamp of publication |
| `source` | string | News source (ESPN) |
| `oddsImpact` | string | `high`, `medium`, or `low` |

**Odds Impact Assessment**:
- **High**: Keywords like "out for season", "suspended", "traded", "fired", "qb", "starting pitcher"
- **Medium**: Keywords like "out", "doubtful", "injury", "benched", "lineup change"
- **Low**: Everything else

### Line Movement Object

```typescript
{
  "gameId": "abc123",
  "sport": "NBA",
  "homeTeam": "Lakers",
  "awayTeam": "Warriors",
  "earlyOdds": {...},
  "currentOdds": {...},
  "movement": {
    "mlShift": 15,
    "spreadShift": 1.5,
    "totalShift": 3.0
  },
  "significantMove": true,
  "capturedAt": "2026-02-21T06:47:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `gameId` | string | Unique identifier for the game |
| `sport` | string | Sport (NBA, NFL, etc.) |
| `homeTeam` | string | Home team name |
| `awayTeam` | string | Away team name |
| `earlyOdds` | object | Early odds object |
| `currentOdds` | object | Current odds object |
| `movement.mlShift` | number | Moneyline shift (positive = home became favorite) |
| `movement.spreadShift` | number | Spread shift (positive = home got more points) |
| `movement.totalShift` | number | Total shift (positive = total went up) |
| `significantMove` | boolean | Whether movement is significant |
| `capturedAt` | string | ISO 8601 timestamp |

**Significant Move Thresholds**:
- Moneyline: >3 points
- Spread: >1.5 points
- Total: >3 points

### Arb Opportunity Object

```typescript
{
  "gameId": "abc123",
  "sport": "NBA",
  "homeTeam": "Lakers",
  "awayTeam": "Warriors",
  "gameDate": "2026-02-21T22:00:00Z",
  "earlyPick": {...},
  "earlyOdds": -110,
  "earlyEV": 5.2,
  "regularPick": {...},
  "currentOdds": +120,
  "currentEV": 3.8,
  "lineMovement": {...},
  "pickFlipped": true,
  "combinedEV": 9.0,
  "hedgeOpportunity": true,
  "triggerNews": ["LeBron James out with injury"],
  "injuryReports": ["LeBron James (Lakers) - out: ankle sprain"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `gameId` | string | Unique identifier for the game |
| `sport` | string | Sport (NBA, NFL, etc.) |
| `homeTeam` | string | Home team name |
| `awayTeam` | string | Away team name |
| `gameDate` | string | ISO 8601 timestamp of game start |
| `earlyPick` | object | Early pick object |
| `earlyOdds` | number | Odds when early pick was made |
| `earlyEV` | number | Expected value of early pick (%) |
| `regularPick` | object | Regular pick object |
| `currentOdds` | number | Current odds |
| `currentEV` | number | Expected value of regular pick (%) |
| `lineMovement` | object | Line movement object |
| `pickFlipped` | boolean | Whether picks are on opposite sides |
| `combinedEV` | number | Combined EV of both positions (%) |
| `hedgeOpportunity` | boolean | Whether this is a hedge opportunity |
| `triggerNews` | string[] | News headlines that may have caused line movement |
| `injuryReports` | string[] | Injury reports that may have caused line movement |

---

## Usage Examples

### Example 1: Basic Fetch

**Request**:
```bash
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA"
```

**Response**:
```json
{
  "success": true,
  "timestamp": "2026-02-21T06:47:00.000Z",
  "summary": {
    "sports": "NBA",
    "daysAhead": 3,
    "earlyGames": 6,
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
    "injuries": [...],
    "news": [...]
  }
}
```

### Example 2: Multiple Sports

**Request**:
```bash
curl "http://localhost:3008/api/early-lines/analysis?sports=NFL,NBA,NCAAB&daysAhead=5"
```

**Response**:
```json
{
  "success": true,
  "summary": {
    "sports": "NFL, NBA, NCAAB",
    "daysAhead": 5,
    "earlyGames": 154
  }
}
```

### Example 3: Fast Response (No Injuries/News)

**Request**:
```bash
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA&includeInjuries=false&includeNews=false"
```

**Response Time**: ~5 seconds (vs ~30 seconds with injuries/news)

### Example 4: JavaScript/TypeScript

```typescript
async function fetchEarlyLines(sports: string[]) {
  const response = await fetch(
    `/api/early-lines/analysis?sports=${sports.join(',')}`
  );
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error);
  }
  
  return data;
}

// Usage
const result = await fetchEarlyLines(['NBA', 'NFL']);
console.log(`Found ${result.summary.earlyGames} games`);
console.log(`Tracking ${result.summary.injuries} injuries`);
```

### Example 5: Python

```python
import requests

def fetch_early_lines(sports=['NBA'], days_ahead=3):
    url = f"http://localhost:3008/api/early-lines/analysis"
    params = {
        'sports': ','.join(sports),
        'daysAhead': days_ahead
    }
    
    response = requests.get(url, params=params)
    response.raise_for_status()
    
    data = response.json()
    
    if not data['success']:
        raise Exception(data['error'])
    
    return data

# Usage
result = fetch_early_lines(['NBA', 'NFL'], days_ahead=5)
print(f"Found {result['summary']['earlyGames']} games")
print(f"Tracking {result['summary']['injuries']} injuries")
```

### Example 6: React Component

```typescript
import { useState, useEffect } from 'react';

interface EarlyLinesData {
  success: boolean;
  summary: {
    earlyGames: number;
    injuries: number;
    news: number;
  };
  data: {
    earlyOdds: any[];
    injuries: any[];
    news: any[];
  };
}

export function EarlyLinesDisplay() {
  const [data, setData] = useState<EarlyLinesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/early-lines/analysis?sports=NBA');
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error);
        }
        
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  if (loading) return <div>Loading early lines...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  return (
    <div>
      <h2>Early Lines Analysis</h2>
      <p>Games: {data.summary.earlyGames}</p>
      <p>Injuries: {data.summary.injuries}</p>
      <p>News: {data.summary.news}</p>
      
      {data.data.earlyOdds.map(game => (
        <div key={game.gameId}>
          <h3>{game.awayTeam} @ {game.homeTeam}</h3>
          <p>ML: {game.odds.awayML} / {game.odds.homeML}</p>
          <p>Spread: {game.odds.spread} ({game.odds.spreadOdds})</p>
          <p>Total: {game.odds.total} (O{game.odds.overOdds}/U{game.odds.underOdds})</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Rate Limits

### The Odds API
- **Free Tier**: 500 requests/month
- **Resets**: 1st of each month
- **Recommendation**: Cache results for 5-10 minutes

### ESPN API
- **No documented limits**
- **Recommendation**: Be respectful, add delays between requests

### Action Network
- **No documented limits**
- **Recommendation**: Cache results, don't abuse

---

## Best Practices

### 1. Cache Results

```typescript
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedEarlyLines(sports: string[]) {
  const key = sports.join(',');
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchEarlyLines(sports);
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

### 2. Handle Errors Gracefully

```typescript
try {
  const data = await fetchEarlyLines(['NBA']);
} catch (error) {
  if (error.response?.status === 429) {
    console.error('Rate limit exceeded, try again later');
  } else if (error.response?.status === 500) {
    console.error('Server error, try again in a few minutes');
  } else {
    console.error('Unknown error:', error.message);
  }
}
```

### 3. Use Query Parameters Wisely

```typescript
// Fast response (odds only)
const oddsOnly = await fetch('/api/early-lines/analysis?sports=NBA&includeInjuries=false&includeNews=false');

// Full analysis (slower but comprehensive)
const fullAnalysis = await fetch('/api/early-lines/analysis?sports=NBA,NFL,NCAAB');
```

### 4. Monitor API Usage

```typescript
// Check remaining quota
const response = await fetch('https://api.the-odds-api.com/v4/sports/?apiKey=YOUR_KEY');
const remaining = response.headers.get('x-requests-remaining');
console.log(`Remaining requests: ${remaining}`);
```

---

## Common Issues

### Issue: Empty earlyOdds Array

**Cause**: API key not set or invalid

**Solution**:
1. Check `.env.local` has `THE_ODDS_API_KEY`
2. Restart dev server
3. Verify API key is valid

### Issue: 401 Unauthorized

**Cause**: Invalid API key

**Solution**:
1. Get new API key from https://the-odds-api.com/
2. Update `.env.local`
3. Restart server

### Issue: Slow Response

**Cause**: Fetching injuries/news for multiple sports

**Solution**:
1. Reduce number of sports
2. Set `includeInjuries=false` or `includeNews=false`
3. Implement caching

### Issue: No Arb Opportunities

**Cause**: No early picks or regular picks exist

**Solution**:
1. Generate early picks (2-5 days before games)
2. Wait for line movements
3. Generate regular picks (0-2 days before games)
4. Arbs will be detected automatically

---

## Advanced Usage

### Custom Odds Aggregation

```typescript
import { EarlyOddsAggregator } from '@/app/lib/early-odds-aggregator';

const aggregator = new EarlyOddsAggregator();

// Fetch odds for specific date range
const odds = await aggregator.aggregateEarlyOdds(['NBA'], 5);

// Filter by sportsbook
const fanduelOdds = odds.filter(o => o.source === 'fanduel');

// Find best odds
const bestHomeML = Math.max(...odds.map(o => o.odds.homeML || -Infinity));
const bestAwayML = Math.max(...odds.map(o => o.odds.awayML || -Infinity));
```

### Custom Injury Filtering

```typescript
import { InjuryNewsTracker } from '@/app/lib/injury-news-tracker';

const tracker = new InjuryNewsTracker();
const { injuries } = await tracker.getAllUpdates(['NBA']);

// High-impact injuries only
const highImpact = injuries.filter(i => i.impactScore && i.impactScore >= 80);

// Specific team
const lakersInjuries = injuries.filter(i => i.team === 'Los Angeles Lakers');

// Specific status
const outPlayers = injuries.filter(i => i.status === 'out');
```

### Custom Arb Detection

```typescript
import { LineMoveArbDetector } from '@/app/lib/line-move-arb-detector';

const detector = new LineMoveArbDetector();

// Calculate hedge stake
const hedge = detector.calculateHedgeStake(
  100,   // Early stake
  -110,  // Early odds
  +120   // Current odds
);

console.log(`Hedge stake: $${hedge.hedgeStake}`);
console.log(`Guaranteed profit: $${hedge.guaranteedProfit}`);
```

---

## Integration Examples

### Webhook Integration

```typescript
// Send arb alerts to Slack
async function sendArbAlert(arb: LineMoveArbOpportunity) {
  const message = {
    text: `🚨 Line-Move Arb Detected!`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${arb.awayTeam} @ ${arb.homeTeam}*\n` +
                `Early: ${arb.earlyPick.pick} at ${arb.earlyOdds}\n` +
                `Current: ${arb.regularPick.pick} at ${arb.currentOdds}\n` +
                `Combined EV: ${arb.combinedEV.toFixed(1)}%`
        }
      }
    ]
  };
  
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify(message)
  });
}
```

### Database Storage

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function storeEarlyOdds(odds: EarlyOdds[]) {
  const { error } = await supabase
    .from('early_odds')
    .insert(odds.map(o => ({
      game_id: o.gameId,
      sport: o.sport,
      home_team: o.homeTeam,
      away_team: o.awayTeam,
      game_date: o.gameDate,
      captured_at: o.capturedAt,
      source: o.source,
      odds: o.odds
    })));
  
  if (error) throw error;
}
```

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the technical documentation
3. Check API key and environment variables
4. Verify server is running
5. Check browser/terminal console for errors

---

## Related Documentation

- Technical Documentation: `EARLY_LINES_TECHNICAL_DOCUMENTATION.md`
- Strategy Overview: `EARLY_LINES_STRATEGY.md`
- Setup Guide: `EARLY_LINES_IMPLEMENTATION.md`
- Research Notes: `early-lines-gold.txt`
