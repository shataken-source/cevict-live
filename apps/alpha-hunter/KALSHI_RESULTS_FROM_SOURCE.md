# Getting Results Straight From Kalshi

When we bet on a game, Kalshi has the official outcome and (for sports) the resolution value (e.g. final score or winner). Using Kalshi as the single source of truth avoids drift and keeps learning data accurate.

## Current State

- **Settlement source**: We already use Kalshi for win/loss and PnL:
  - **Settlement worker** (`services/kalshi/settlement-worker.ts`): Polls `GET /portfolio/settlements` per open trade; when a settlement exists, computes outcome and PnL and updates `trade_history`, `bot_predictions`, and `kalshi_learning_data`.
  - **Daily hunter** (`daily-hunter.ts`): `settleTrades()` does the same for its open trades via `getSettlementsForTicker(ticker)`.
- **Settlement API** returns: `market_result` ('yes'|'no'), `revenue` (cents), `settled_time`, `yes_count`/`no_count`, etc. So **results (win/loss + PnL) already come from Kalshi.**

## What "Final Score" Adds

- **GET /markets/{ticker}** (single market) returns, when the market is settled:
  - `status`: `'finalized'` or `'determined'`
  - `result`: `'yes'` | `'no'` (binary outcome)
  - `expiration_value`: string — *"The value that was considered for the settlement."* For game markets this may be the final score (e.g. `"98-95"`) or a short resolution description (e.g. winner name).
- So we can show "Kalshi result: YES, final score 98-95" (or whatever Kalshi put in `expiration_value`) without relying on any other data source.

## What It Takes

1. **Single-market fetch**  
   Add `getMarket(ticker)` in `KalshiTrader` that calls `GET /trade-api/v2/markets/{ticker}` and returns the market object (including `result`, `status`, `expiration_value` when present). No new env or config.

2. **Use it at settlement time**  
   In the settlement worker (and optionally in daily-hunter `settleTrades()`), when a settlement is found for a ticker:
   - Keep current behavior: derive outcome and PnL from the settlement (already 100% from Kalshi).
   - Optionally call `getMarket(ticker)` once per settled trade and:
     - Log `result` and `expiration_value` (e.g. for debugging / dashboards).
     - Optionally store `expiration_value` (e.g. in `kalshi_learning_data.notes` or a `resolution_detail` / `final_score` column) so UIs and reports can show "Final score: …" from Kalshi.

3. **Schema (optional)**  
   If you want to store the resolution text in the DB:
   - Either add a column like `resolution_detail` or `final_score` to `trade_history` (or `kalshi_learning_data`) and set it from `expiration_value` when closing the trade.
   - Or reuse existing JSONB `notes` in `kalshi_learning_data` and set e.g. `notes = { "kalshi_expiration_value": "98-95" }` when calling `updateKalshiTradeOutcome`.

4. **Rate limiting**  
   One extra GET per trade when it settles; keep existing rate limiting and avoid calling `getMarket` in a tight loop.

## Summary

- **Results (win/loss + PnL)** already come straight from Kalshi via `/portfolio/settlements`.
- To **also** get the "final score" (or any resolution text) from Kalshi: add `getMarket(ticker)`, call it when processing a settlement, and log/store `expiration_value` as above.
