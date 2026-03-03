# Market Maker Analysis (Progno)

## Overview

The **Market Maker** feature in Progno analyzes **execution quality** on prediction markets (Kalshi and Polymarket). It does **not** generate probabilities or picks; it answers *when* and *how* to trade given liquidity and market-maker activity—e.g. trade now, wait, or avoid, and whether to use market vs limit orders.

**Live Kalshi:** Alpha-hunter **does** call the market-maker API before placing each Kalshi order. If the recommendation is **avoid**, the order is skipped; if **trade** and a suggested limit price is within 5¢ of the engine’s price, that price is used. On API error or timeout, placement proceeds (fallback). Set `DISABLE_MARKET_MAKER=1` in alpha-hunter to turn this off. Polymarket is not wired (region restrictions). The API is implemented and available for analysis only; nothing in the stack currently uses it to filter picks, size stakes, or change execution.

---

## What It Does

- **Liquidity:** Classifies markets as high / medium / low (volume, open interest, spread).
- **Market-maker activity:** Detects tight spreads, deep order books, and consistent pricing that suggest professional market making.
- **Order book depth:** Reports bid/ask levels, total size, and imbalance (e.g. more bids vs asks).
- **Trading recommendation:** Returns one of:
  - **trade** — good execution conditions (e.g. high liquidity, tight spread).
  - **wait** — moderate conditions; may be better to wait for a better entry.
  - **avoid** — low liquidity or wide spread; poor execution expected.
- **Execution hint:** Optional `optimalEntry` (market vs limit) and `suggestedLimitPrice` (e.g. for limit orders on Kalshi).

So the market-maker feature supports **probability bets** by improving *how* and *when* you execute them, not by producing the underlying probabilities (that is the pick engine and probability analyzer).

---

## Where It Lives

| Item | Location |
|------|----------|
| API route | `app/api/markets/market-makers/route.ts` |
| Kalshi client | `app/lib/markets/kalshi-client.ts` |
| Polymarket client | `app/lib/markets/polymarket-client.ts` |
| Arbitrage/spread logic | `app/lib/markets/arbitrage-detector.ts` |

---

## API

**Endpoint:** `GET /api/markets/market-makers`

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `platform` | `kalshi` \| `polymarket` | Limit to one platform; omit for both. |
| `marketId` | string | Analyze a single market (ticker on Kalshi, conditionId on Polymarket). |
| `limit` | number | Max markets to return when listing (default 10). |

**Examples:**

```bash
# List up to 10 markets (both platforms), sorted by liquidity
GET /api/markets/market-makers?limit=10

# Kalshi only
GET /api/markets/market-makers?platform=kalshi&limit=5

# Single market
GET /api/markets/market-makers?platform=kalshi&marketId=TICKER
```

**Response (list):**

```json
{
  "success": true,
  "count": 5,
  "analyses": [
    {
      "platform": "kalshi",
      "marketId": "TICKER",
      "question": "Will X beat Y?",
      "liquidity": { "level": "high", "volume": 10000, "spread": 1.5 },
      "marketMakerActivity": {
        "detected": true,
        "confidence": "high",
        "indicators": ["Tight bid-ask spread", "Deep order book"]
      },
      "orderBookDepth": { "levels": 12, "totalSize": 5000, "imbalance": 0.1 },
      "tradingRecommendation": {
        "action": "trade",
        "reason": "High liquidity and tight spread - good execution conditions",
        "optimalEntry": "limit",
        "suggestedLimitPrice": 55
      }
    }
  ],
  "timestamp": "...",
  "duration": "123ms"
}
```

---

## What Uses It

- **Alpha-hunter (Kalshi only)** — Before each Kalshi limit order, calls `GET /api/markets/market-makers?platform=kalshi&marketId=<ticker>`. If response is **avoid**, the order is skipped; if **trade** with `suggestedLimitPrice` within 5¢ of the engine price, that price is used. On error/timeout, placement proceeds. Disable with `DISABLE_MARKET_MAKER=1`.

## What Does *Not* Use It

- **Alpha-hunter (Polymarket)** — Not wired (region restrictions).
- **7-day / probability-analyzer simulation** — Uses Supabase `historical_odds` and `game_outcomes` to grade picks. It does **not** use market-maker data.
- **Pick engine** — Produces picks and confidence; no market-maker input.
- **Wallboard** — Uses `/api/markets/kalshi/sports` (and similar) for display; does not use `/api/markets/market-makers`.

So today the market-maker API is **analysis-only** and has no effect on automated decisions or backtests.

---

## How It Could Be Wired In

To make the market-maker feature actually affect behavior:

1. **Alpha-hunter (or execution layer):** Before placing a bet, call the market-maker API for that market (or for the day’s markets). If the recommendation is `avoid`, skip or delay the trade; if `wait`, optionally retry later; if `trade`, use `optimalEntry` and `suggestedLimitPrice` when placing orders.
2. **Progno picks API:** Optionally filter or rank picks by execution quality (e.g. only return picks for markets where market-maker analysis says `trade` or `wait`).
3. **Dashboard / UI:** Show market-maker summary (e.g. “3 trade, 2 wait, 1 avoid”) so operators can decide manually.

No code changes for the above exist yet; this is the intended use of the API.

---

## Production base URL

Progno runs in production on Vercel. The **base URL** alpha-hunter (and any other consumer) should use for the market-maker and picks APIs is:

- **Production:** `https://prognoultimatev2-cevict-projects.vercel.app`

Confirm in **Vercel Dashboard → progno project → Settings → Domains** (or the deployment URL of your latest production deployment). If you use a custom domain for Progno, set that as `PROGNO_BASE_URL` instead.

- **Alpha-hunter:** Set `PROGNO_BASE_URL` in alpha-hunter’s environment (e.g. Vercel env vars or keyvault for prod) to this URL so market-maker and picks calls hit the live Progno deployment.
- **Local:** Use `PROGNO_BASE_URL=http://localhost:3008` when running Progno locally.

---

## Configuration

The API uses the same clients as other Progno market features:

- **Kalshi:** `KALSHI_API_KEY_ID`, `KALSHI_PRIVATE_KEY`; optional `KALSHI_API_URL`. Required for Kalshi sports markets.
- **Polymarket:** `POLYMARKET_GRAPHQL_URL` (default public GraphQL), optional `POLYMARKET_API_KEY` for rate limits.

If a client is not configured, that platform is skipped when listing markets; the API still returns the other platform’s analyses.

---

## Summary

| Question | Answer |
|----------|--------|
| What is it? | Analysis of liquidity and market-maker activity on Kalshi/Polymarket. |
| Does it make picks? | No. It advises *when/how* to execute (trade / wait / avoid, market vs limit). |
| Is it used anywhere? | Yes. Alpha-hunter (Kalshi) calls it before each order; simulations and the pick engine do not. |
| Where is it? | Progno: `app/api/markets/market-makers/route.ts` and `app/lib/markets/*`. |
| How to use it? | Call the API from a dashboard, script, or execution layer and act on the recommendations. |
