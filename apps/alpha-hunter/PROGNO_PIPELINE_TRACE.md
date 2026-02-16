# PROGNO PIPELINE TRACE - Complete Flow from Odds to Picks

## 1. ODDS FETCHING (Line 182-222)
**File:** `app/api/picks/today/route.ts`

```typescript
// Fetch from The-Odds API for 6 sports:
const sports = ['basketball_nba', 'americanfootball_nfl', 'icehockey_nhl', 
                'baseball_mlb', 'americanfootball_ncaaf', 'basketball_ncaab']

// For each sport:
fetch(`https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${oddsApiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`)

// Time window filtering:
// - Regular: games within REGULAR_MAX_DAYS_AHEAD (default: 1 day)
// - Early lines: games between EARLY_LINES_MIN_DAYS (2) and EARLY_LINES_MAX_DAYS (5)
```

**Input:** Raw odds data from The-Odds API
**Output:** Array of games with bookmakers, odds, spreads, totals

---

## 2. BUILD PICK FROM RAW GAME (Line 228)
**Function:** `buildPickFromRawGame(game, sport)` (Lines 248-800+)

### 2a. CONSENSUS ODDS CALCULATION (Lines 283-348)
- Aggregates up to 5 bookmakers (Pinnacle, BetMGM, DraftKings, FanDuel, Bet365)
- Calculates average odds for home/away teams
- Removes vig using `shinDevig()` to get true probabilities

**Key variables:**
- `consensusHomeOdds` / `consensusAwayOdds`: Average market odds
- `noVigHome` / `noVigAway`: Devigged implied probabilities
- `favorite`: Team with higher probability (lower odds)
- `favoriteProb`: Probability of favorite winning

### 2b. MONTE CARLO SIMULATION (Lines 351-412)
```typescript
const monteCarloResult = monteCarloEngine.simulateGame({
  homeTeam, awayTeam, homeOdds, awayOdds, spread, total,
  iterations: 1500
})
```

**Output:**
- `homeWinProbability`: MC probability for home team (0-1)
- `awayWinProbability`: MC probability for away team (0-1)
- `predictedScore`: { home, away }
- `spreadProbabilities`: { homeCovers, awayCovers }
- `totalProbabilities`: { over, under, averageTotal }

### 2c. CLAUDE EFFECT CALCULATION (Lines 414-468)
**Function:** `calculateClaudeEffect()` with 7 dimensions:

1. **SF (Sentiment Field)** - Odds bias: `(marketProb - 0.5) / 0.5` [Range: -1 to 1]
2. **NM (Narrative Momentum)** - Always 0 (no narrative data yet)
3. **IAI (Information Asymmetry)** - Spread vs ML discrepancy [Range: -0.1 to 0.1]
4. **CSI (Chaos Sensitivity)** - Based on probability gap [Range: 0.04 to 0.22]
5. **NIG (News Impact Grade)** - Always 0 (no real-time news)
6. **TRD (Temporal Recency Decay)** - `0.95 ^ hoursUntilGame` [Range: 0-1]
7. **EPD (External Pressure Differential)** - Always 0

**Total Effect:** Sum of all dimensions [Range: -2 to +2]

### 2d. CONFIDENCE CALCULATION (Lines 615-645)
```typescript
const probDiff = Math.abs(favoriteProb - 0.5)
const baseConfidence = 50 + (probDiff * 80)           // 50-90% range
const claudeBoost = claudeEffect.totalEffect * 40      // -80 to +80
let mcBoost = 0
if (monteCarloResult) {
  // FIXED: Now uses favorite's MC probability
  const isFavoriteHome = favorite === game.home_team
  const mcWinProb = isFavoriteHome 
    ? monteCarloResult.homeWinProbability 
    : monteCarloResult.awayWinProbability
  mcBoost = (mcWinProb - 0.5) * 30                    // -15 to +15
}
const chaosPenalty = claudeEffect.dimensions.CSI * 25  // -5.5 to -1
const expConfidenceBoost = expFactors.confidenceDelta * 12  // 0 to +4

confidence = baseConfidence + claudeBoost + mcBoost - chaosPenalty + expConfidenceBoost
confidence = clamp(confidence, 52, 92)  // Hard limits
```

### 2e. VALUE BET DETECTION (Lines 518-580)
**Function:** `detectValueBets()`

For each bet type (moneyline, spread, total):
- Calculate model probability
- Compare to market implied probability
- Edge = modelProb - impliedProb

**Example moneyline:**
```typescript
const homeEdge = (result.homeWinProbability - noVigHome) * 100
const awayEdge = (result.awayWinProbability - noVigAway) * 100
```

**Criteria for value bet:**
- Edge >= 5% AND positive expected value

### 2f. PICK ASSIGNMENT (Lines 655-674)
```typescript
let recommendedPick = favorite           // Default: pick the favorite
let recommendedType = 'MONEYLINE'
let recommendedOdds = favoriteOdds

// Value bet can override favorite
if (bestValueBet?.edge >= 5 && bestValueBet.type === 'moneyline') {
  recommendedPick = bestValueBet.side
  recommendedOdds = bestValueBet.odds
}
```

### 2g. TRIPLE ALIGNMENT (Lines 676-681)
```typescript
const valueSideMatchesPick = bestValueBet && 
  (bestValueBet.side === favorite || bestValueBet.side === game.home_team || bestValueBet.side === game.away_team)

// FIXED: Now checks recommendedPick instead of favorite
const mcAgrees = monteCarloResult && (recommendedPick === game.home_team 
  ? monteCarloResult.homeWinProbability > 0.5 
  : monteCarloResult.awayWinProbability > 0.5)

const tripleAlign = !!(bestValueBet?.edge >= 5 && valueSideMatchesPick && mcAgrees)
```

### 2h. COMPOSITE SCORE (Lines 686-696)
```typescript
const normalizedEdge = Math.min(Math.max(edgeNum, 0), 30) / 30    // 0-35 points
const normalizedEv = Math.min(Math.max(evNum, 0), 80) / 80        // 0-35 points
const confidenceComponent = (confidence / 100) * 20                // 0-20 points
const tripleAlignBonus = tripleAlign ? 20 : 0                    // 0 or 20 points
const hasValueBonus = valueBets.length > 0 ? 10 : 0               // 0 or 10 points

compositeScore = normalizedEdge * 35 + normalizedEv * 35 + 
                 confidenceComponent + tripleAlignBonus + hasValueBonus
```

### 2i. FINAL PICK OBJECT (Lines 735-788)
```typescript
{
  sport,
  league,
  home_team,
  away_team,
  pick: recommendedPick,                    // The actual pick
  pick_type: recommendedType,
  odds: recommendedOdds,
  confidence,                              // Calculated confidence (52-92%)
  game_time,
  is_premium: confidence >= 75 || (bestValueBet?.edge > 5) || tripleAlign,
  analysis,                                // Generated text
  game_id,
  expected_value_raw: bestValueBet?.expectedValue ?? 0,
  expected_value: Math.min(EV_DISPLAY_CAP, bestValueBet?.expectedValue ?? 0),
  reasoning: [...],
  triple_align: tripleAlign,
  composite_score,
  claude_effect,
  // All 7 dimensions...
  ai_confidence,
  mc_win_probability: monteCarloResult ?  // FIXED: Now returns picked team's MC prob
    (recommendedPick === game.home_team 
      ? monteCarloResult.homeWinProbability 
      : monteCarloResult.awayWinProbability) : undefined,
  mc_predicted_score,
  value_bet_edge,
  value_bet_ev,
  value_bet_kelly,
  has_value: valueBets.length > 0,
  is_favorite_pick: recommendedPick === noVigFavorite,
  all_value_bets: [...],
  total: { prediction, line, edge, probability, expected_value }
}
```

---

## 3. POST-PROCESSING (Lines 253-295)

### 3a. SELECT TOP 10 (Line 254)
**Function:** `selectTop10()` (Lines 904-924)

- Sort by composite score (descending)
- Break ties with expected value
- Max 3 picks per sport
- Return top 10

### 3b. SAVE TO SUPABASE (Lines 233-246)
```typescript
if (supabase) {
  const { data, error } = await supabase.from('picks').insert([pick]).select()
  if (!error && data) allPicks.push(data[0])
  else allPicks.push(pick)
}
```

### 3c. CACHE CHECK (Lines 143-180)
- Check if picks exist for today in Supabase
- Validate cached picks (e.g., skip if NHL has 5-5 scores)
- Return cached picks if valid

---

## 4. OUTPUT (Lines 257-295)

**API Response:**
```json
{
  "message": "Top 3 picks (of 24 games) — Cevict Flex + Triple Alignment — Regular (0-1 days)",
  "favorite_only": false,
  "picks": [...],                    // Array of pick objects
  "count": 3,
  "total_games": 24,
  "premium_count": 3,
  "value_bets_count": 3,
  "strategy": "Triple Alignment...",
  "earlyLines": false,
  "powered_by": "Cevict Flex (7-Dimensional Claude Effect)",
  "technology": {...},
  "dimensions": {...},
  "metrics_guide": {...}
}
```

---

## BUG FIXES APPLIED

1. **mcBoost calculation** (Lines 640-645)
   - **Before:** Used whichever MC prob > 0.5
   - **After:** Uses favorite's actual MC probability

2. **mcAgrees check** (Lines 677-680)
   - **Before:** Checked if `favorite` agreed with MC
   - **After:** Checks if `recommendedPick` agrees with MC

3. **mc_win_probability return** (Lines 763-768)
   - **Before:** Always returned home team MC prob
   - **After:** Returns picked team's MC probability

---

## KEY ISSUES IDENTIFIED

1. **Confidence Inflation:** The 92% confidence includes:
   - Base confidence: ~80% (from favorite probability)
   - Claude boost: up to +40% (experimental factors)
   - MC boost: up to +15%
   - Experimental boost: up to +4%
   - Minus chaos penalty: -1 to -5%
   
   **Result:** Confidence can be 10-15% higher than actual MC probability

2. **Edge Calculation:** For underdog picks (+1600 odds):
   - Market implied: 5.88%
   - Model probability: 90%
   - Edge: 84% (which is extremely high)

3. **Potential Issue:** The model may be overconfident on longshot underdogs
