# PROGNO DEEP AUDIT REPORT
**Date:** February 13, 2026  
**Auditor:** Cascade AI  
**Scope:** Complete analysis of prediction logic, data sources, and recommendation engine

---

## EXECUTIVE SUMMARY

Progno is a comprehensive sports prediction platform using a multi-model ensemble approach with 16+ prediction algorithms. The system pulls live odds from The Odds API, enriches with team stats and historical data, applies the "Claude Effect" for multi-dimensional adjustments, and outputs calibrated predictions with confidence scores and edge calculations.

**Key Finding:** The system is sophisticated but has several areas for improvement in data source diversity, calibration accuracy, and redundancy.

---

## 1. PREDICTION PIPELINE ARCHITECTURE

### Complete Flow: Lines → Predictions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 1: DATA INGESTION                                                     │
│  ├── The Odds API (Primary): Live odds, spreads, totals                     │
│  ├── SportsBlaze API (Optional): Schedules, box scores, standings           │
│  ├── OddsJam API (Optional): Player props, injuries, line movement          │
│  ├── Kalshi API (Optional): Prediction markets for probability validation     │
│  └── Historical Data: 2024 results stored in .progno/2024-results.json      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 2: DATA ENRICHMENT                                                    │
│  ├── Game Enricher: Rest/travel calc, H2H history, team stats             │
│  ├── Injury Collector: Impact scoring from multiple sources                 │
│  ├── Weather Service: Conditions impact analysis                              │
│  └── Historical Results: 2024 game outcomes for pattern matching            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 3: PREDICTION ENGINE (16 Models)                                    │
│  ├── Statistical Model: Pythagorean expectation (sport-specific exponents)  │
│  ├── ELO Rating: Enhanced with home advantage (NBA +25, NHL +50)            │
│  ├── Recent Form: Weighted by sport (NHL streaks matter more)               │
│  ├── Head-to-Head: Historical matchup analysis                              │
│  ├── Market Efficiency: Shin devigging for true probabilities              │
│  ├── Weather Impact: Precipitation, wind, temperature effects               │
│  ├── Injury Impact: Team-specific impact scoring                            │
│  ├── Home Advantage: Sport-specific defaults (NBA 1.4%, NHL 5%)             │
│  ├── Momentum: 3-game weighted momentum calc                               │
│  ├── Machine Learning: Historical accuracy blending                          │
│  ├── Poisson Distribution: For total score predictions                       │
│  ├── Regression Model: Trend analysis (recent vs season avg)                  │
│  ├── Bayesian Update: Prior probability updating with historical accuracy   │
│  └── Monte Carlo: 10,000 iteration simulations for robustness               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 4: CLAUDE EFFECT ENGINE                                               │
│  ├── Sentiment Field (SF): 0.15 weight - Sharp money detection              │
│  ├── Narrative Momentum (NM): 0.12 weight - H2H storylines                    │
│  ├── Information Asymmetry (IAI): 0.20 weight - Multi-source odds diff      │
│  ├── Network Influence (NIG): 0.13 weight - Market consensus                 │
│  ├── Emergent Patterns (EPD): 0.20 weight - Novel pattern detection          │
│  ├── Chaos Sensitivity (CSI): Penalty factor for uncertainty                │
│  └── Temporal Decay: Time-to-game confidence reduction (0.88-0.97)          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 5: OUTPUT GENERATION                                                  │
│  ├── Winner prediction with confidence (0-1 scale)                           │
│  ├── Edge calculation: (modelProb - marketProb) × 100, vig-adjusted        │
│  ├── Recommended bet: Type, side, value, stayAway flags                    │
│  ├── Key factors: Sharp money, upset risk, sentiment                        │
│  └── JSON output: predictions-YYYY-MM-DD.json                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. EXTERNAL DATA SOURCES ANALYSIS

### PRIMARY SOURCE: The Odds API
**Status:** ACTIVE - Critical dependency  
**Endpoints Used:**
- `GET /v4/sports/{sport}/odds/` - Moneyline, spreads, totals
- `GET /v4/sports/{sport}/scores/` - Final scores for grading
- `GET /v4/sports/{sport}/odds-live/` - In-game odds

**Sports Mapped:**
- `americanfootball_nfl` → NFL
- `basketball_nba` → NBA  
- `icehockey_nhl` → NHL
- `baseball_mlb` → MLB
- `americanfootball_ncaaf` → NCAAF
- `basketball_ncaab` → NCAAB

**Issues Found:**
1. **Single point of failure** - No fallback if The Odds API is down
2. **Rate limiting** - 500 req/day on free tier, no rate limit handling
3. **No line movement history** - Can't track sharp money over time
4. **Missing key data** - No injury data, weather, or team stats

### OPTIONAL SOURCES (Currently Underutilized)

#### 1. SportsBlaze API
**Status:** CONFIGURED BUT NOT ACTIVELY USED  
**Capabilities:**
- Daily/season schedules
- Box scores with detailed stats
- Standings with conference/division breakdowns
- Team rosters and depth charts

**Integration Issues:**
- Only loaded from env var `SPORTSBLAZE_API_KEY`
- No evidence of active fetching in production picks
- Could provide historical box scores for better ELO calculations

#### 2. OddsJam API  
**Status:** PARTIALLY IMPLEMENTED  
**Capabilities:**
- Player props database
- Injury reports
- Line movement tracking
- Sharp money indicators

**Issues:**
- Key stored but fetchers not integrated into main prediction flow
- Would be VALUABLE for injury impact (currently using defaults)

#### 3. Kalshi Prediction Markets
**Status:** IMPLEMENTED BUT NOT INTEGRATED INTO MAIN FLOW  
**Capabilities:**
- Real probability markets (0-99 cents = 0-99%)
- Perfect for states without legal betting
- Crowd wisdom aggregation

**Issues:**
- Requires RSA-PSS signature authentication (complex)
- Not actively used for probability calibration
- Could validate model predictions against market prices

#### 4. Polymarket
**Status:** IMPLEMENTED BUT NOT INTEGRATED  
**Capabilities:**
- Decentralized prediction markets
- GraphQL API for sports markets
- High liquidity on major events

**Issues:**
- Only fetches basic market data
- No active use in prediction generation

---

## 3. PREDICTION LOGIC DEEP DIVE

### Core Algorithm: Weighted Ensemble

The prediction engine combines 14-16 models using weighted voting:

```typescript
// From prediction-engine.ts lines 763-790
private combineMethods(methods, gameData) {
  const homeVotes = [];
  const awayVotes = [];

  methods.forEach(method => {
    const vote = method.confidence * method.weight;
    if (method.winner === gameData.homeTeam) {
      homeVotes.push(vote);
    } else {
      awayVotes.push(vote);
    }
  });

  const homeTotal = homeVotes.reduce((sum, v) => sum + v, 0);
  const awayTotal = awayVotes.reduce((sum, v) => sum + v, 0);
  const homeWinProb = homeTotal / (homeTotal + awayTotal);
  
  return { 
    winner: homeWinProb > 0.5 ? homeTeam : awayTeam,
    confidence: Math.abs(homeWinProb - 0.5) * 2 
  };
}
```

### Sport-Specific Calibrations

**Pythagorean Exponents (line 901-908):**
```typescript
NFL/NCAAF: 2.37    // Lower scoring, more variance
NBA/NCAAB: 13.91   // High scoring, less variance per possession  
MLB: 1.83          // Pitcher-dominated
NHL: 2.15          // Low scoring, high variance
```

**Home Advantage Boosts (line 920-927):**
```typescript
NBA: 1.4%          // Smallest - talent concentration
NCAAB: 2.9%        // College home court matters more
NHL: 5.0%          // Last change advantage
NFL/NCAAF: 5.2%    // Crowd noise, travel
```

**Momentum Weights (line 930-937):**
```typescript
NBA: 0.3          // Mean reversion - talent prevails
NCAAB: 0.4        // Slight streak impact
NHL: 0.7          // Streaks matter (hot goalie)
NFL: 0.5          // Moderate momentum
```

### Critical Logic Issues Found

#### 1. Confidence Calibration Cap (lines 953-975)
```typescript
// Basketball capped at 65% - was overconfident on NBA/NCAAB
if (sport.includes('NBA') || sport.includes('NCAAB')) {
  cap = Math.min(cap, 0.65);
}

// Big underdogs: cap confidence when implied prob < 40%
if (implied < 0.40) {
  cap = Math.min(cap, implied + 0.30);
}
```
**Issue:** Arbitrary cap may miss legitimate high-confidence picks.

#### 2. Edge Calculation (lines 825-837)
```typescript
// Uses Shin devigging to remove vig from market probs
const { home: homeNoVig, away: awayNoVig } = shinDevig(homeImplied, awayImplied);
const modelWinProb = isHomeWinner ? 0.5 + result.confidence / 2 : 0.5 - result.confidence / 2;
const rawEdge = (modelWinProb - marketProb) * 100;
const vigAdjusted = rawEdge / 1.045;
return Math.max(-100, Math.min(25, vigAdjusted)); // CAPPED AT 25%!
```
**Issue:** Edge is artificially capped at 25%, hiding true value in extreme mismatches.

#### 3. Default Score Bug (line 797)
```typescript
if (!gameData.teamStats) {
  return { home: 24, away: 21 }; // HARDCODED DEFAULT!
}
```
**Issue:** When team stats missing, returns NFL-style score (24-21) even for NHL games!

#### 4. Missing Data Handling
Many models return `confidence: 0.5` and pick home team when data is missing, creating home bias.

---

## 4. CLAUDE EFFECT ENGINE ANALYSIS

### 7 Dimensions with Weights

| Dimension | Weight | Description | Data Source |
|-----------|--------|-------------|-------------|
| Sentiment Field (SF) | 0.15 | Sharp money detection | Calculated from odds movement |
| Narrative Momentum (NM) | 0.12 | H2H storylines, rivalries | Head-to-head history API |
| Information Asymmetry (IAI) | 0.20 | Multi-source odds divergence | MultiSourceOddsService |
| Network Influence (NIG) | 0.13 | Market consensus | Implied probability variance |
| Emergent Patterns (EPD) | 0.20 | Novel detection signals | ML pattern recognition |
| Chaos Sensitivity (CSI) | N/A | Uncertainty penalty | Injury data (often default) |
| Temporal Decay | N/A | Time-to-game factor | Fixed: 0.88 (far), 0.92 (near), 0.95 (past) |

### Formula (line 217-226)
```typescript
computeBoundedEffect(scores) {
  let effect = 
    0.15 * scores.sentimentField +
    0.12 * scores.narrativeMomentum +
    0.20 * scores.informationAsymmetry +
    0.13 * scores.networkInfluence +
    0.20 * scores.emergentPatterns;
  
  return Math.max(-0.25, Math.min(0.25, effect)); // Bounded ±25%
}
```

### Critical Issues

1. **Sentiment Field Fixed at 0.4** (line 207) - Not actually calculated from sharp money
2. **Injury Data Using Defaults** - Real injury fetching exists but often falls back to defaults
3. **Monte Carlo Optional** - 1000 iterations available but not used in production predictions
4. **Recommendation Thresholds Arbitrary** - NFL: 62%/78%/7% vs DEFAULT: 65%/80%/8%

---

## 5. PROGNO MASSAGER PROJECT STATUS

### What Is It?
A **Streamlit-based Python application** for manual data transformation and probability adjustment. Located at `c:\cevict-live\apps\progno-massager-20260204T073248Z-3-001\progno-massager\`

### Current Status: **NOT INTEGRATED WITH MAIN PROD SYSTEM**

**Evidence:**
1. Separate Python/Streamlit codebase - not imported by main Next.js app
2. Has its own `app.py` entry point
3. Supabase schema files exist but no evidence of active sync
4. No references in main progno codebase

### Massager Features (if activated)
- **11 Data Massage Commands:**
  1. Trim Noise - Clean text fields
  2. Home Bias - +5% home adjustment
  3. Volatility - Flag high-risk games
  4. Time-Decay - Weight recent data
  5. Normalize - 0-1 range scaling
  6. Momentum - ±10% streak adjustment
  7. Injury - Deduct points for injuries
  8. Sentiment - Hype adjustment
  9. Arb Finder - Cross-book arbitrage
  10. Hedge Calc - Insurance betting
  11. JSON Export - Web-ready output

- **Supervisor Agent:** Approval workflow for high-risk operations
- **Arbitrage Detection:** Cross-platform value finding
- **Supabase Memory:** Persistent storage for processed data

### Recommendation on Massager
**SHOULD BE INTEGRATED** - The massager has valuable capabilities that could enhance the main prediction pipeline:
- Injury data processing
- Arbitrage detection across books
- Historical data normalization
- Cross-validation of picks

---

## 6. JSON STRUCTURE ANALYSIS

### Predictions Output (`predictions-2026-02-13.json`)

```json
[
  {
    "winner": "Buffalo Sabres",
    "confidence": 0.65,              // 0-1 scale
    "score": { "home": 10, "away": 10 },  // BUG: Default scores showing 10-10
    "edge": 47.99,                   // Percentage edge over market
    "keyFactors": [                  // Human-readable reasoning
      "Sharp money: backing home",
      "⚠️ Upset risk: 22%",
      "Experimental: Night game, Prime time (+4 conf)"
    ],
    "claudeEffect": {                // 7 dimensions
      "sentimentField": -0.006,
      "narrativeMomentum": 0,
      "informationAsymmetry": 0.0401,
      "chaosSensitivity": 0.22,
      "networkInfluence": 0,
      "temporalDecay": 0.88,
      "emergentPattern": 0
    },
    "engine": "cevict_flex",         // Engine identifier
    "pick_type": "MONEYLINE",        // MONEYLINE | SPREAD | TOTAL
    "odds": -121,                    // American odds format
    "analysis": "🎯 Picking Buffalo Sabres with 65% confidence..."
  }
]
```

### Results Output (`results-2026-02-12.json`)

```json
[
  {
    "League": "nhl",
    "GameId": "9d0b725f6e813c43975b6ac5532309a6",  // MD5 hash style ID
    "HomeTeam": "New Jersey Devils",
    "AwayTeam": "Buffalo Sabres",
    "HomeScore": null,               // null = not completed
    "AwayScore": null,
    "Winner": "Unknown",             // Unknown | HomeTeam | AwayTeam
    "Completed": false,
    "Timestamp": "2026-02-12 00:00:02"
  }
]
```

### Issues with JSON Structure

1. **Missing Fields:**
   - No `gameId` linking prediction to result
   - No `actualOutcome` for learning
   - No `predictionId` for tracking
   - No `methodsUsed` for accountability

2. **Score Bug:**
   - Predictions showing 10-10 for all NHL games (default value issue)

3. **No Version Control:**
   - Predictions overwritten daily
   - No history of model changes

---

## 7. FINDINGS SUMMARY

### ✅ What's Working Well

1. **Multi-Model Ensemble** - 16 models provide robust predictions
2. **Sport-Specific Calibrations** - Different weights for NFL vs NBA vs NHL
3. **Shin Devigging** - Proper removal of vig from market odds
4. **Edge Capping** - Prevents extreme edge claims (though maybe too conservative)
5. **Home Advantage Defaults** - Reasonable sport-specific values
6. **Learning System** - Method weights adjust based on performance

### ⚠️ Issues Found

| Severity | Issue | Location | Impact |
|----------|-------|----------|--------|
| **HIGH** | Single data source (The Odds API) | weekly-page.helpers.ts | Complete failure if API down |
| **HIGH** | Default 10-10 scores for all sports | prediction-engine.ts:797 | Inaccurate predictions |
| **HIGH** | Injury data using defaults | claude-effect-complete.ts:157 | Chaos sensitivity inaccurate |
| **MEDIUM** | Edge capped at 25% | prediction-engine.ts:836 | Misses true value |
| **MEDIUM** | Confidence caps arbitrary | prediction-engine.ts:961 | May miss good picks |
| **MEDIUM** | Massager not integrated | Separate project | Lost capabilities |
| **LOW** | Sentiment field fixed at 0.4 | claude-effect-complete.ts:207 | Not using sharp money |
| **LOW** | Kalshi/Polymarket not used | kalshi-fetcher.ts | Missed validation source |

---

## 8. RECOMMENDATIONS

### IMMEDIATE (Do Today)

1. **Add Data Source Fallbacks**
   ```typescript
   // Implement in weekly-page.helpers.ts
   async function fetchOddsWithFallback(sport) {
     try {
       return await fetchLiveOddsTheOddsApi(key, sport);
     } catch {
       return await fetchLiveOddsOddsJam(sport); // Fallback
     }
   }
   ```

2. **Fix Default Score Bug**
   ```typescript
   // prediction-engine.ts:797
   if (!gameData.teamStats) {
     // Return sport-appropriate defaults
     const defaults = { NFL: [24,21], NBA: [110,108], NHL: [3,2], MLB: [5,4] };
     return defaults[sport] || [0, 0];
   }
   ```

3. **Integrate Injury Data**
   - Connect OddsJam injury fetcher to Claude Effect
   - Or activate SportsBlaze roster endpoints

### SHORT-TERM (This Week)

4. **Integrate Progno Massager**
   - Create API bridge between Next.js app and Python massager
   - Use for injury data processing and arbitrage detection
   - Add massager commands as prediction pipeline filters

5. **Add Kalshi Validation**
   - Compare model predictions to Kalshi market prices
   - Flag when model diverges significantly from crowd wisdom
   - Use for confidence calibration

6. **Implement Line Movement Tracking**
   - Track odds changes over time
   - Detect sharp money movement
   - Adjust sentiment field calculation

### MEDIUM-TERM (This Month)

7. **Add More Data Sources**
   - ESPN API for team stats
   - Weather API integration (currently manual)
   - Social sentiment analysis

8. **Improve Calibration**
   - Track prediction accuracy by confidence bin
   - Adjust caps based on actual performance
   - Implement proper Kelly criterion sizing

9. **Enhance JSON Structure**
   ```json
   {
     "predictionId": "uuid",
     "gameId": "odds-api-id",
     "modelVersion": "cevict_flex_7d_v2.1",
     "methodsContributing": ["elo", "poisson", "bayesian"],
     "dataSources": ["oddsapi", "sportsblaze"],
     "calibrationBin": "60-70",
     "historicalAccuracy": 0.62
   }
   ```

### CONSIDER REMOVING

10. **Remove or Deprecate:**
    - **Polymarket integration** (if not being used - regulatory concerns)
    - **Anything Predictor** (`anything-predictor.ts`) - Non-sports predictions dilute focus
    - **Multiple weather pages** - Consolidate into single service

---

## 9. CEVICT PROBABILITY ANALYZER ASSESSMENT

The Cevict Probability Analyzer (`cevict-probability-analyzer/index.html`) is a **standalone HTML tool** for manual probability analysis.

### Features
- 16-model ensemble visualization
- Manual data point input
- Kelly criterion calculation
- EV calculation with rating
- File upload for predictions JSON

### Issues
- Static HTML only - no server connection
- Models use simplified calculations (not the full engine)
- No learning/feedback loop

### Recommendation
**Keep as debugging tool** but don't rely on it for production picks. The real prediction engine is in `prediction-engine.ts`.

---

## 10. CONCLUSION

Progno has a **solid foundation** with its multi-model ensemble approach and sport-specific calibrations. The prediction logic is sophisticated and well-designed. However, there are **critical gaps** in data source redundancy, injury data integration, and the unused massager capabilities.

**Priority Actions:**
1. Add data source fallback (OddsJam if The Odds API fails)
2. Fix the 10-10 default score bug
3. Integrate real injury data
4. Connect the massager project for enhanced processing

The system has the potential to be best-in-class but needs these fixes to reach production-grade reliability.

---

**End of Audit Report**
