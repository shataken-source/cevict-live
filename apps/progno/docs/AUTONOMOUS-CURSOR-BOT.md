# 🤖 Autonomous Cursor Effect Bot

## Overview

A **fully autonomous, self-learning background bot** that implements all 7 Claude Effect dimensions and continuously improves its predictions through machine learning.

### Key Features

✅ **Fully Autonomous** - Runs silently in the background  
✅ **Self-Learning** - Generates and evolves its own prediction code  
✅ **All 7 Claude Effect Dimensions** - Implements complete framework  
✅ **Read-Only Predictions** - Training mode only, not used for actual betting  
✅ **Code Generation** - Creates and evolves prediction algorithms  
✅ **Performance Tracking** - Monitors accuracy and learning progress  
✅ **Dashboard** - View-only interface to monitor bot activity  

---

## Architecture

### Core Components

1. **AutonomousCursorBot** (`app/lib/autonomous-cursor-bot.ts`)
   - Main bot controller
   - Manages learning cycles
   - Handles state persistence
   - Coordinates all subsystems

2. **CodeGenerator**
   - Generates prediction code
   - Evolves based on performance
   - Implements all 7 Claude Effect dimensions
   - Saves code versions to `.progno/generated-code/`

3. **PredictionStore**
   - Stores read-only predictions
   - Tracks game results
   - Persists to `.progno/bot-predictions/`

4. **Claude Effect Integration**
   - Phase 1: Sentiment Field (SF)
   - Phase 2: Narrative Momentum (NM)
   - Phase 3: Information Asymmetry Index (IAI)
   - Phase 4: Chaos Sensitivity Index (CSI)
   - Phase 5: Network Influence Graph (NIG)
   - Phase 6: Temporal Relevance Decay (TRD)
   - Phase 7: Emergent Pattern Detection (EPD)

---

## How It Works

### Learning Cycle

1. **Fetch Games** - Gets all games from NFL, NBA, NHL, MLB, CFB, CBB
2. **Generate Predictions** - Uses current code version + Claude Effect
3. **Store Predictions** - Saves read-only predictions for tracking
4. **Learn from Results** - Updates weights when games complete
5. **Evolve Code** - Generates new code version if needed
6. **Track Performance** - Calculates accuracy and metrics

### Code Evolution

The bot generates new code versions when:
- Every 10 cycles (regular evolution)
- Accuracy drops significantly (need to adapt)
- Every 5 cycles (frequent evolution for faster learning)

Code is saved to `.progno/generated-code/v{version}.js`

### Learning from Claude Effect

The bot learns from each Claude Effect dimension:
- **SF (Sentiment Field)** - Emotional state impact
- **NM (Narrative Momentum)** - Story power impact
- **IAI (Information Asymmetry)** - Sharp money signals (1.5x weight)
- **CSI (Chaos Sensitivity)** - Reduces confidence when high
- **NIG (Network Influence)** - Team chemistry impact
- **EPD (Emergent Patterns)** - ML patterns (1.3x weight)

Learning data is stored in `.progno/claude-learning/`

---

## API Endpoints

### Control Bot

```bash
# Start bot (runs every 60 minutes)
POST /api/cursor-bot
{
  "action": "start",
  "intervalMinutes": 60
}

# Stop bot
POST /api/cursor-bot
{
  "action": "stop"
}

# Run single cycle manually
POST /api/cursor-bot
{
  "action": "run-cycle"
}
```

### View Bot Status (Read-Only)

```bash
# Get bot state
GET /api/cursor-bot?action=status

# Get recent predictions
GET /api/cursor-bot?action=predictions&limit=50

# Get performance history
GET /api/cursor-bot?action=performance&days=30
```

### Background Worker (for Cron)

```bash
# Run cycle (for cron jobs)
GET /api/cursor-bot/worker
Authorization: Bearer ${CRON_SECRET}
```

---

## Dashboard

**URL:** `/cursor-bot-dashboard`

### Features

- **Real-time Status** - See if bot is running
- **Performance Metrics** - Accuracy, cycles, predictions
- **Recent Predictions** - View all read-only predictions
- **Performance History** - Track accuracy over time
- **Code Versions** - See which code version is active
- **Auto-refresh** - Updates every 30 seconds

### Read-Only Access

All predictions are **READ-ONLY**:
- ✅ View predictions
- ✅ View performance
- ✅ View learning progress
- ❌ Cannot modify predictions
- ❌ Cannot use for betting
- ❌ Training mode only

---

## Cron Job Setup

### Vercel Cron Configuration

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cursor-bot/worker",
      "schedule": "0 */2 * * *"
    }
  ]
}
```

This runs the bot every 2 hours.

### Environment Variables

```bash
# Optional: Protect worker endpoint
CRON_SECRET=your-secret-here
```

---

## File Structure

```
.progno/
├── cursor-bot-state.json          # Bot state (running, cycles, accuracy)
├── cursor-state.json              # Cursor effect learning state
├── generated-code/                 # Auto-generated prediction code
│   ├── v1.0.0.js
│   ├── v1.10.0.js
│   └── ...
├── bot-predictions/                # Read-only predictions
│   ├── predictions.json
│   └── results.json
└── claude-learning/                # Claude Effect learning data
    ├── learn_1234567890.json
    └── ...
```

---

## Learning Process

### 1. Prediction Phase

For each game:
1. Get base prediction from cursor effect
2. Gather all Claude Effect data (7 dimensions)
3. Calculate full Claude Effect
4. Generate final prediction
5. Store as read-only prediction

### 2. Learning Phase

When game completes:
1. Compare prediction vs actual result
2. Update cursor effect weights
3. Learn from Claude Effect dimensions:
   - Which dimensions helped?
   - Which dimensions hurt?
   - Adjust dimension weights
4. Save learning data

### 3. Code Evolution Phase

Every 5-10 cycles:
1. Analyze performance trends
2. Generate new code version
3. Incorporate learned insights
4. Update active code version

---

## Performance Metrics

The bot tracks:

- **Total Cycles** - Number of learning cycles completed
- **Total Predictions** - Number of predictions made
- **Games Learned** - Number of games used for training
- **Current Accuracy** - Current win rate
- **Best Accuracy** - Best win rate achieved
- **Code Versions** - List of all generated code versions
- **Learning Rate** - Current learning rate (default: 0.05)

---

## Integration with Claude Effect

The bot fully implements the Claude Effect framework:

### Formula Applied

```
CLAUDE_EFFECT = (w₁ × SF) + (w₂ × NM) + (w₃ × IAI) + (w₅ × NIG) + (w₇ × EPD)

FINAL_PROBABILITY = BASE_PROBABILITY × (1 + CLAUDE_EFFECT) × TRD
FINAL_CONFIDENCE = BASE_CONFIDENCE × (1 - CSI) × (1 + |IAI|)
```

### Weights Used

```typescript
const WEIGHTS = {
  sentimentField: 0.15,        // 15%
  narrativeMomentum: 0.12,     // 12%
  informationAsymmetry: 0.20,  // 20% (highest!)
  networkInfluence: 0.13,      // 13%
  emergentPattern: 0.20        // 20% (highest!)
}
```

---

## Usage Examples

### Start Bot Manually

```typescript
import { getAutonomousBot } from './app/lib/autonomous-cursor-bot';

const bot = getAutonomousBot();
await bot.start(60); // Run every 60 minutes
```

### View Bot Status

```typescript
const bot = getAutonomousBot();
const state = bot.getState();

console.log(`Running: ${state.isRunning}`);
console.log(`Accuracy: ${(state.currentAccuracy * 100).toFixed(1)}%`);
console.log(`Total Predictions: ${state.totalPredictions}`);
```

### Get Predictions

```typescript
const bot = getAutonomousBot();
const predictions = await bot.getPredictions(20); // Last 20 predictions

predictions.forEach(pred => {
  console.log(`${pred.homeTeam} vs ${pred.awayTeam}`);
  console.log(`Pick: ${pred.predictedWinner}`);
  console.log(`Confidence: ${(pred.confidence * 100).toFixed(1)}%`);
  console.log(`Claude Effect: ${pred.claudeEffect?.totalEffect || 0}`);
});
```

---

## Monitoring

### Check Bot Status

```bash
# Via API
curl http://localhost:3008/api/cursor-bot?action=status

# Via Dashboard
open http://localhost:3008/cursor-bot-dashboard
```

### View State File

```bash
cat .progno/cursor-bot-state.json
```

### View Generated Code

```bash
ls .progno/generated-code/
cat .progno/generated-code/v1.0.0.js
```

---

## Improvements Added

### Enhanced Features

1. **Full Claude Effect Integration**
   - All 7 dimensions implemented
   - Weighted combination
   - Dimension-specific learning

2. **Advanced Code Generation**
   - Evolves based on performance
   - Incorporates Claude Effect insights
   - Version tracking

3. **Enhanced Learning**
   - Learns from Claude Effect dimensions
   - Tracks dimension performance
   - Adjusts weights dynamically

4. **Comprehensive Dashboard**
   - Real-time status
   - Performance metrics
   - Prediction history
   - Code version tracking

5. **Background Worker**
   - Cron job support
   - Automatic cycles
   - Error handling

---

## Next Steps

1. ✅ Bot created and integrated
2. ✅ All 7 Claude Effect dimensions implemented
3. ✅ Code generation working
4. ✅ Learning from Claude Effect
5. ✅ Dashboard created
6. ⏭️ Deploy and start bot
7. ⏭️ Monitor performance
8. ⏭️ Let it learn and evolve!

---

## 🚀 Ready to Deploy!

The autonomous Cursor Effect bot is fully implemented and ready to run. It will:

- Work silently in the background
- Fetch odds automatically
- Generate predictions using all 7 Claude Effect dimensions
- Learn from results continuously
- Evolve its code over time
- Track performance and accuracy

**All predictions are READ-ONLY and used only for training!**

