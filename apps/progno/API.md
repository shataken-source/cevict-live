# PROGNO Historical Odds API

## Overview
Access historical sports odds data for backtesting, model development, and analysis. Perfect for sports bettors, quants, and algorithmic traders.

## Base URL
```
https://progno.app/api/historical-odds
```

## Authentication
All requests require an API key in the Authorization header:
```
Authorization: Bearer YOUR_API_KEY
```

## Pricing Tiers

| Tier | Price | Requests/Day | Max Date Range | Records/Limit |
|------|-------|--------------|----------------|---------------|
| **Hobby** | $29/mo | 100 | 30 days | 100 records |
| **Pro** | $99/mo | 1,000 | 90 days | 1,000 records |
| **Enterprise** | $299/mo | 10,000 | 365 days | Unlimited |

## Available Sports
- `nhl` - NHL Hockey
- `nba` - NBA Basketball
- `nfl` - NFL Football
- `mlb` - MLB Baseball
- `ncaab` - NCAA Basketball
- `ncaaf` - NCAA Football
- `nascar` - NASCAR Racing
- `college-baseball` - NCAA Baseball

## Endpoints

### GET /api/historical-odds
Retrieve historical odds data for a specific sport and date range.

#### Query Parameters
| Parameter | Required | Description |
|-----------|----------|-------------|
| `sport` | Yes | Sport code (nhl, nba, nfl, etc.) |
| `startDate` | Yes | Start date (YYYY-MM-DD) |
| `endDate` | Yes | End date (YYYY-MM-DD) |
| `format` | No | `json` (default) or `csv` |
| `includeLines` | No | Include all bookmaker lines (default: false) |

#### Example Request
```bash
curl -H "Authorization: Bearer YOUR_KEY" \
  "https://progno.app/api/historical-odds?sport=nba&startDate=2024-01-01&endDate=2024-01-31&format=json"
```

#### Example Response
```json
{
  "meta": {
    "sport": "nba",
    "dateRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "gamesReturned": 247,
    "tier": 2,
    "responseTimeMs": 145,
    "timestamp": "2024-02-15T12:00:00Z"
  },
  "data": [
    {
      "id": "uuid",
      "external_id": "game123",
      "sport": "nba",
      "home_team": "Lakers",
      "away_team": "Warriors",
      "commence_time": "2024-01-15T20:00:00Z",
      "game_date": "2024-01-15",
      "home_moneyline": -150,
      "away_moneyline": 130,
      "home_spread": -3.5,
      "away_spread": 3.5,
      "spread_line": -3.5,
      "total_line": 225.5,
      "source": "api-sports"
    }
  ]
}
```

### OPTIONS /api/historical-odds
Get available sports and data statistics.

#### Example Response
```json
{
  "tier": 2,
  "sports": [
    {
      "sport": "nba",
      "firstDate": "2024-01-01",
      "lastDate": "2024-02-15",
      "totalGames": 1250
    }
  ],
  "totalGames": 8900
}
```

## Data Fields

### Core Fields
| Field | Type | Description |
|-------|------|-------------|
| `external_id` | string | Original game ID from source |
| `sport` | string | Sport code |
| `home_team` | string | Home team name |
| `away_team` | string | Away team name |
| `commence_time` | string | Game start time (ISO 8601) |
| `game_date` | string | Game date (YYYY-MM-DD) |

### Odds Fields
| Field | Type | Description |
|-------|------|-------------|
| `home_moneyline` | number | Home team moneyline odds |
| `away_moneyline` | number | Away team moneyline odds |
| `home_spread` | number | Home team spread |
| `away_spread` | number | Away team spread |
| `spread_line` | number | Spread line |
| `total_line` | number | Over/under total |

## Use Cases

### Backtesting Models
```python
import requests

api_key = "YOUR_KEY"
headers = {"Authorization": f"Bearer {api_key}"}

# Get NBA odds for last month
params = {
    "sport": "nba",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
}

response = requests.get(
    "https://progno.app/api/historical-odds",
    headers=headers,
    params=params
)

data = response.json()
for game in data["data"]:
    # Test your model predictions
    prediction = my_model.predict(game)
    actual_result = get_result(game["external_id"])
    log_accuracy(prediction, actual_result)
```

### Line Movement Analysis
```javascript
const response = await fetch(
  'https://progno.app/api/historical-odds?sport=nfl&startDate=2024-01-01&endDate=2024-01-07',
  { headers: { 'Authorization': 'Bearer YOUR_KEY' } }
);

const data = await response.json();

// Analyze line movements
const lineMovements = data.data.map(game => ({
  gameId: game.external_id,
  openLine: game.home_spread,
  closeLine: game.home_spread, // Would need multiple snapshots
  total: game.total_line
}));
```

### CSV Export for Excel/R
```bash
curl -H "Authorization: Bearer YOUR_KEY" \
  "https://progno.app/api/historical-odds?sport=nhl&startDate=2024-01-01&endDate=2024-01-31&format=csv" \
  > nhl_odds_jan2024.csv
```

## Rate Limiting
- Headers show current usage: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- Exceeding limits returns HTTP 429 (Too Many Requests)
- Upgrade tier to increase limits

## Error Codes
| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid API key |
| 403 | Forbidden - Tier doesn't allow this request |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Support
Email: api@progno.app
Docs: https://progno.app/api-docs
