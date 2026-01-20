# Progno Data Sources Implementation Guide

## Quick Start

### 1. Set Up Environment Variables

Add to `apps/progno/.env.local`:

```bash
# Phase 1: Critical Data Sources (Choose one strategy)

# Option A: Paid APIs (Recommended for speed)
SPORTSDATAIO_API_KEY=your_key_here
ROTOWIRE_API_KEY=your_key_here

# Option B: Free Strategy (No keys needed, uses scraping/self-built)
# Leave keys empty, system will use free alternatives

# Phase 2: Optional
ACTION_NETWORK_API_KEY=your_key_here
OPENWEATHERMAP_API_KEY=your_key_here
```

### 2. Install Dependencies (if using scraping)

```bash
cd apps/progno
pnpm add cheerio axios date-fns-tz
```

### 3. Initialize Data Sources

The data sources are automatically initialized when imported. They will:
- Use paid APIs if keys are provided
- Fall back to free alternatives if keys are missing
- Cache data appropriately

### 4. Update Game Data Enrichment

In your cron scripts or game fetching logic, enrich games with new data:

```typescript
import { 
  teamStatsFetcher, 
  injuryFetcher, 
  h2hHistory,
  restTravelCalculator,
  lineMovementTracker
} from '@/lib/data-sources';

// Enrich game with team stats
const homeStats = await teamStatsFetcher.getTeamStats(homeTeam, sport);
const awayStats = await teamStatsFetcher.getTeamStats(awayTeam, sport);

// Enrich with injuries
const homeInjuries = await injuryFetcher.getTeamInjuries(homeTeam, sport);
const awayInjuries = await injuryFetcher.getTeamInjuries(awayTeam, sport);

// Get H2H history
const h2h = h2hHistory.getSummary(homeTeam, awayTeam, sport);

// Calculate rest/travel (need schedule data)
const rest = restTravelCalculator.calculateRest(
  homeTeam,
  awayTeam,
  gameDate,
  homeSchedule,
  awaySchedule
);

// Track line movement
lineMovementTracker.recordSnapshot(
  game.id,
  sport,
  game.odds.spread,
  game.odds.total
);
const movement = lineMovementTracker.getMovement(game.id);
```

### 5. Build H2H Database

Run this periodically to build H2H history:

```typescript
import { h2hHistory } from '@/lib/data-sources';
import { getPrimaryKey } from '@/app/keys-store';

const apiKey = getPrimaryKey();
if (apiKey) {
  const added = await h2hHistory.buildFromOddsAPI(apiKey, 'NFL', 365);
  console.log(`Added ${added} games to H2H database`);
}
```

## Implementation Status

### ✅ Completed:
- Game interface expanded with all new data fields
- Team stats fetcher (supports SportsDataIO + free fallback)
- Injury fetcher (supports Rotowire + ESPN scraping)
- H2H history database (uses The Odds API historical data)
- Rest/travel calculator (calculates from schedule)
- Line movement tracker (tracks odds over time)

### 🚧 To Be Implemented:
- Update `predictGame()` function to use new data
- Update `weekly-page.helpers.ts` to enrich games with new data
- Build team location database (for travel calculations)
- Implement ESPN scraping for injuries (currently placeholder)
- Add situational stats database
- Add referee stats database
- Add motivation factor calculator

## Next Steps

1. **Update prediction logic** - Modify `predictGame()` in `weekly-analyzer.ts` to use new data
2. **Enrich games in cron scripts** - Add data fetching to `cron-all-leagues-friday.ts`
3. **Build databases** - Run initial data collection for H2H, situational stats, etc.
4. **Test accuracy** - Compare predictions with/without new data

## Data Source Priority

Implement in this order:
1. ✅ Team Stats (HIGH IMPACT)
2. ✅ Injuries (HIGH IMPACT)
3. ✅ H2H History (HIGH IMPACT)
4. ✅ Rest/Travel (MEDIUM IMPACT, EASY)
5. ✅ Line Movement (MEDIUM IMPACT, EASY)
6. ⏳ Situational Stats (MEDIUM IMPACT, MEDIUM EFFORT)
7. ⏳ Player Data (LOW-MEDIUM IMPACT, NBA-focused)
8. ⏳ Referee Data (LOW IMPACT)
9. ⏳ Motivation Factors (LOW IMPACT)

