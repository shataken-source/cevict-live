# Kalshi Integration for Progno "Predict Anything"

## Overview

Kalshi is a prediction market platform where people can trade on real-world events across multiple categories:
- **Politics**: Elections, policy decisions, political outcomes
- **Sports**: Game results, championships, player performance
- **Economics**: Recession predictions, inflation, GDP, interest rates
- **Technology**: AI breakthroughs, tech stock performance, IPO outcomes
- **Climate**: Temperature records, weather events, climate milestones
- **Health**: Vaccine approvals, disease outbreaks, medical breakthroughs
- **Culture**: Entertainment awards, celebrity events, cultural milestones
- **Crypto**: Bitcoin prices, cryptocurrency adoption
- **World**: International events, global politics

## Why Kalshi is Perfect for Progno

1. **Real-Time Market Probabilities**: Kalshi provides actual market-based probabilities (0-100%) for thousands of events
2. **Broad Coverage**: Covers topics beyond sports that Progno's "Predict Anything" feature needs
3. **High-Quality Data**: Market prices reflect collective wisdom of thousands of traders
4. **Live Updates**: Markets update in real-time as new information emerges
5. **API Access**: Full API available for programmatic access

## Integration Status

✅ **Created**: `apps/progno/app/kalshi-fetcher.ts`
- Market search functionality
- Probability calculation from market prices
- Best match finding for questions
- Category support

✅ **Integrated**: `apps/progno/app/anything-predictor.ts`
- Checks Kalshi markets before generating predictions
- Uses Kalshi probabilities to enhance confidence scores
- Includes Kalshi data in reasoning and data points
- Falls back gracefully if Kalshi unavailable

## Current Implementation (Mock Data)

The current implementation uses **mock data** to demonstrate the integration. To use real Kalshi data:

### Step 1: Get Kalshi API Access

1. Sign up at [kalshi.com](https://kalshi.com)
2. Generate API credentials:
   - Go to Settings → API
   - Create a 2048-bit RSA key pair
   - Register your public key with Kalshi
   - Save your API credentials

### Step 2: Install Kalshi Python Client

```bash
cd apps/progno
pip install kalshi-python
```

Or use the TypeScript/Node.js API directly:
- API Documentation: https://docs.kalshi.com
- Base URL: `https://trading-api.kalshi.com/trade-api/v2`

### Step 3: Update `kalshi-fetcher.ts`

Replace the mock `searchKalshiMarkets` function with actual API calls:

```typescript
import { KalshiClient } from 'kalshi-python'; // or use fetch/axios

export async function searchKalshiMarkets(query: string, limit: number = 10): Promise<KalshiSearchResult> {
  const client = new KalshiClient({
    apiKey: process.env.KALSHI_API_KEY,
    apiSecret: process.env.KALSHI_API_SECRET
  });

  const response = await client.markets.search({
    query,
    limit,
    status: 'open' // or 'all'
  });

  return {
    markets: response.markets.map(m => ({
      ticker: m.ticker,
      title: m.title,
      category: m.category,
      yesBid: m.yes_bid,
      yesAsk: m.yes_ask,
      noBid: m.no_bid,
      noAsk: m.no_ask,
      lastPrice: m.last_price,
      volume: m.volume,
      openTime: m.open_time,
      closeTime: m.close_time,
      status: m.status
    })),
    total: response.total,
    query
  };
}
```

### Step 4: Add Environment Variables

Add to `.env.local` or Vercel environment variables:

```bash
KALSHI_API_KEY=your_api_key_here
KALSHI_API_SECRET=your_api_secret_here
```

## How It Works

1. **User asks a question** in "Predict Anything"
2. **Progno analyzes** the question type (politics, sports, economics, etc.)
3. **Kalshi search** finds relevant prediction markets
4. **Best match** is selected based on relevance and volume
5. **Market probability** is extracted (e.g., 65% = market thinks outcome is likely)
6. **Progno prediction** is enhanced with:
   - Kalshi probability as confidence score
   - Market data in reasoning
   - Market title and volume in data points

## Example Flow

**Question**: "Will the US enter a recession in 2024?"

1. Kalshi finds market: `ECON-RECESSION-2024`
2. Market shows: 36% probability (YES bid: 35-37, NO bid: 63-65)
3. Progno prediction: "Based on real-time prediction market data, this outcome is unlikely (36% probability)"
4. Confidence: 85% (high market volume = high confidence)
5. Reasoning: "Real-time prediction market data from Kalshi shows 36% probability. Market volume: 156,000, status: open"

## Benefits

- **Real-world probabilities**: Not just AI guesses, but actual market consensus
- **Broad coverage**: Works for politics, economics, tech, climate - not just sports
- **High confidence**: Market data provides more reliable confidence scores
- **Live updates**: Predictions improve as markets update with new information
- **Transparency**: Users can see the actual market data behind predictions

## Next Steps

1. ✅ Integration code complete
2. ⏳ Get Kalshi API credentials
3. ⏳ Replace mock data with real API calls
4. ⏳ Test with various question types
5. ⏳ Add caching for frequently asked questions
6. ⏳ Add UI to show Kalshi market links

## Resources

- [Kalshi Website](https://kalshi.com)
- [Kalshi API Documentation](https://docs.kalshi.com)
- [Kalshi Python Client](https://pypi.org/project/kalshi-python/)
- [Kalshi Go Client](https://github.com/ammario/kalshi)

