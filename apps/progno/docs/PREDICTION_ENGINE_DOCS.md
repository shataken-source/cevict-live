# Advanced Prediction Engine Documentation

## Overview

The PROGNO Prediction Engine is the best prediction engine this side of Vegas. It uses multiple calculation methods to find the best probability and learns from its picks and results each week.

## Architecture

### Core Components

1. **PredictionEngine** (`app/lib/prediction-engine.ts`)
   - Main engine that combines multiple prediction methods
   - Learns from results and adjusts weights weekly
   - Uses 10+ different calculation methods

2. **API Endpoints**
   - `/api/progno/predict` - Generate predictions
   - `/api/progno/learn` - Record outcomes and trigger learning
   - `/api/progno/weekly-learning` - Weekly learning cycle (cron)
   - `/api/progno/daily-card` - Get today's picks (for Prognostication)

3. **Database Integration**
   - Stores predictions in `progno_predictions` table
   - Records outcomes in `progno_outcomes` table
   - Tracks performance metrics

## Prediction Methods

The engine uses 10 different calculation methods:

### 1. Statistical Model
- **Method**: Pythagorean Expectation + Advanced Metrics
- **Formula**: `Win% = (PointsFor^2.37) / (PointsFor^2.37 + PointsAgainst^2.37)`
- **Weight**: Adjusts based on performance (default: 1.0)
- **Factors**: Points for/against, win percentage, strength of schedule

### 2. ELO Rating System
- **Method**: ELO-based rating comparison
- **Formula**: `WinProb = 1 / (1 + 10^(-ELO_Diff/400))`
- **Weight**: Adjusts based on performance (default: 1.0)
- **Factors**: Team ELO ratings, home advantage adjustment

### 3. Recent Form Analysis
- **Method**: Weighted recent game results
- **Formula**: Recent games weighted more heavily (3-2-1 weighting)
- **Weight**: Adjusts based on performance (default: 1.0)
- **Factors**: Last 5-10 games, recent momentum

### 4. Head-to-Head History
- **Method**: Historical matchup analysis
- **Formula**: Series record with draw consideration
- **Weight**: Adjusts based on performance (default: 0.8)
- **Factors**: Historical wins/losses, recent matchups

### 5. Market Efficiency Analysis
- **Method**: Find value in betting odds
- **Formula**: Compare implied probability to model probability
- **Weight**: Adjusts based on performance (default: 1.2)
- **Factors**: Moneyline odds, spread, total, market efficiency

### 6. Weather Impact
- **Method**: Environmental factor analysis
- **Formula**: Precipitation, wind, temperature adjustments
- **Weight**: Adjusts based on performance (default: 0.6)
- **Factors**: Weather conditions, wind speed, temperature

### 7. Injury Impact
- **Method**: Player availability impact
- **Formula**: Impact score difference between teams
- **Weight**: Adjusts based on performance (default: 0.8)
- **Factors**: Key player injuries, injury severity

### 8. Home Advantage
- **Method**: Home field advantage calculation
- **Formula**: Home win rate + standard 3-point advantage
- **Weight**: Adjusts based on performance (default: 0.7)
- **Factors**: Home record, venue type

### 9. Momentum Analysis
- **Method**: Recent performance trend
- **Formula**: Weighted recent wins/losses (3-2-1 system)
- **Weight**: Adjusts based on performance (default: 0.9)
- **Factors**: Recent form, winning/losing streaks

### 10. Machine Learning Model
- **Method**: Historical performance-based prediction
- **Formula**: Weighted combination of historical accuracy
- **Weight**: Adjusts based on performance (default: 1.5)
- **Factors**: Historical win rate, similar game patterns

## How Predictions Work

### Step 1: Data Collection
```typescript
const gameData: GameData = {
  homeTeam: "Kansas City Chiefs",
  awayTeam: "Buffalo Bills",
  league: "NFL",
  odds: { home: -150, away: +130, spread: -3.5, total: 52.5 },
  teamStats: { home: {...}, away: {...} },
  recentForm: { home: ['W', 'W', 'L'], away: ['L', 'W', 'W'] },
  // ... more data
};
```

### Step 2: Method Execution
Each method calculates:
- Predicted winner
- Confidence level (0-1)
- Reasoning

### Step 3: Weighted Combination
All methods are combined using weighted average:
```typescript
const combinedConfidence = Σ(method.confidence × method.weight) / Σ(method.weight)
```

### Step 4: Edge Calculation
Expected value edge is calculated:
```typescript
const edge = (modelProbability - impliedProbability) × 100
```

### Step 5: Bet Recommendation
If edge > 2%, generate recommendation:
- High confidence (>65%): Recommend spread
- Lower confidence: Recommend moneyline

## Learning System

### How Learning Works

1. **Immediate Learning** (After Each Game)
   - Record outcome (correct/incorrect/partial)
   - Update method performance stats
   - Adjust method weights slightly (±10%)

2. **Weekly Learning Cycle** (Every Monday at 2 AM)
   - Analyze all predictions from past week
   - Calculate win rate for each method
   - Adjust weights based on performance
   - Reset weekly learning data

### Weight Adjustment Formula

```typescript
// For each method:
const winRate = correct / total;
const adjustment = (winRate - 0.5) × 0.2; // ±10% max
const newWeight = currentWeight × (1 + adjustment);

// Clamp between 0.5 and 2.0
newWeight = Math.max(0.5, Math.min(2.0, newWeight));
```

### Performance Tracking

Each method tracks:
- Total predictions
- Correct predictions
- Average accuracy
- Average confidence

## Data Flow: PROGNO → Prognostication

### PROGNO Side

1. **Generate Predictions**
   ```
   POST /api/progno/predict
   → Saves to database (progno_predictions table)
   → Returns prediction with methods and confidence
   ```

2. **Store Daily Picks**
   ```
   Daily picks stored in database with status='pending'
   ```

3. **Expose Daily Card**
   ```
   GET /api/progno/daily-card
   → Reads from database (today's predictions)
   → Falls back to file system if database unavailable
   → Returns picks sorted by quality score
   ```

### Prognostication Side

1. **Fetch Picks**
   ```javascript
   // In prognostication/lib/progno-api.js
   const response = await fetch(`${PROGNO_BASE_URL}/api/progno/daily-card`);
   const { picks } = await response.json();
   ```

2. **Allocate to Tiers**
   - Free: 1 pick (3rd best)
   - Pro: Top 5 picks
   - Elite: Top 10 picks

3. **Display to Users**
   - Show picks with confidence, edge, reasoning
   - Track user engagement

### Outcome Recording

1. **After Game Completion**
   ```javascript
   POST /api/progno/learn
   {
     predictionId: "...",
     actualOutcome: "correct" | "incorrect" | "partial",
     methods: [...], // Methods used in prediction
     outcomeData: {...}
   }
   ```

2. **Learning Triggered**
   - Updates method performance
   - Adjusts weights
   - Stores learning data

## API Endpoints

### POST /api/progno/predict

Generate a prediction for a game.

**Request:**
```json
{
  "homeTeam": "Kansas City Chiefs",
  "awayTeam": "Buffalo Bills",
  "league": "NFL",
  "odds": {
    "home": -150,
    "away": +130,
    "spread": -3.5,
    "total": 52.5
  },
  "teamStats": {
    "home": { "wins": 10, "losses": 5, ... },
    "away": { "wins": 8, "losses": 7, ... }
  },
  "recentForm": {
    "home": ["W", "W", "L"],
    "away": ["L", "W", "W"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "id": "pred_123",
    "predictedWinner": "Kansas City Chiefs",
    "confidence": 0.72,
    "edge": 5.3,
    "predictedScore": { "home": 28, "away": 24 },
    "methods": [...],
    "reasoning": [...],
    "recommendedBet": {
      "type": "spread",
      "side": "Kansas City Chiefs",
      "value": -3.5,
      "confidence": 0.72
    }
  }
}
```

### POST /api/progno/learn

Record an outcome and trigger learning.

**Request:**
```json
{
  "predictionId": "pred_123",
  "actualOutcome": "correct",
  "methods": [
    { "name": "statistical-model", "confidence": 0.7, "weight": 1.0 },
    ...
  ],
  "outcomeData": {
    "finalScore": { "home": 31, "away": 27 },
    "winner": "Kansas City Chiefs"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Outcome recorded and learning triggered"
}
```

### GET /api/progno/weekly-learning

Run weekly learning cycle (cron job).

**Query Parameters:**
- `trigger=cron` (required, or use auth header)

**Response:**
```json
{
  "success": true,
  "message": "Weekly learning cycle completed",
  "methodWeights": {
    "statistical-model": 1.05,
    "elo-rating": 0.98,
    ...
  },
  "methodPerformance": {
    "statistical-model": {
      "winRate": 62.5,
      "total": 40,
      "correct": 25,
      "avgAccuracy": 62.5
    },
    ...
  }
}
```

### GET /api/progno/daily-card

Get today's picks (for Prognostication integration).

**Response:**
```json
{
  "success": true,
  "picks": [
    {
      "gameId": "game_123",
      "game": "Kansas City Chiefs vs Buffalo Bills",
      "sport": "NFL",
      "pick": "Kansas City Chiefs",
      "confidencePct": 72,
      "edgePct": 5.3,
      "qualityScore": 77.3,
      "keyFactors": [...],
      "rationale": "...",
      "predictedScore": { "home": 28, "away": 24 },
      "riskLevel": "low"
    },
    ...
  ],
  "count": 15,
  "timestamp": "2025-01-20T10:00:00Z",
  "source": "database"
}
```

## Environment Variables

Required environment variables:

```bash
# Supabase (for database)
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# Cron Security
CRON_SECRET=your-secret-key-here

# PROGNO Base URL (for Prognostication)
PROGNO_BASE_URL=https://progno.vercel.app
```

## Cron Job Setup

The weekly learning cycle runs automatically via Vercel Cron:

```json
{
  "crons": [
    {
      "path": "/api/progno/weekly-learning?trigger=cron",
      "schedule": "0 2 * * 1"  // Every Monday at 2 AM
    }
  ]
}
```

## Monitoring & Debugging

### Check Method Weights
```typescript
const weights = predictionEngine.getMethodWeights();
console.log('Current weights:', weights);
```

### Check Method Performance
```typescript
const performance = predictionEngine.getMethodPerformance();
console.log('Method performance:', performance);
```

### View Learning Data
Check the `progno_predictions` and `progno_outcomes` tables in Supabase.

## Best Practices

1. **Always provide complete game data** - More data = better predictions
2. **Record outcomes promptly** - Learning depends on accurate outcome data
3. **Monitor method performance** - Adjust weights manually if needed
4. **Use database storage** - More reliable than file system
5. **Set up cron job** - Weekly learning is essential for improvement

## Troubleshooting

### Predictions seem inaccurate
- Check if all methods are receiving data
- Verify method weights are reasonable
- Check historical performance stats

### Learning not working
- Verify outcomes are being recorded
- Check weekly learning cron is running
- Review method performance stats

### Data flow issues
- Verify `PROGNO_BASE_URL` is set in Prognostication
- Check database connectivity
- Verify daily-card endpoint is accessible

## Future Enhancements

1. **Advanced ML Models** - Train actual neural networks
2. **Real-time Learning** - Adjust weights after each game
3. **Ensemble Methods** - Combine multiple ML models
4. **Feature Engineering** - More sophisticated data processing
5. **A/B Testing** - Test different weight combinations

---

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Status**: Production Ready

