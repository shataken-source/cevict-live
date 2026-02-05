# 2024 Simulation and Tuning Guide

## Overview

This simulation system fine-tunes the prediction engine using 2024 historical data. It runs 500+ simulations per game and iteratively adjusts parameters until achieving a 90% win rate.

## How It Works

### 1. Data Loading
- Loads 2024 game data from:
  - File: `data/2024-games.json` (if exists)
  - Database: Supabase `progno_predictions` table
  - Fallback: Generates sample NFL 2024 data

### 2. Simulation Process
For each game:
- Runs **500+ simulations** with slight variations
- Aggregates results using majority vote
- Records outcome for learning

### 3. Tuning Process
After each iteration:
- Analyzes method performance
- Adjusts method weights based on win rate
- Updates confidence thresholds
- Saves best parameters

### 4. Iteration Loop
- Runs until **90% win rate** achieved
- Maximum 50 iterations (prevents infinite loops)
- Saves progress after each iteration

## Running the Simulation

### Prerequisites

1. Install dependencies:
```bash
cd apps/progno
pnpm install
```

2. Set environment variables (optional, for database):
```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Run Simulation

```bash
pnpm simulate
```

Or directly:
```bash
tsx scripts/run-simulation.ts
```

### What Happens

1. **Data Loading**: Loads or generates 2024 game data
2. **Week-by-Week Simulation**: Simulates all 18 weeks
3. **500+ Simulations per Game**: Each game gets 500 simulation runs
4. **Tuning**: Adjusts parameters after each iteration
5. **Progress Saving**: Saves results after each iteration
6. **Final Report**: Shows final win rate and best parameters

## Output Files

### Progress Files
- Location: `data/simulations/`
- Format: `iteration-{N}.json`
- Contains: Results, win rate, parameters for each iteration

### Tuned Parameters
- Location: `data/tuned-parameters/`
- File: `2024-tuned-parameters.json`
- Contains: Best parameters achieving highest win rate

### Sample Data
- Location: `data/2024-games.json`
- Contains: Generated 2024 NFL game data (if no real data available)

## Tuning Parameters

The system tunes:

1. **Method Weights**
   - Each of 10 methods gets a weight (0.3 - 2.5)
   - Adjusted based on win rate
   - Better performing methods get higher weights

2. **Confidence Threshold**
   - Minimum confidence for predictions
   - Adjusted based on correct prediction confidence

3. **Combination Method**
   - Currently: weighted average
   - Future: majority vote, ensemble methods

## Example Output

```
🚀 Starting 2024 Simulation and Tuning Process...
🎯 Target Win Rate: 90%
📊 Total Games: 288
🔄 Simulations per game: 500+

============================================================
ITERATION 1
============================================================

📅 Simulating Week 1 (16 games)...
  🎮 Kansas City Chiefs vs Buffalo Bills...
  🎮 Dallas Cowboys vs Philadelphia Eagles...
  ...
  Week 1 Win Rate: 65.00%

📅 Simulating Week 2 (16 games)...
  ...
  Week 2 Win Rate: 68.75%

...

📊 Overall Results:
   Correct: 187/288
   Win Rate: 64.93%
   Target: 90%
   Gap: 25.07%

🔧 Tuning engine parameters...
  statistical-model: 62.5% win rate, weight: 1.00 → 1.10
  elo-rating: 65.0% win rate, weight: 1.00 → 1.12
  ...
  Confidence threshold: 50.0%

============================================================
ITERATION 2
============================================================
...
```

## Monitoring Progress

### Check Current Iteration
```bash
ls data/simulations/
```

### View Latest Results
```bash
cat data/simulations/iteration-{N}.json
```

### Check Best Parameters
```bash
cat data/tuned-parameters/2024-tuned-parameters.json
```

## Customization

### Change Target Win Rate
Edit `scripts/run-simulation.ts`:
```typescript
await simulator.runSimulations(95); // 95% instead of 90%
```

### Change Simulations per Game
Edit `scripts/simulate-2024.ts`:
```typescript
const result = await this.simulateGame(game, 1000); // 1000 instead of 500
```

### Change Max Iterations
Edit `scripts/simulate-2024.ts`:
```typescript
const maxIterations = 100; // 100 instead of 50
```

## Troubleshooting

### "No data found"
- System will generate sample 2024 NFL data
- Or provide your own data file at `data/2024-games.json`

### "Simulation taking too long"
- Reduce simulations per game (default: 500)
- Reduce number of games
- Run on faster machine

### "Win rate not improving"
- Check if data quality is good
- Verify method weights are adjusting
- May need more iterations or different tuning strategy

## Best Practices

1. **Use Real Data**: Real 2024 game data produces better results
2. **Monitor Progress**: Check iteration files regularly
3. **Save Best Parameters**: Use best parameters in production
4. **Validate Results**: Test tuned parameters on new data
5. **Iterate**: Run multiple times to find optimal parameters

## Integration

After simulation completes:

1. **Load Tuned Parameters**:
```typescript
import { predictionEngine } from './app/lib/prediction-engine';
import fs from 'fs';

const params = JSON.parse(fs.readFileSync('data/tuned-parameters/2024-tuned-parameters.json'));
predictionEngine.setMethodWeights(new Map(Object.entries(params.parameters.methodWeights)));
```

2. **Use in Production**:
The tuned parameters will improve prediction accuracy in production.

---

**Last Updated**: January 2025  
**Status**: Ready for Use

