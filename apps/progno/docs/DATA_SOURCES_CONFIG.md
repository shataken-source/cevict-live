# Progno Data Sources Configuration

## Overview
This document outlines all data sources needed to maximize progno prediction accuracy. Implementation priority is marked for each source.

---

## Phase 1: Critical Data Sources (HIGH PRIORITY)

### 1. Team Performance Metrics

#### Data Needed:
- Recent form (last 5, 10 games)
- Season statistics (W/L, PPG, points allowed)
- Home/away splits
- ATS (Against the Spread) records
- Over/Under records
- Advanced metrics (DVOA, Net Rating, etc.)

#### Recommended Sources:

**Option A: SportsDataIO API** (PAID - Recommended)
- **Cost**: $50-200/month
- **Coverage**: All major sports, comprehensive stats
- **API Endpoints**:
  - `/v3/{sport}/scores/json/Teams`
  - `/v3/{sport}/scores/json/TeamSeasonStats/{season}`
  - `/v3/{sport}/scores/json/Standings/{season}`
- **Pros**: Official data, reliable, well-documented
- **Cons**: Paid service
- **Setup**: Requires API key from SportsDataIO

**Option B: ESPN API** (FREE - Limited)
- **Coverage**: Basic stats, may be rate-limited
- **Endpoints**: Unofficial, scraping required
- **Pros**: Free
- **Cons**: Unreliable, may break, rate limits
- **Setup**: Web scraping with rate limiting

**Option C: Self-Built Database** (FREE - Long-term)
- **Coverage**: Build from multiple free sources
- **Pros**: Free, customizable
- **Cons**: Time-intensive to build and maintain
- **Setup**: Scrape ESPN, team websites, build database

#### Implementation Priority: **IMMEDIATE**

---

### 2. Injury Reports

#### Data Needed:
- Player name, position, status (out/questionable/probable)
- Injury type and severity
- Impact level (star player vs role player)
- Game-time decisions

#### Recommended Sources:

**Option A: Rotowire API** (PAID - Recommended)
- **Cost**: $50-100/month
- **Coverage**: Comprehensive injury reports, depth charts
- **API Endpoints**:
  - `/injuries/{sport}`
  - `/depth-charts/{sport}/{team}`
- **Pros**: Real-time, accurate, official sources
- **Cons**: Paid service
- **Setup**: Requires Rotowire API key

**Option B: ESPN Injury Report** (FREE - Scraping)
- **Coverage**: All major sports
- **URL Pattern**: `https://www.espn.com/{sport}/injuries`
- **Pros**: Free, comprehensive
- **Cons**: Requires web scraping, may break
- **Setup**: Scrape ESPN injury pages, parse HTML

**Option C: SportsDataIO** (PAID - Part of larger package)
- **Cost**: Included in SportsDataIO subscription
- **Coverage**: Injury reports + other data
- **Pros**: One API for multiple data types
- **Cons**: More expensive overall
- **Setup**: Use SportsDataIO injury endpoints

#### Implementation Priority: **IMMEDIATE**

---

### 3. Head-to-Head History

#### Data Needed:
- Recent meetings (last 5-10 games)
- Win/loss records
- ATS records in matchups
- Average totals
- Trends (home dominance, high/low scoring)

#### Recommended Sources:

**Option A: SportsDataIO** (PAID)
- **Endpoints**: 
  - `/v3/{sport}/scores/json/TeamGameStatsByWeek/{season}/{week}`
  - Historical game results
- **Pros**: Comprehensive historical data
- **Cons**: Requires historical data subscription

**Option B: Self-Built Database** (FREE - Recommended)
- **Coverage**: Build from The Odds API historical scores
- **Pros**: Free, can build over time
- **Cons**: Requires time to build
- **Setup**: 
  1. Use The Odds API `/scores` endpoint (already have access)
  2. Store historical results in database
  3. Build H2H lookup table
- **Implementation**: Store completed games, query by team pairs

#### Implementation Priority: **IMMEDIATE** (Can start with The Odds API historical data)

---

## Phase 2: Significant Improvement Data Sources (MEDIUM PRIORITY)

### 4. Rest & Travel Data

#### Data Needed:
- Days rest between games
- Back-to-back game indicators
- Travel distance (miles)
- Time zone changes
- Travel time

#### Recommended Sources:

**Option A: Calculate from Schedule** (FREE - Recommended)
- **Coverage**: All sports
- **Pros**: Free, accurate
- **Cons**: Need schedule data
- **Setup**: 
  1. Use The Odds API schedule data (already have)
  2. Calculate days between games
  3. Calculate travel distance using team locations
  4. Determine time zone changes
- **Implementation**: 
  - Team location database (lat/long or city)
  - Distance calculation (Haversine formula)
  - Time zone lookup

**Option B: SportsDataIO** (PAID)
- **Endpoints**: Includes travel data in game info
- **Pros**: Pre-calculated
- **Cons**: Paid service

#### Implementation Priority: **HIGH** (Easy to implement, high impact)

---

### 5. Situational Statistics

#### Data Needed:
- Primetime performance records
- Division game records
- Weather performance (cold/rain/snow)
- Dome vs outdoor performance
- Playoff race implications

#### Recommended Sources:

**Option A: Self-Built Database** (FREE - Recommended)
- **Coverage**: Build from historical data
- **Pros**: Free, customizable
- **Cons**: Requires historical data collection
- **Setup**:
  1. Store game results with context (primetime, division, weather)
  2. Calculate team performance in each situation
  3. Build lookup tables
- **Implementation**: 
  - Tag games with situational flags
  - Calculate win rates in each situation
  - Store in team stats database

**Option B: SportsDataIO** (PAID)
- **Endpoints**: Situational stats available
- **Pros**: Pre-calculated
- **Cons**: Paid service

#### Implementation Priority: **MEDIUM** (Can build over time)

---

### 6. Line Movement & Betting Trends

#### Data Needed:
- Opening lines vs current lines
- Line movement direction
- Public betting percentages
- Sharp money indicators
- Steam moves

#### Recommended Sources:

**Option A: The Odds API** (PAID - Already Have)
- **Coverage**: Line movement tracking
- **Cost**: Included in subscription
- **Setup**:
  1. Store opening lines when first fetched
  2. Compare with current lines
  3. Track movement over time
- **Implementation**: 
  - Store historical odds snapshots
  - Calculate movement
  - Identify sharp money patterns

**Option B: Action Network API** (PAID)
- **Cost**: $100+/month
- **Coverage**: Public betting %, sharp money indicators
- **Pros**: Comprehensive betting intelligence
- **Cons**: Expensive
- **Setup**: Requires Action Network API key

**Option C: VSiN (Vegas Stats & Information Network)** (PAID)
- **Cost**: $50-100/month
- **Coverage**: Sharp money indicators, line movement analysis
- **Pros**: Expert analysis
- **Cons**: Paid service

#### Implementation Priority: **MEDIUM** (Can start with The Odds API tracking)

---

## Phase 3: Fine-Tuning Data Sources (LOW PRIORITY)

### 7. Player-Level Data

#### Data Needed:
- Key player statistics
- Recent form
- Matchup advantages
- Minutes/usage trends
- Clutch performance

#### Recommended Sources:

**Option A: NBA Stats API** (FREE - NBA Only)
- **Coverage**: Official NBA player stats
- **URL**: `https://stats.nba.com/stats/`
- **Pros**: Free, official, comprehensive
- **Cons**: NBA only, may have rate limits
- **Setup**: Use NBA Stats API endpoints

**Option B: SportsDataIO** (PAID)
- **Coverage**: All sports, player stats
- **Pros**: Comprehensive
- **Cons**: Paid service

**Option C: ESPN API** (FREE - Scraping)
- **Coverage**: Player stats, may be limited
- **Pros**: Free
- **Cons**: Requires scraping, unreliable

#### Implementation Priority: **LOW** (Most important for NBA, less for other sports)

---

### 8. Referee/Officials Data

#### Data Needed:
- Referee assignments
- Penalty rates
- Home bias tendencies
- Over/under trends
- Game pace impact

#### Recommended Sources:

**Option A: Self-Built Database** (FREE - Recommended)
- **Coverage**: Build from game results
- **Pros**: Free, customizable
- **Cons**: Requires historical data
- **Setup**:
  1. Track referee assignments (from game data)
  2. Calculate stats per referee
  3. Build referee database
- **Implementation**: 
  - Store referee assignments with game results
  - Calculate averages per referee
  - Lookup before predictions

**Option B: SportsDataIO** (PAID)
- **Coverage**: Referee stats
- **Pros**: Pre-calculated
- **Cons**: Paid service

#### Implementation Priority: **LOW** (Small impact, but measurable)

---

### 9. Motivation Factors

#### Data Needed:
- Playoff race implications
- Rivalry game indicators
- Revenge game flags
- Trap game indicators
- Must-win scenarios

#### Recommended Sources:

**Option A: Self-Built Logic** (FREE - Recommended)
- **Coverage**: Calculate from standings and context
- **Pros**: Free, customizable
- **Cons**: Requires logic implementation
- **Setup**:
  1. Calculate playoff standings
  2. Determine game importance
  3. Flag rivalry games (database)
  4. Calculate motivation scores
- **Implementation**: 
  - Standings calculation
  - Playoff race logic
  - Rivalry database
  - Motivation scoring algorithm

**Option B: SportsDataIO** (PAID)
- **Coverage**: Some context data
- **Pros**: Pre-calculated
- **Cons**: Paid service

#### Implementation Priority: **LOW** (Hard to quantify, but can help)

---

## Recommended Implementation Plan

### Phase 1 (Week 1-2): Critical Data
1. **Team Statistics** - Use SportsDataIO or build from free sources
2. **Injury Reports** - Rotowire API or ESPN scraping
3. **H2H History** - Build from The Odds API historical scores

### Phase 2 (Week 3-4): Significant Improvements
4. **Rest & Travel** - Calculate from schedule (FREE, easy)
5. **Situational Stats** - Build database over time (FREE)
6. **Line Movement** - Track with The Odds API (already have)

### Phase 3 (Week 5+): Fine-Tuning
7. **Player Data** - NBA Stats API (FREE for NBA)
8. **Referee Data** - Build database (FREE)
9. **Motivation Factors** - Self-built logic (FREE)

---

## API Keys Needed

### Required (Phase 1):
1. **SportsDataIO API Key** - For team stats, injuries (if using paid)
   - Sign up at: https://sportsdata.io/
   - Cost: $50-200/month
   - Or use free alternatives

2. **Rotowire API Key** - For injury reports (if using paid)
   - Sign up at: https://www.rotowire.com/
   - Cost: $50-100/month
   - Or scrape ESPN for free

### Optional (Phase 2-3):
3. **Action Network API Key** - For betting trends
   - Sign up at: https://www.actionnetwork.com/
   - Cost: $100+/month

4. **OpenWeatherMap API Key** - For enhanced weather data
   - Sign up at: https://openweathermap.org/api
   - Cost: Free tier available

### Already Have:
- **The Odds API** - Already integrated, can use for line movement tracking

---

## Free Alternatives Strategy

If budget is limited, here's how to get all data for free:

1. **Team Stats**: Scrape ESPN, team websites, build database
2. **Injuries**: Scrape ESPN injury reports
3. **H2H History**: Use The Odds API historical scores (already have)
4. **Rest/Travel**: Calculate from schedule (already have dates)
5. **Situational Stats**: Build from historical data over time
6. **Line Movement**: Track with The Odds API (already have)
7. **Player Data**: NBA Stats API (free for NBA)
8. **Referee Data**: Build from game results
9. **Motivation**: Self-built logic

**Trade-off**: More development time, but $0/month cost

---

## Data Storage Strategy

### Database Schema Needed:

1. **team_stats** table
   - team_name, sport, season
   - recent_form, season_stats, home_away_splits, ats, totals, advanced_metrics
   - updated_at

2. **injuries** table
   - team, player_name, position, status, injury, impact, date

3. **h2h_history** table
   - home_team, away_team, sport
   - game_date, home_score, away_score, spread, total
   - home_covered, over_hit

4. **line_movement** table
   - game_id, sport
   - opening_spread, current_spread, opening_total, current_total
   - movement_timestamp

5. **situational_stats** table
   - team, sport, situation_type (primetime, division, etc.)
   - wins, losses, performance_metrics

6. **referee_stats** table
   - referee_name, sport
   - penalty_rate, home_bias, over_under_trend, pace_impact

### Caching Strategy:
- Team stats: Update daily
- Injuries: Update every 6-12 hours
- H2H: Update as games complete
- Line movement: Track every hour
- Situational stats: Update weekly

---

## Environment Variables Needed

Add to `.env.local`:

```bash
# Phase 1: Critical Data Sources
SPORTSDATAIO_API_KEY=your_key_here
ROTOWIRE_API_KEY=your_key_here

# Phase 2: Optional Data Sources
ACTION_NETWORK_API_KEY=your_key_here
OPENWEATHERMAP_API_KEY=your_key_here

# Phase 3: Free APIs
NBA_STATS_API_KEY=not_required_for_basic_usage
```

---

## Implementation Checklist

### Phase 1 (Critical):
- [ ] Set up SportsDataIO or free alternative for team stats
- [ ] Set up Rotowire or ESPN scraping for injuries
- [ ] Build H2H database from The Odds API historical data
- [ ] Create database schema for new data
- [ ] Update Game interface (✅ DONE)
- [ ] Update prediction logic to use new data

### Phase 2 (Significant):
- [ ] Implement rest/travel calculation
- [ ] Build situational stats database
- [ ] Implement line movement tracking
- [ ] Update prediction logic for Phase 2 data

### Phase 3 (Fine-Tuning):
- [ ] Integrate NBA Stats API for player data
- [ ] Build referee stats database
- [ ] Implement motivation factor logic
- [ ] Final prediction logic updates

---

## Cost Summary

### Paid Option (Recommended for Speed):
- SportsDataIO: $50-200/month
- Rotowire: $50-100/month
- **Total**: $100-300/month

### Free Option (Recommended for Budget):
- All free alternatives: $0/month
- **Total**: $0/month (more development time)

### Hybrid Option (Balanced):
- SportsDataIO: $50-200/month (team stats + injuries)
- Free for rest: $0
- **Total**: $50-200/month

---

## Next Steps

1. **Decide on budget** - Paid vs Free strategy
2. **Set up API keys** - For chosen services
3. **Create database schema** - For storing new data
4. **Implement data fetchers** - One at a time, starting with Phase 1
5. **Update prediction logic** - Integrate new data sources
6. **Test and validate** - Measure accuracy improvements

---

## Support & Documentation

- SportsDataIO Docs: https://sportsdata.io/developers/api-documentation
- Rotowire API: Contact for API access
- The Odds API: https://the-odds-api.com/liveapi/guides/v4/
- NBA Stats API: https://github.com/swar/nba_api
- OpenWeatherMap: https://openweathermap.org/api

