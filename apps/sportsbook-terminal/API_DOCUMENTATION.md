# Sportsbook Terminal API Documentation

## Overview

The Sportsbook Terminal provides a REST API for accessing sports betting predictions, markets, and historical data. This API can be used by external applications to consume prediction data for their own purposes.

**Base URL:** `http://localhost:3433/api`

**Current Version:** 1.0.0

---

## Quick Start

### Test the API is running:
```bash
curl http://localhost:3433/api/health
```

### Get API documentation:
```bash
curl http://localhost:3433/api
```

---

## Public Data Endpoints (v1)

### GET /api/v1/predictions

Get all current predictions with associated market data.

**Example Response:**
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "id": "uuid",
      "market_id": "uuid",
      "model_version": "v1",
      "model_probability": 0.65,
      "confidence": 75.5,
      "edge": 0.08,
      "expected_value": 12.5,
      "is_premium": true,
      "created_at": "2026-02-19T05:47:35Z",
      "markets": {
        "id": "uuid",
        "sport": "NBA",
        "league": "NBA",
        "home_team": "Lakers",
        "away_team": "Warriors",
        "american_odds": -110,
        "event_date": "2026-02-19T20:00:00Z"
      }
    }
  ],
  "timestamp": "2026-02-19T06:00:00Z"
}
```

**Use Cases:**
- Display current predictions on external dashboards
- Build betting recommendation engines
- Feed data into analytics pipelines

---

### GET /api/v1/markets

Get all active markets with their associated predictions.

**Example Response:**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "id": "uuid",
      "external_id": "NBA-Lakers-Warriors-2026-02-19",
      "sport": "NBA",
      "league": "NBA",
      "home_team": "Lakers",
      "away_team": "Warriors",
      "event_date": "2026-02-19T20:00:00Z",
      "american_odds": -110,
      "status": "open",
      "predictions": [
        {
          "id": "uuid",
          "model_probability": 0.65,
          "confidence": 75.5,
          "edge": 0.08,
          "is_premium": true
        }
      ]
    }
  ],
  "timestamp": "2026-02-19T06:00:00Z"
}
```

**Use Cases:**
- Market tracking applications
- Odds comparison tools
- Event listing platforms

---

### GET /api/v1/signals

Get active trading signals with full prediction and market context.

**Example Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "uuid",
      "signal_type": "single",
      "strength": "strong",
      "recommended_stake": 100.00,
      "kelly_fraction": 0.25,
      "status": "active",
      "predictions": {
        "model_probability": 0.72,
        "confidence": 82.0,
        "markets": {
          "sport": "NBA",
          "home_team": "Lakers",
          "away_team": "Warriors"
        }
      }
    }
  ],
  "timestamp": "2026-02-19T06:00:00Z"
}
```

**Use Cases:**
- Automated trading systems
- Alert services
- Portfolio management tools

---

### GET /api/v1/stats

Get system statistics including database counts and archive status.

**Example Response:**
```json
{
  "success": true,
  "stats": {
    "database": {
      "markets": 150,
      "predictions": 500,
      "signals": 25
    },
    "archive": {
      "predictions": 32,
      "results": 17,
      "total": 49
    }
  },
  "timestamp": "2026-02-19T06:00:00Z"
}
```

**Use Cases:**
- System health monitoring
- Data pipeline checks
- Capacity planning

---

### GET /api/v1/archive/predictions

List archived prediction files with metadata.

**Example Response:**
```json
{
  "success": true,
  "count": 32,
  "files": [
    {
      "filename": "2026-02-19T05-47-35-380Z_predictions-2026-02-18.json",
      "size": 15420,
      "modified": "2026-02-19T05:47:35.380Z"
    }
  ],
  "archiveLocation": "C:\\cevict-archive\\Probabilityanalyzer\\predictions",
  "timestamp": "2026-02-19T06:00:00Z"
}
```

**Use Cases:**
- Historical data access
- Backup verification
- Data retention compliance

---

### GET /api/v1/archive/results

List archived results files with metadata.

**Example Response:**
```json
{
  "success": true,
  "count": 17,
  "files": [
    {
      "filename": "2026-02-19T05-47-46-987Z_results-2026-02-07.json",
      "size": 8450,
      "modified": "2026-02-19T05:47:46.987Z"
    }
  ],
  "archiveLocation": "C:\\cevict-archive\\Probabilityanalyzer\\results",
  "timestamp": "2026-02-19T06:00:00Z"
}
```

---

## Admin Endpoints

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-19T06:00:00Z"
}
```

---

### POST /api/run-scheduler

Run the scheduler to process pending prediction and results files.

**Note:** This is an async operation that processes files from `apps/progno` and archives them.

---

### POST /api/archive

Manually trigger file archiving.

---

### POST /api/export-picks

Export picks from the frontend to Supabase (bypasses RLS).

**Request Body:**
```json
{
  "picks": [
    {
      "sport": "NBA",
      "league": "NBA",
      "home_team": "Lakers",
      "away_team": "Warriors",
      "pick": "Lakers",
      "pick_type": "moneyline",
      "odds": -110,
      "confidence": 75.5,
      "expected_value": 12.5
    }
  ]
}
```

---

## Integration Examples

### Python
```python
import requests

# Get latest predictions
response = requests.get('http://localhost:3433/api/v1/predictions')
data = response.json()

for pred in data['data']:
    market = pred['markets']
    print(f"{market['home_team']} vs {market['away_team']}: {pred['confidence']}% confidence")
```

### JavaScript/Node.js
```javascript
const response = await fetch('http://localhost:3433/api/v1/markets');
const data = await response.json();

const openMarkets = data.data.filter(m => m.status === 'open');
console.log(`Found ${openMarkets.length} open markets`);
```

### cURL
```bash
# Get all signals
curl -s http://localhost:3433/api/v1/signals | jq '.data[] | {sport: .predictions.markets.sport, strength: .strength}'

# Get system stats
curl -s http://localhost:3433/api/v1/stats | jq '.stats.database'
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2026-02-19T06:00:00Z"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `500` - Server error (check server logs)
- `400` - Bad request (invalid parameters)

---

## Configuration

The API requires environment variables to be set in `.env.local`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

**Note:** The server must be running for the API to be available:
```bash
node server.js
```

---

## Future Enhancements

Potential additions to the API:

1. **Authentication** - API keys for external access
2. **Webhooks** - Real-time notifications on new predictions
3. **Filtering** - Query params for sport, league, date ranges
4. **Pagination** - For large result sets
5. **Rate Limiting** - Prevent abuse
6. **WebSocket** - Real-time streaming of new data
7. **CSV Export** - Alternative format for data analysis
8. **GraphQL** - Flexible querying

---

## Support

For issues or feature requests, check the Sportsbook Terminal documentation or server logs.
