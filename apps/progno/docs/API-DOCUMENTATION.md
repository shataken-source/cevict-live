# 🏆 CEVICT FLUX v2.0
## Complete API Documentation

---

## 📋 OVERVIEW

Cevict Flux v2.0 provides complete access to the most advanced sports prediction system ever built, powered by the revolutionary 7-Dimensional Claude Effect. The Statistical Engine for High-Conviction Sports Intelligence.

**Base URL:** `/api/progno/v2`

**Version:** `2.0.0`

---

## 🔐 AUTHENTICATION

```bash
# Include API key in headers
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     https://yoursite.com/api/progno/v2?action=health
```

---

## 🚀 QUICK START

### Get Today's Predictions
```bash
GET /api/progno/v2?action=predictions&sport=nfl&date=2024-12-28
```

### Get Single Game Prediction
```bash
GET /api/progno/v2?action=prediction&gameId=nfl-2024-week17-dal-phi
```

### Get Sharp Money Alerts
```bash
GET /api/progno/v2?action=alerts&type=sharp
```

---

## 📡 ENDPOINTS

### Health Check
```
GET ?action=health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "2.0.0",
    "components": {
      "predictionEngine": "operational",
      "claudeEffect": "operational",
      "sentimentField": "operational",
      "narrativeMomentum": "operational",
      "informationAsymmetry": "operational",
      "chaosSensitivity": "operational",
      "networkInfluence": "operational",
      "temporalRelevance": "operational",
      "emergentPatterns": "operational"
    }
  }
}
```

---

### Get Games
```
GET ?action=games&sport={sport}&date={YYYY-MM-DD}
```

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| sport | string | No | nfl, nba, mlb, nhl, cfb, cbb |
| date | string | No | Date in YYYY-MM-DD (default: today) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "nfl-2024-week17-dal-phi",
      "sport": "nfl",
      "homeTeam": {
        "id": "phi",
        "name": "Philadelphia Eagles",
        "abbreviation": "PHI",
        "record": { "wins": 12, "losses": 4 }
      },
      "awayTeam": {
        "id": "dal",
        "name": "Dallas Cowboys",
        "abbreviation": "DAL",
        "record": { "wins": 7, "losses": 9 }
      },
      "startTime": "2024-12-28T20:20:00Z",
      "venue": "Lincoln Financial Field",
      "broadcast": "NBC"
    }
  ]
}
```

---

### Get Odds
```
GET ?action=odds&gameId={gameId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sportsbook": "consensus",
    "spread": {
      "home": -7.5,
      "homeOdds": -110,
      "away": 7.5,
      "awayOdds": -110
    },
    "moneyline": {
      "home": -350,
      "away": 280
    },
    "total": {
      "line": 44.5,
      "overOdds": -110,
      "underOdds": -110
    },
    "timestamp": "2024-12-28T15:00:00Z"
  }
}
```

---

### Get Prediction
```
GET ?action=prediction&gameId={gameId}&includeClaudeEffect=true&bankroll=1000
```

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| gameId | string | Yes | Game identifier |
| includeClaudeEffect | boolean | No | Include Claude Effect (default: true) |
| bankroll | number | No | Your bankroll for bet sizing |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "pred_1703779200_abc123",
    "gameId": "nfl-2024-week17-dal-phi",
    "sport": "nfl",
    "homeTeam": "PHI",
    "awayTeam": "DAL",

    "predictedWinner": "home",
    "winProbability": 0.72,
    "confidence": "high",
    "confidenceScore": 78,

    "spread": {
      "prediction": "home",
      "line": -7.5,
      "edge": 0.04,
      "probability": 0.58
    },

    "total": {
      "prediction": "under",
      "line": 44.5,
      "edge": 0.02,
      "probability": 0.54
    },

    "recommendation": {
      "shouldBet": true,
      "primaryPick": {
        "type": "spread",
        "side": "home",
        "line": -7.5,
        "odds": -110,
        "units": 1.5,
        "expectedValue": 12.50
      },
      "stayAway": false
    },

    "claudeEffect": {
      "totalEffect": 0.08,
      "totalConfidence": 0.75,
      "dimensions": {
        "sentimentField": { "score": 0.35, "confidence": 0.82 },
        "narrativeMomentum": { "score": 0.12, "confidence": 0.78 },
        "informationAsymmetry": { "score": 0.15, "confidence": 0.85 },
        "chaosSensitivity": { "score": 0.32, "category": "moderate" },
        "networkInfluence": { "score": 0.08, "confidence": 0.72 },
        "temporalRelevance": { "overallDecay": 0.95 },
        "emergentPatterns": { "score": 0.10, "confidence": 0.80 }
      },
      "summary": "MODERATE positive Claude Effect (8.0%). Division rivalry narrative + Sharp money on home.",
      "keyFactors": [
        "📖 Division Rivalry Game",
        "🚨 2 steam moves toward home",
        "🟢 Positive team sentiment"
      ],
      "warnings": []
    }
  }
}
```

---

### Get Multiple Predictions
```
GET ?action=predictions&sport={sport}&date={date}&limit=50
```

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| sport | string | No | Filter by sport |
| date | string | No | Date (default: today) |
| limit | number | No | Max results (default: 50) |

---

### Get Claude Effect
```
GET ?action=claude-effect&gameId={gameId}&teamId={teamId}
```

**Full Claude Effect breakdown for detailed analysis.**

---

### Get Simulation
```
GET ?action=simulation&gameId={gameId}&iterations=10000
```

**Response:**
```json
{
  "success": true,
  "data": {
    "gameId": "nfl-2024-week17-dal-phi",
    "iterations": 10000,

    "homeWinPct": 72.3,
    "awayWinPct": 27.7,

    "spreadResults": {
      "homeCoverPct": 58.2,
      "awayCoverPct": 39.1,
      "pushPct": 2.7,
      "avgMargin": 9.2,
      "marginStdDev": 14.5
    },

    "totalResults": {
      "overPct": 46.8,
      "underPct": 51.5,
      "pushPct": 1.7,
      "avgTotal": 43.8,
      "totalStdDev": 12.3
    },

    "scenarios": {
      "blowoutHome": 28.5,
      "blowoutAway": 8.2,
      "closeGame": 22.1,
      "overtime": 4.3
    }
  }
}
```

---

### Get Arbitrage Opportunities
```
GET ?action=arbitrage&sport={sport}&minProfit=0.5&maxAge=30
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "arb_123",
      "gameId": "nfl-2024-week17-dal-phi",
      "type": "moneyline",
      "side1": {
        "sportsbook": "DraftKings",
        "side": "home",
        "odds": -340,
        "stake": 773
      },
      "side2": {
        "sportsbook": "FanDuel",
        "side": "away",
        "odds": 295,
        "stake": 227
      },
      "totalStake": 1000,
      "guaranteedProfit": 8.50,
      "profitPercentage": 0.85,
      "confidence": 0.95
    }
  ]
}
```

---

### Get Alerts
```
GET ?action=alerts&type={type}&sport={sport}
```

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | No | sharp, steam, value, all |
| sport | string | No | Filter by sport |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "sharp_money",
      "gameId": "nfl-2024-week17-dal-phi",
      "game": "DAL @ PHI",
      "urgency": "high",
      "message": "STRONG_SHARP on home",
      "score": 0.18,
      "confidence": 0.82,
      "signals": {
        "reverseLineMovement": { "publicPct": 68, "lineMovement": -1.0 },
        "steamMoves": [{ "movement": 0.5, "strength": "strong" }]
      }
    },
    {
      "type": "steam_move",
      "gameId": "nfl-2024-week17-buf-ne",
      "urgency": "critical",
      "message": "MEGA steam: 1.5 pts toward away",
      "details": {
        "movement": 1.5,
        "booksAffected": ["Pinnacle", "Circa", "BetMGM", "DraftKings", "FanDuel"],
        "strength": "mega"
      }
    }
  ]
}
```

---

### Analyze Parlay (POST)
```
POST ?action=parlay
Content-Type: application/json

{
  "legs": [
    { "gameId": "nfl-week17-dal-phi", "type": "spread", "side": "home" },
    { "gameId": "nfl-week17-buf-ne", "type": "moneyline", "side": "away" },
    { "gameId": "nfl-week17-sf-ari", "type": "total", "side": "over" }
  ],
  "stake": 100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "parlay_123",
    "legs": [...],
    "totalOdds": 625,
    "impliedProbability": 0.138,
    "calculatedProbability": 0.165,
    "expectedValue": 19.45,
    "payout": 725,
    "risk": "medium",
    "recommendation": "Positive EV - Consider reduced stake"
  }
}
```

---

### Analyze Teaser (POST)
```
POST ?action=teaser
Content-Type: application/json

{
  "legs": [
    { "gameId": "nfl-week17-dal-phi", "originalLine": -7.5, "side": "home" },
    { "gameId": "nfl-week17-buf-ne", "originalLine": 3.5, "side": "away" }
  ],
  "points": 6,
  "stake": 100
}
```

---

### Optimize Bankroll (POST)
```
POST ?action=bankroll
Content-Type: application/json

{
  "bankroll": 5000,
  "riskTolerance": "moderate",
  "maxBetSize": 0.05
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBankroll": 5000,
    "availableBankroll": 4500,
    "recommendations": [
      {
        "gameId": "nfl-week17-dal-phi",
        "betType": "spread",
        "side": "home",
        "kellyFraction": 0.032,
        "recommendedStake": 144,
        "maxStake": 250,
        "expectedValue": 8.64
      }
    ],
    "dailyLimit": 500,
    "weeklyLimit": 1500,
    "currentExposure": 0,
    "riskMetrics": {
      "sharpeRatio": 1.42,
      "maxDrawdown": 0.12,
      "winRate": 0.58,
      "roi": 0.085
    }
  }
}
```

---

### Track Bet (POST)
```
POST ?action=track-bet
Content-Type: application/json

{
  "gameId": "nfl-week17-dal-phi",
  "betType": "spread",
  "side": "home",
  "line": -7.5,
  "odds": -110,
  "stake": 110,
  "sportsbook": "DraftKings"
}
```

---

### Get Leaderboard
```
GET ?action=leaderboard&period=7d&sport=nfl
```

**Parameters:**
| Param | Type | Values |
|-------|------|--------|
| period | string | 7d, 30d, season, all |
| sport | string | nfl, nba, etc. |

---

## 🧠 CLAUDE EFFECT DIMENSIONS

| Phase | Dimension | Weight | Max Impact | Endpoint |
|-------|-----------|--------|------------|----------|
| 1 | Sentiment Field (SF) | 0.12 | ±5% | /api/sentiment |
| 2 | Narrative Momentum (NM) | 0.18 | ±8% | /api/narrative |
| 3 | Information Asymmetry (IAI) | 0.20 | ±6% | /api/iai |
| 4 | Chaos Sensitivity (CSI) | Conf | Confidence | /api/csi |
| 5 | Network Influence (NIG) | 0.12 | ±4% | /api/nig |
| 6 | Temporal Relevance (TRD) | Mod | Decay | /api/temporal |
| 7 | Emergent Patterns (EPD) | 0.18 | ±5% | /api/emergent |

**Formula:**
```
CLAUDE_EFFECT = (SF×0.12) + (NM×0.18) + (IAI×0.20) + (NIG×0.12) + (EPD×0.18)
              × TRD (temporal decay)
              with CSI (confidence adjustment)

MAX IMPACT: ±15%
```

---

## 📊 SUPPORTED SPORTS

| Sport | Code | Seasons |
|-------|------|---------|
| NFL | nfl | Aug-Feb |
| NBA | nba | Oct-Jun |
| MLB | mlb | Mar-Oct |
| NHL | nhl | Oct-Jun |
| College Football | cfb | Aug-Jan |
| College Basketball | cbb | Nov-Apr |
| Soccer | soccer | Year-round |
| MMA | mma | Year-round |
| Tennis | tennis | Year-round |

---

## ⚠️ ERROR CODES

| Code | Description |
|------|-------------|
| MISSING_PARAM | Required parameter missing |
| INVALID_PARAM | Parameter value invalid |
| GAME_NOT_FOUND | Game ID not found |
| RATE_LIMIT | Too many requests |
| INTERNAL_ERROR | Server error |

---

## 📈 RATE LIMITS

| Plan | Requests/Hour | Burst |
|------|---------------|-------|
| Free | 100 | 10 |
| Pro | 1000 | 50 |
| Enterprise | 10000 | 200 |

---

## 🐘 ROLL TIDE!

**The most advanced sports prediction API ever built.**

