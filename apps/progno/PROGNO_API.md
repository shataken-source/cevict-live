# Progno Public API Documentation

## Overview

The Progno Public API provides programmatic access to our sports betting predictions, arbitrage opportunities, and advanced analytics. Perfect for prediction services, betting platforms, and analytics tools.

## Base URL

```
https://your-domain.com/api/progno/public
```

## Authentication

All API requests require an API key passed via:
- Header: `Authorization: Bearer YOUR_API_KEY`
- Query parameter: `?api_key=YOUR_API_KEY`

## Pricing Tiers

### Starter - $49/month
- 1,000 requests/month
- All sports included
- Basic predictions only
- 12-hour delay on Elite picks
- Email support

### Professional - $149/month
- 5,000 requests/month
- All sports + arbitrage alerts
- Real-time predictions
- Line movement alerts
- Webhook notifications
- Priority support

### Enterprise - $499/month
- Unlimited requests
- All features + custom models
- Historical data access
- White-label options
- Dedicated support
- SLA guarantee

## Endpoints

### GET /predictions

Retrieve all predictions for a specific date.

**Parameters:**
- `date` (optional): YYYY-MM-DD format. Defaults to today.
- `sport` (optional): Filter by sport (nfl, nba, nhl, mlb)
- `tier` (optional): Filter by tier (elite, pro, free)

**Response:**
```json
{
  "success": true,
  "date": "2026-02-13",
  "picks": [
    {
      "id": "pick-123",
      "sport": "NFL",
      "game": "Chiefs vs 49ers",
      "pick": "Chiefs",
      "confidence": 87,
      "tier": "elite",
      "odds": { "american": -110, "decimal": 1.91 },
      "edge": 5.2,
      "analysis": "Monte Carlo: 62% win probability. Weather: Clear, 45°F. Stadium: Neutral site."
    }
  ],
  "arbitrage": [...],
  "earlyBets": [...],
  "parlays": [...],
  "analytics": {
    "totalPicks": 12,
    "avgConfidence": 72.5,
    "tierBreakdown": { "elite": 3, "pro": 5, "free": 4 }
  }
}
```

### GET /historical

Get historical prediction performance.

**Parameters:**
- `days` (optional): Number of days to analyze (default: 30)

**Response:**
```json
{
  "success": true,
  "period": "30 days",
  "performance": {
    "totalPicks": 150,
    "winRate": 58.5,
    "roi": 12.3,
    "bySport": {
      "nfl": { "picks": 50, "winRate": 60, "roi": 15 },
      "nba": { "picks": 60, "winRate": 57, "roi": 10 },
      "nhl": { "picks": 40, "winRate": 59, "roi": 12 }
    },
    "byTier": {
      "elite": { "picks": 30, "winRate": 68, "roi": 22 },
      "pro": { "picks": 70, "winRate": 58, "roi": 12 },
      "free": { "picks": 50, "winRate": 52, "roi": 5 }
    }
  }
}
```

### POST /webhook

Register a webhook for real-time alerts.

**Body:**
```json
{
  "url": "https://your-domain.com/webhook",
  "events": ["arbitrage", "steam_move", "line_movement"]
}
```

**Response:**
```json
{
  "success": true,
  "webhookId": "wh-123456",
  "url": "https://your-domain.com/webhook",
  "events": ["arbitrage", "steam_move", "line_movement"]
}
```

## Webhook Events

### Arbitrage Alert
```json
{
  "type": "arbitrage",
  "timestamp": "2026-02-13T18:30:00Z",
  "data": {
    "gameId": "nfl-12345",
    "sport": "NFL",
    "profitPercent": 2.5,
    "books": ["Pinnacle", "DraftKings"]
  }
}
```

### Line Movement Alert
```json
{
  "type": "line_movement",
  "timestamp": "2026-02-13T19:15:00Z",
  "data": {
    "gameId": "nfl-12345",
    "market": "spread",
    "oldLine": -3,
    "newLine": -5,
    "movement": -2
  }
}
```

## Rate Limits

- Starter: 100 requests/hour
- Professional: 300 requests/hour
- Enterprise: Unlimited

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Error Codes

- `401`: Invalid API key
- `429`: Rate limit exceeded
- `404`: Prediction not found
- `500`: Internal server error

## SDKs & Libraries

### JavaScript/TypeScript
```bash
npm install progno-api
```

```javascript
import { PrognoAPI } from 'progno-api';

const client = new PrognoAPI('YOUR_API_KEY');

// Get today's picks
const picks = await client.getPredictions({ date: '2026-02-13' });

// Get historical performance
const history = await client.getHistorical({ days: 30 });
```

### Python
```bash
pip install progno-api
```

```python
from progno_api import PrognoClient

client = PrognoClient('YOUR_API_KEY')

# Get predictions
picks = client.get_predictions(date='2026-02-13')
```

## Support

- Email: api-support@progno.com
- Slack: [Join our developer community](https://progno.com/slack)
- Documentation: https://docs.progno.com

## Terms of Use

1. API data is for informational purposes only
2. No resale of raw predictions without attribution
3. Rate limits must be respected
4. Webhook endpoints must respond within 5 seconds
5. SLA guarantees apply to Enterprise tier only
