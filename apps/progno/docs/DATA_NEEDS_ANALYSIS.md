# Progno Data Needs Analysis

## Currently Used Data ✅

### From The Odds API:
- **Odds Data**: Moneyline, Spread, Total
- **Basic Game Info**: Teams, Date, Venue name

### Optional/Placeholder Data:
- **Weather**: Temperature, Conditions, Wind Speed (when provided)
- **Injuries**: Impact numbers only (homeImpact, awayImpact) - NOT actual injury reports
- **Turnovers**: Per game averages (when provided)
- **Pace**: Plays per game (when provided)
- **Home Field Advantage**: Override value (defaults to 5%)

---

## Critical Missing Data 🚨

### 1. **Team Performance Metrics** (HIGH PRIORITY)
**Why it matters**: Current model relies heavily on Vegas lines but lacks team strength data
- **Recent Form**: Last 5-10 games W/L record, ATS record
- **Season Statistics**: Points per game, points allowed, offensive/defensive efficiency
- **Home/Away Splits**: Performance at home vs away
- **Against the Spread (ATS)**: Historical ATS performance
- **Over/Under Record**: How often teams hit totals
- **Advanced Metrics**: 
  - NFL: DVOA, EPA/play, success rate
  - NBA: Net rating, offensive/defensive rating, pace
  - MLB: wOBA, FIP, team WAR
  - NHL: Corsi, Fenwick, PDO

**Impact**: Would significantly improve confidence calculations and edge detection

---

### 2. **Injury Reports** (HIGH PRIORITY)
**Why it matters**: Currently only has impact numbers, not actual injury data
- **Player Status**: Who's out, questionable, probable
- **Key Player Impact**: Star players vs role players
- **Position Depth**: Backup quality
- **Injury Type**: Long-term vs short-term impact
- **Game-Time Decisions**: Last-minute scratches

**Impact**: Critical for accurate predictions, especially in NBA/NFL where one player can swing outcomes

**Data Sources**: 
- ESPN Injury Report API
- SportsDataIO
- Rotowire API

---

### 3. **Head-to-Head History** (MEDIUM PRIORITY)
**Why it matters**: Some teams match up better against certain opponents
- **Recent H2H Record**: Last 5-10 meetings
- **H2H Trends**: Home team dominance, high/low scoring games
- **Rivalry Factors**: Emotional/psychological factors
- **Coaching Matchups**: How coaches perform against each other

**Impact**: Improves confidence in close games and identifies matchup advantages

---

### 4. **Rest & Travel Data** (MEDIUM PRIORITY)
**Why it matters**: Fatigue significantly impacts performance
- **Days Rest**: Time between games
- **Back-to-Back Games**: NBA/NHL especially
- **Travel Distance**: Miles traveled, time zones crossed
- **Travel Time**: How long since last game
- **Rest vs Opponent**: Rest advantage/disadvantage

**Impact**: NBA/NHL back-to-backs can swing win probability by 5-10%

**Data Sources**:
- Calculate from schedule data
- SportsDataIO travel data

---

### 5. **Situational Statistics** (MEDIUM PRIORITY)
**Why it matters**: Teams perform differently in different situations
- **Primetime Performance**: How teams perform in night games
- **Division Games**: Performance in division matchups
- **Playoff Implications**: Must-win games, clinching scenarios
- **Weather Performance**: How teams perform in cold/rain/snow
- **Dome vs Outdoor**: Performance in different venue types

**Impact**: Identifies value in specific game contexts

---

### 6. **Line Movement & Betting Trends** (MEDIUM PRIORITY)
**Why it matters**: Sharp money indicators reveal value
- **Line Movement**: How lines have moved (sharp vs public money)
- **Public Betting %**: Percentage of bets on each side
- **Sharp Money Indicators**: Where smart money is going
- **Reverse Line Movement**: When line moves against public
- **Steam Moves**: Rapid line movements

**Impact**: Helps identify when model disagrees with market for good reasons

**Data Sources**:
- The Odds API (can track line movement over time)
- Action Network API
- VSiN (Vegas Stats & Information Network)

---

### 7. **Player-Level Data** (LOW-MEDIUM PRIORITY)
**Why it matters**: Individual matchups matter, especially in NBA
- **Key Player Stats**: PPG, efficiency, recent form
- **Matchup Advantages**: How players perform vs specific opponents
- **Minutes/Usage**: Recent minutes trends, load management
- **Clutch Performance**: Performance in close games
- **Injury Replacements**: How backups perform when starters out

**Impact**: Most important for NBA, less for NFL/MLB team sports

**Data Sources**:
- ESPN API
- SportsDataIO
- NBA Stats API (free)

---

### 8. **Referee/Officials Data** (LOW PRIORITY)
**Why it matters**: Some refs call games differently
- **Penalty Rates**: How often refs call penalties (NFL/NBA)
- **Total Trends**: Do certain refs favor over/under
- **Home Bias**: Do refs favor home teams
- **Game Pace**: Do refs allow faster/slower games

**Impact**: Small but measurable, especially for totals

---

### 9. **Motivation Factors** (LOW PRIORITY)
**Why it matters**: Teams play differently based on context
- **Playoff Race**: Must-win scenarios
- **Rivalry Games**: Emotional intensity
- **Revenge Games**: Rematches after losses
- **Trap Games**: Looking ahead to next opponent
- **Letdown Games**: After big wins

**Impact**: Hard to quantify but can affect outcomes

---

### 10. **Advanced Game Context** (LOW PRIORITY)
**Why it matters**: Additional context improves edge detection
- **Venue-Specific Data**: Altitude (Denver), dome advantages
- **Time of Day**: Afternoon vs night performance
- **Day of Week**: Weekend vs weekday performance
- **Holiday Games**: Special game contexts
- **Streak Factors**: Win/loss streaks, momentum

---

## Recommended Implementation Priority

### Phase 1 (Immediate Impact):
1. **Team Statistics** - Recent form, season stats, home/away splits
2. **Injury Reports** - Actual injury data, not just impact numbers
3. **Head-to-Head History** - Recent matchup data

### Phase 2 (Significant Improvement):
4. **Rest & Travel Data** - Days rest, back-to-backs, travel distance
5. **Situational Statistics** - Primetime, division games, weather performance
6. **Line Movement Tracking** - Sharp money indicators

### Phase 3 (Fine-Tuning):
7. **Player-Level Data** - Key player stats, matchups (NBA-focused)
8. **Referee Data** - Officiating trends
9. **Motivation Factors** - Playoff implications, rivalry games

---

## Data Source Recommendations

### Free/Public APIs:
- **ESPN API**: Injury reports, basic stats (unofficial, may be rate-limited)
- **NBA Stats API**: Official NBA data (free, well-documented)
- **NFL.com**: Public data (scraping required)
- **The Odds API**: Already using, can track line movement over time

### Paid APIs (Worth the Investment):
- **SportsDataIO**: Comprehensive stats, injuries, schedules ($50-200/month)
- **Action Network API**: Betting trends, line movement ($100+/month)
- **Rotowire API**: Injury reports, depth charts ($50-100/month)
- **SportsRadar**: Official data feeds (expensive but comprehensive)

### Self-Built Solutions:
- **Web Scraping**: ESPN, team websites for injury reports
- **Database Building**: Store historical data for H2H, trends
- **Line Movement Tracker**: Poll The Odds API regularly to track movement

---

## Quick Wins (Easiest to Implement)

1. **Calculate Rest Days**: From schedule data (already have dates)
2. **Track Line Movement**: Store odds when fetched, compare over time
3. **Basic Team Stats**: Scrape or use free APIs for recent W/L, PPG
4. **H2H History**: Build database from historical game results
5. **Weather Enhancement**: Use OpenWeatherMap API for more detailed weather

---

## Expected Impact

### With Phase 1 Data:
- **Confidence Accuracy**: +5-10% improvement
- **Edge Detection**: Better identification of value bets
- **False Positive Reduction**: Fewer bad picks

### With Phase 2 Data:
- **Confidence Accuracy**: +10-15% additional improvement
- **Situational Value**: Better picks in specific contexts
- **Sharp Money Alignment**: Identify when model agrees with smart money

### With Phase 3 Data:
- **Fine-Tuning**: +2-5% additional improvement
- **Edge Cases**: Better handling of unique situations
- **Comprehensive Analysis**: More detailed game analysis for paid tiers

---

## Implementation Notes

1. **Start with Free Data**: Build foundation with free APIs and scraping
2. **Validate Impact**: Test each data source before paying for APIs
3. **Cache Aggressively**: Team stats don't change daily, cache for efficiency
4. **Fallback Gracefully**: System should work even if new data sources fail
5. **Prioritize by Sport**: Different sports need different data (NBA needs player data more than NFL)

