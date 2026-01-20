# Kalshi Integration for Bot Training

## Overview

Kalshi prediction markets have been integrated into Bot Academy for training bots in Progno. Bots can now use real-time prediction market data to improve their predictions and learn from market probabilities.

## What is Kalshi?

Kalshi is a prediction market platform where people trade on real-world events. Market prices reflect collective wisdom about event probabilities, making them valuable training data for prediction bots.

## Bot Academy Integration

### New Training Task Added

**Task ID:** `learn-kalshi-integration`
**Difficulty:** Intermediate
**Status:** Pending

This task teaches bots to:
1. Understand Kalshi API integration
2. Extract probabilities from markets
3. Use market data for training
4. Match predictions to relevant markets

### Training API Endpoint

**Location:** `/api/bot/kalshi-training`

**Actions:**
- `search` - Search Kalshi markets by query
- `match` - Find best matching market for a prediction
- `trending` - Get trending markets
- `train` - Get comprehensive training data

## Usage Examples

### 1. Search Markets
```bash
GET /api/bot/kalshi-training?action=search&query=recession&limit=10
```

Returns markets matching "recession" with probabilities and volumes.

### 2. Find Best Match
```bash
GET /api/bot/kalshi-training?action=match&query=Will the US enter a recession in 2024?
```

Returns the best matching Kalshi market with relevance score.

### 3. Get Training Data
```bash
GET /api/bot/kalshi-training?action=train&query=economic prediction
```

Returns comprehensive training data including:
- Best matching market
- Related markets
- Market probabilities
- Training insights
- Usage recommendations

### 4. POST Training Request
```bash
POST /api/bot/kalshi-training
{
  "query": "Will Bitcoin reach $100k in 2024?",
  "trainingType": "standard"
}
```

Returns full training dataset with guidance.

## How Bots Should Use Kalshi Data

### Step 1: Find Relevant Market
When a bot needs to make a prediction, it should first search for a matching Kalshi market.

### Step 2: Compare Probabilities
Compare the bot's prediction with the market probability. If they differ significantly, investigate why.

### Step 3: Adjust Confidence
Use market volume to assess reliability:
- High volume (>50k) = Strong signal
- Medium volume (10k-50k) = Moderate signal
- Low volume (<10k) = Weak signal

### Step 4: Combine Sources
Don't rely solely on Kalshi. Combine market data with:
- Statistical models
- Historical data
- Expert analysis
- Your own algorithms

## Training Workflow

1. **Receive Prediction Request**
   - Bot gets a question to predict

2. **Search Kalshi Markets**
   - Use `/api/bot/kalshi-training?action=match`
   - Find best matching market

3. **Extract Market Probability**
   - Get probability from market prices
   - Assess market reliability (volume)

4. **Make Prediction**
   - Use your own methods
   - Compare with market probability

5. **Calibrate Confidence**
   - If market probability differs, investigate
   - Adjust confidence based on market data

6. **Learn from Outcomes**
   - Track prediction accuracy
   - Compare with market outcomes
   - Improve over time

## Benefits for Bot Training

1. **Real-Time Market Data**
   - Access to thousands of active markets
   - Probabilities updated in real-time

2. **Collective Wisdom**
   - Market prices reflect many traders' opinions
   - Often more accurate than individual predictions

3. **Validation Tool**
   - Compare predictions with market consensus
   - Identify when your model differs significantly

4. **Confidence Calibration**
   - Use market volume to assess reliability
   - Adjust confidence scores accordingly

5. **Broad Coverage**
   - Markets cover sports, economics, politics, tech, health, climate
   - Training data for many prediction types

## Environment Variables

Required for Kalshi API access:
```env
KALSHI_API_KEY_ID=your_key_id
KALSHI_PRIVATE_KEY=your_private_key
```

**Note:** The system falls back to mock data if API keys are not configured.

## Integration Points

### Prediction Engine
- Kalshi data can enhance `prediction-engine.ts`
- Add market probability as a factor
- Use market data to validate predictions

### Bot Learning System
- Bots can query Kalshi during training
- Use market outcomes to learn
- Compare predictions with market results

### "Predict Anything" Feature
- Already uses Kalshi for general predictions
- Can be extended for bot training

## Next Steps

1. **Complete Training Task**
   - Bots should complete `learn-kalshi-integration` task
   - Practice using the API endpoints

2. **Integrate into Predictions**
   - Add Kalshi data to prediction pipeline
   - Use market probabilities in confidence calculations

3. **Track Performance**
   - Compare bot predictions with market outcomes
   - Measure improvement over time

4. **Expand Coverage**
   - Add more market categories
   - Create specialized training for different prediction types

## Resources

- **Kalshi API Docs:** https://docs.kalshi.com
- **Kalshi Fetcher:** `apps/progno/app/kalshi-fetcher.ts`
- **Training API:** `apps/progno/app/api/bot/kalshi-training/route.ts`
- **Bot Academy:** `apps/progno/app/bot-academy-fishy-curriculum.ts`

---

**Kalshi integration is now available for bot training!** 🤖📊

