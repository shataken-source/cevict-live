# ⚽ API-Football Integration - PROGNO

## 🎯 Overview

API-Football provides comprehensive sports data including:
- **1,100+ leagues** worldwide (soccer, basketball, etc.)
- **Live scores** and fixtures
- **Team and player statistics**
- **Head-to-head records**
- **Injury reports**
- **League standings**
- **Pre-match odds**

This integration enhances PROGNO's prediction accuracy by providing rich statistical data.

---

## 🔑 Setup

### 1. Get API Key

1. Go to: https://dashboard.api-football.com/
2. Sign up / Log in
3. Get your API key from the dashboard
4. **Your API Key:** `d0d545201e9b7ed86e2641b661c6efaa`

### 2. Configure Environment Variable

**Add to `.env.local` (local development):**
```env
API_FOOTBALL_KEY=d0d545201e9b7ed86e2641b661c6efaa
```

**Add to Vercel (production):**
1. Go to Vercel Dashboard → PROGNO project
2. Settings → Environment Variables
3. Add:
   - **Name:** `API_FOOTBALL_KEY`
   - **Value:** `d0d545201e9b7ed86e2641b661c6efaa`
   - **Environments:** Production, Preview, Development

---

## 📊 Available Functions

### Fixtures
```typescript
import { getFixtures, getTodayFixtures } from './enhancements/api-football';

// Get today's fixtures
const today = await getTodayFixtures();

// Get fixtures for specific date
const fixtures = await getFixtures({ date: '2025-12-25' });

// Get fixtures for a league
const leagueFixtures = await getFixtures({
  league: 39, // Premier League
  season: 2024
});
```

### Standings
```typescript
import { getStandings } from './enhancements/api-football';

const standings = await getStandings({
  league: 39, // Premier League
  season: 2024
});
```

### Head-to-Head
```typescript
import { getHeadToHead } from './enhancements/api-football';

const h2h = await getHeadToHead({
  team1: 33, // Manchester United
  team2: 40, // Liverpool
  last: 10 // Last 10 meetings
});
```

### Team Strength
```typescript
import { calculateTeamStrength } from './enhancements/api-football';

const strength = await calculateTeamStrength({
  team: 33,
  league: 39,
  season: 2024
});
// Returns: { overall, home, away, attack, defense, form }
```

### Injuries
```typescript
import { getInjuries } from './enhancements/api-football';

const injuries = await getInjuries({
  team: 33,
  league: 39
});
```

---

## 🌐 API Endpoints

### GET `/api/api-football/fixtures`
Get fixtures with optional filters.

**Query Parameters:**
- `date` - YYYY-MM-DD format
- `league` - League ID
- `team` - Team ID
- `from` - Start date (YYYY-MM-DD)
- `to` - End date (YYYY-MM-DD)
- `season` - Season year
- `status` - NS, LIVE, FT, etc.

**Example:**
```
GET /api/api-football/fixtures?date=2025-12-25&league=39
```

### GET `/api/api-football/standings`
Get league standings.

**Query Parameters:**
- `league` - League ID (required)
- `season` - Season year (required)

**Example:**
```
GET /api/api-football/standings?league=39&season=2024
```

### GET `/api/api-football/team-strength`
Calculate team strength metrics.

**Query Parameters:**
- `team` - Team ID (required)
- `league` - League ID (required)
- `season` - Season year (required)

**Example:**
```
GET /api/api-football/team-strength?team=33&league=39&season=2024
```

---

## 🏆 Popular League IDs

| League | ID | Country |
|--------|-----|---------|
| Premier League | 39 | England |
| La Liga | 140 | Spain |
| Serie A | 135 | Italy |
| Bundesliga | 78 | Germany |
| Ligue 1 | 61 | France |
| MLS | 253 | USA |
| NBA | 12 | USA |
| NFL | 1 | USA |

**Find more:** Use `/api/api-football/leagues` endpoint or check API-Football documentation.

---

## 💡 Usage in PROGNO Predictions

### Example: Enhanced Game Prediction

```typescript
import {
  getHeadToHead,
  calculateTeamStrength,
  getInjuries
} from './enhancements/api-football';

async function enhancedPrediction(homeTeamId: number, awayTeamId: number, leagueId: number, season: number) {
  // Get head-to-head record
  const h2h = await getHeadToHead({ team1: homeTeamId, team2: awayTeamId });

  // Calculate team strengths
  const homeStrength = await calculateTeamStrength({ team: homeTeamId, league: leagueId, season });
  const awayStrength = await calculateTeamStrength({ team: awayTeamId, league: leagueId, season });

  // Check injuries
  const homeInjuries = await getInjuries({ team: homeTeamId, league: leagueId });
  const awayInjuries = await getInjuries({ team: awayTeamId, league: leagueId });

  // Use this data to enhance prediction accuracy
  const homeAdvantage = homeStrength.home - awayStrength.away;
  const formAdvantage = homeStrength.form - awayStrength.form;
  const injuryImpact = (awayInjuries.length - homeInjuries.length) * 2; // -2% per key injury

  // Combine with existing PROGNO logic
  // ...
}
```

---

## 📈 Rate Limits

**Free Plan:**
- 100 requests/day
- Limited seasons

**Pro Plan ($19/month):**
- 7,500 requests/day
- All seasons

**Ultra Plan ($29/month):**
- 75,000 requests/day
- All seasons

**Mega Plan ($39/month):**
- 150,000 requests/day
- All seasons

**Current Plan:** Check your dashboard at https://dashboard.api-football.com/

---

## ✅ Benefits for PROGNO

1. **Better Statistics:** Rich team/player data improves prediction accuracy
2. **Head-to-Head Records:** Historical matchups provide valuable insights
3. **Injury Data:** Real-time injury reports affect predictions
4. **Form Analysis:** Recent team form (last 5 games) enhances accuracy
5. **League Context:** Standings and league position provide context
6. **Multi-Sport Support:** Not just soccer - basketball, American football, etc.

---

## 🚀 Next Steps

1. ✅ API key configured
2. ✅ Integration code created
3. ⏳ Add to PROGNO prediction logic
4. ⏳ Test with real games
5. ⏳ Monitor API usage
6. ⏳ Upgrade plan if needed

---

**API-Football is now part of the PROGNO arsenal!** ⚽🎯

