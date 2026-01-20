# Advanced Statistical Methods in Progno

Progno now includes industry-standard statistical methods used by professional sports bettors and quants.

## ✅ Methods Added

### 1. **Poisson Distribution** - For Total Score Predictions
- **Purpose**: Predicts game totals (over/under) using Poisson distribution
- **How it works**:
  - Calculates expected scoring rates (lambda) for each team
  - Adjusts for offensive vs defensive matchups
  - Calculates probability of going over/under the total
- **Usage**: Automatically used when `gameData.odds.total` is provided
- **Formula**: `P(X > total) = 1 - Σ(k=0 to total) [λ^k * e^(-λ) / k!]`

### 2. **Enhanced Monte Carlo Simulation** - 10,000 Game Simulations
- **Purpose**: Run robust simulations for more accurate predictions
- **How it works**:
  - Simulates 10,000+ games using normal distribution
  - Tracks win rates, average scores, and standard deviation
  - Uses Box-Muller transform for normal distribution sampling
- **Usage**: Automatically used when `simulationCount >= 1000`
- **Output**: Win rate, confidence, average score, standard deviation

### 3. **Enhanced ELO Rating System** - Track Team Strength Over Time
- **Purpose**: Maintains dynamic ELO ratings that update based on performance
- **Improvements over basic ELO**:
  - Blends base ELO (70%) with recent form (30%)
  - Adjusts for home advantage (+50 ELO points)
  - Tracks team strength trends over time
- **Formula**: `P(win) = 1 / (1 + 10^(-eloDiff/400))`
- **ELO Update**: Ratings adjust after each game based on actual results

### 4. **Regression Model** - Factor in Historical Trends
- **Purpose**: Identifies trends in team performance (improving/declining)
- **How it works**:
  - Calculates trend = (recentAvg - seasonAvg)
  - Weights recent performance more heavily (40% recent, 60% season)
  - Adjusts predictions based on whether teams are improving or declining
- **Usage**: Automatically included in prediction pipeline
- **Output**: Trend analysis (improving/declining/stable) with confidence

### 5. **Bayesian Updates** - Learn from Past Predictions
- **Purpose**: Updates prior beliefs based on historical prediction accuracy
- **How it works**:
  - Uses historical win percentage as likelihood
  - Applies Bayesian theorem: `P(A|B) = P(B|A) * P(A) / P(B)`
  - Adjusts confidence based on past performance for similar games
- **Requirements**: Needs at least 10 historical predictions
- **Formula**: `posterior = (likelihood * prior) / evidence`

## 🎯 Integration

All methods are automatically integrated into the prediction pipeline:

1. **Poisson Distribution** - Used when total odds are available
2. **Regression Model** - Always included (if team stats available)
3. **Bayesian Update** - Used when historical data exists
4. **Enhanced Monte Carlo** - Used for 1000+ simulation requests
5. **Enhanced ELO** - Replaces basic ELO rating system

## 📊 Method Weights

Default weights (can be adjusted via Elite Fine-Tuner):
- `poisson-distribution`: 1.0
- `regression-model`: 1.2
- `bayesian-update`: 1.3
- `monte-carlo`: 1.0
- `elo-rating`: 1.0 (enhanced version)

## 🔬 Technical Details

### Poisson Distribution
```typescript
// Expected scoring rate
lambda = (offense * 0.7) + (offense * (1 - defense/30) * 0.3)

// Probability of over
P(over) = 1 - Σ(k=0 to total) [λ^k * e^(-λ) / k!]
```

### Monte Carlo Simulation
```typescript
// Normal distribution sampling (Box-Muller)
z = sqrt(-2 * ln(U1)) * cos(2π * U2)
score = mean + z * stdDev
```

### Bayesian Update
```typescript
// Posterior probability
posterior = (historicalAccuracy * prior) / evidence
confidence = min(posterior * 2, 0.9)
```

## 🚀 Usage Examples

### Request 10,000 Monte Carlo Simulations
```json
POST /api/progno/analyze-game
{
  "gameData": {...},
  "simulationCount": 10000
}
```

### Access Poisson Predictions
Poisson distribution predictions are automatically included when:
- `gameData.odds.total` is provided
- Method appears in `prediction.methods` array
- Reasoning includes: "Poisson distribution: Expected total X.X points"

## 📈 Performance

- **Monte Carlo**: Handles 10,000 simulations efficiently using optimized algorithms
- **Poisson**: Fast calculation using factorial caching
- **Bayesian**: Database-backed historical analysis
- **Regression**: Real-time trend calculation
- **ELO**: Enhanced with recent form weighting

## 🎓 Industry Standards

These methods are used by:
- **Professional Sportsbooks**: Poisson for totals, Monte Carlo for risk management
- **Quantitative Analysts**: Bayesian updates, regression models
- **ELO Systems**: Chess, FIFA rankings, sports analytics
- **Kelly Criterion**: Already implemented in bankroll manager

---

**Progno is now using the same statistical methods as professional sports betting operations!** 🎲

