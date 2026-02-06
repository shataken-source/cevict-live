# Sports Probability Picks System for Kalshi & Polymarket

## Overview

This system provides sports probability picks for both Kalshi and Polymarket prediction markets, with a focus on:
- **Sports events only** (NFL, NBA, MLB, NHL, Soccer)
- **Probability calculations** using the existing progno prediction engine
- **Cross-platform arbitrage detection** between Kalshi and Polymarket
- **Market maker analysis** and liquidity assessment

## Architecture

### Core Components

1. **Market Clients** (`lib/markets/`)
   - `kalshi-client.ts` - Fetches markets from Kalshi API
   - `polymarket-client.ts` - Fetches markets from Polymarket GraphQL API

2. **Probability Engine** (`lib/markets/sports-probability-engine.ts`)
   - Uses existing `PredictionEngine` from progno
   - Calculates probabilities for sports markets
   - Determines edge and recommendations

3. **Arbitrage Detector** (`lib/markets/arbitrage-detector.ts`)
   - Finds price discrepancies between platforms
   - Accounts for fees and regulatory differences
   - Calculates optimal stake sizes

4. **Market Maker Analysis** (`app/api/markets/market-makers/route.ts`)
   - Analyzes liquidity and market maker activity
   - Provides trading recommendations

## API Endpoints

### 1. Kalshi Sports Picks
```
GET /api/markets/kalshi/sports
```

**Query Parameters:**
- `limit` (default: 20) - Number of picks to return
- `minEdge` (default: 0.05) - Minimum edge required (0-1)
- `minConfidence` (default: 60) - Minimum confidence % required

**Response:**
```json
{
  "success": true,
  "platform": "kalshi",
  "count": 10,
  "picks": [
    {
      "marketId": "TICKER-123",
      "platform": "kalshi",
      "question": "Will the Warriors win?",
      "ourProbability": 0.65,
      "marketProbability": 0.55,
      "edge": 0.10,
      "confidence": 0.72,
      "recommendation": "YES",
      "reasoning": ["Predicted winner: Warriors", "Confidence: 72%", "Value detected: Market is underpricing by 10%"],
      "riskLevel": "medium",
      "optimalStake": 0.025,
      "kalshiTicker": "TICKER-123",
      "kalshiUrl": "https://kalshi.com/trade/TICKER-123"
    }
  ]
}
```

### 2. Polymarket Sports Picks
```
GET /api/markets/polymarket/sports
```

**Query Parameters:** Same as Kalshi endpoint

**Response:** Similar format, with `polymarketConditionId` and `polymarketUrl`

### 3. Cross-Platform Arbitrage
```
GET /api/markets/arbitrage
```

**Query Parameters:**
- `limit` (default: 20) - Number of opportunities to return
- `minProfit` (default: 0.01) - Minimum profit % required (0-1)
- `maxRisk` (optional) - Filter by risk level: `low`, `medium`, `high`

**Response:**
```json
{
  "success": true,
  "count": 5,
  "opportunities": [
    {
      "marketId": "TICKER-123-CONDITION-456",
      "question": "Will the Warriors win?",
      "kalshiMarket": {
        "ticker": "TICKER-123",
        "yesPrice": 0.55,
        "noPrice": 0.45,
        "spread": 2,
        "liquidity": "high"
      },
      "polymarketMarket": {
        "conditionId": "CONDITION-456",
        "yesPrice": 0.50,
        "noPrice": 0.50,
        "spread": 0.02,
        "liquidity": "high"
      },
      "arbitrageType": "yes_arbitrage",
      "profit": 0.03,
      "risk": "low",
      "fees": {
        "kalshi": 0.10,
        "polymarket": 0.02,
        "total": 0.12
      },
      "minStake": 100,
      "maxStake": 5000,
      "executionComplexity": "simple"
    }
  ]
}
```

### 4. Market Maker Analysis
```
GET /api/markets/market-makers
```

**Query Parameters:**
- `platform` (optional) - Filter by platform: `kalshi`, `polymarket`
- `marketId` (optional) - Analyze specific market
- `limit` (default: 10) - Number of markets to analyze

**Response:**
```json
{
  "success": true,
  "count": 10,
  "analyses": [
    {
      "platform": "kalshi",
      "marketId": "TICKER-123",
      "question": "Will the Warriors win?",
      "liquidity": {
        "level": "high",
        "volume": 50000,
        "openInterest": 100000,
        "spread": 1.5
      },
      "marketMakerActivity": {
        "detected": true,
        "confidence": "high",
        "indicators": ["Tight bid-ask spread", "High trading volume", "Deep order book"]
      },
      "orderBookDepth": {
        "levels": 15,
        "totalSize": 50000,
        "imbalance": 0.1
      },
      "tradingRecommendation": {
        "action": "trade",
        "reason": "High liquidity and tight spread - good execution conditions",
        "optimalEntry": "limit",
        "suggestedLimitPrice": 55
      }
    }
  ]
}
```

## Key Differences: Kalshi vs Polymarket

### Kalshi
- **Regulation:** Federally regulated by CFTC
- **Access:** Available to U.S. users (with state restrictions)
- **Funding:** U.S. dollars (ACH, wire, debit)
- **Market Makers:** Formal Market Maker Program with institutional support
- **Fees:** ~10 cents per contract (varies by volume)
- **Liquidity:** Centralized, professional market makers provide depth

### Polymarket
- **Regulation:** Decentralized, blockchain-based
- **Access:** Limited for U.S. users (invite-only as of Jan 2026)
- **Funding:** Cryptocurrency (USDC stablecoin)
- **Market Makers:** Decentralized, peer-to-peer liquidity
- **Fees:** ~2% trading fee
- **Liquidity:** Variable, depends on individual traders and bots

## Usage Examples

### Get Kalshi Sports Picks
```powershell
# PowerShell
Invoke-RestMethod -Uri 'http://localhost:3008/api/markets/kalshi/sports?limit=10&minEdge=0.05&minConfidence=60' | ConvertTo-Json -Depth 5

# Bash/curl
curl "http://localhost:3008/api/markets/kalshi/sports?limit=10&minEdge=0.05&minConfidence=60"
```

### Get Polymarket Sports Picks
```powershell
# PowerShell
Invoke-RestMethod -Uri 'http://localhost:3008/api/markets/polymarket/sports?limit=10&minEdge=0.05&minConfidence=60' | ConvertTo-Json -Depth 5

# Bash/curl
curl "http://localhost:3008/api/markets/polymarket/sports?limit=10&minEdge=0.05&minConfidence=60"
```

### Find Arbitrage Opportunities
```powershell
# PowerShell
Invoke-RestMethod -Uri 'http://localhost:3008/api/markets/arbitrage?limit=10&minProfit=0.02&maxRisk=low' | ConvertTo-Json -Depth 5

# Bash/curl
curl "http://localhost:3008/api/markets/arbitrage?limit=10&minProfit=0.02&maxRisk=low"
```

### Analyze Market Makers
```powershell
# PowerShell
Invoke-RestMethod -Uri 'http://localhost:3008/api/markets/market-makers?platform=kalshi&limit=10' | ConvertTo-Json -Depth 5

# Bash/curl
curl "http://localhost:3008/api/markets/market-makers?platform=kalshi&limit=10"
```

**Note:** Progno runs on port **3008**, not 3000.

## Environment Variables

### Kalshi
```env
KALSHI_API_KEY_ID=your_key_id
KALSHI_PRIVATE_KEY=your_private_key
KALSHI_API_URL=https://api.cash.kalshi.com/trade-api/v2
```

### Polymarket
```env
POLYMARKET_GRAPHQL_URL=https://api.thegraph.com/subgraphs/name/polymarket
POLYMARKET_API_KEY=your_api_key (optional, for rate limits)
```

## Implementation Notes

1. **Probability Calculation:** Uses existing `PredictionEngine` from progno, which analyzes:
   - Team statistics
   - Historical performance
   - Situational factors
   - Market sentiment

2. **Edge Detection:** Compares our calculated probability vs. market price to find value

3. **Arbitrage:** Finds opportunities where buying YES on one platform + NO on other < $1 (after fees)

4. **Market Maker Detection:** Analyzes:
   - Bid-ask spreads
   - Order book depth
   - Trading volume
   - Price consistency

5. **Risk Management:** 
   - Kelly criterion for optimal stake sizing
   - Risk level assessment (low/medium/high)
   - Liquidity checks before trading

## Future Enhancements

- [ ] Real-time market monitoring
- [ ] Automated trade execution (with proper risk controls)
- [ ] Historical performance tracking
- [ ] Machine learning model improvements
- [ ] Integration with more prediction markets
- [ ] Portfolio optimization across markets

## Regulatory Compliance

⚠️ **Important Notes:**

1. **Kalshi:** Fully regulated, available to U.S. users. Provides tax forms (1099-MISC) for winnings > $600.

2. **Polymarket:** U.S. access is currently limited. Users are responsible for tracking transactions for tax purposes.

3. **Arbitrage:** Requires access to both platforms, which may be restricted for U.S. users on Polymarket.

4. **State Restrictions:** Some states have restrictions on prediction markets. Check local regulations before trading.
