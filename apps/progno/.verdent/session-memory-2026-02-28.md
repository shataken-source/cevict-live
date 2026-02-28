# Progno + Alpha-Hunter Session — Feb 28, 2026

## What Was Done

### 1. Deep Audit (Progno + Alpha-Hunter)
Full pipeline audit from odds ingestion -> confidence -> picks -> Kalshi bets.

**6 bugs found and fixed:**

| # | File | Fix |
|---|------|-----|
| 1 | `apps/progno/app/api/picks/today/route.ts:436,469` | Added `PROGNO_FLOOR_CBB` env var for college baseball (was sharing NCAAB's value) |
| 2 | `apps/progno/app/api/progno/picks/route.ts:116-120` | Changed Supabase query from `created_at` to `.eq('game_date', date)` — fixes "10 saved but 3 loaded" |
| 3 | `apps/alpha-hunter/src/services/kalshi/execution-gate.ts` | Rewrote: now throws on `MAX_SINGLE_TRADE > $50` in production + new `assertMaxTradeSize()` |
| 4 | `apps/alpha-hunter/src/fund-manager.ts:581` | `MAX_DAILY_LOSS` default aligned to $50 (was $100, conflicting with trade-limiter's $50) |
| 5 | `apps/alpha-hunter/src/intelligence/probability-bridge.ts:106-114,180-182` | File-based loader now flips MC prob for away picks + warning log on fallback |
| C1 | `apps/alpha-hunter/src/exchanges/exchange-manager.ts:297-300,340-343` | Added 0.5% slippage buffer (`* 0.995`) to Coinbase AND Binance sell paths |

### 2. Env-Var Strategy Config
All strategy constants in `picks/today/route.ts` are now env-var backed (PROGNO_MIN_ODDS, PROGNO_MAX_ODDS, etc.)

### 3. Historical Simulation (Feb 20-28)
- 76 picks graded, 53 correct, 23 wrong = **69.7% win rate**
- 3,012 game outcomes stored to Supabase

### 4. Probability Analyzer A/B Simulation (249 games, 1000 bootstrap sims)
**Script:** `scripts/probability-analyzer-simulation.ts`
**Data:** 94,000 odds records + 1,000 game outcomes from Supabase (Feb 21-28)

**Results:**
| Metric | WITHOUT Analyzer | WITH Analyzer |
|--------|:---:|:---:|
| Win Rate | 57.66% | 58.87% (+1.21%) |
| ROI | 9.81% | 11.53% (+1.72pp) |
| Avg Bankroll | $12,401 | $12,837 (+$436) |
| % Profitable | 94.5% | 98.1% (+3.6pp) |
| Max Drawdown | 9.59% | 8.74% (-0.85pp) |

**Verdict: ANALYZER HELPS** — 3 flipped picks in NCAA (college baseball), all 3 won.

**Optimal parameters applied to `probability-analyzer-signal.ts`:**
- CONFIDENCE_WEIGHT: 1.0 -> **0.5**
- EDGE_WEIGHT: 0.8 -> **0.3**
- NHL multiplier: 1 -> **0**
- Everything else confirmed correct (blend=0.1, flip=45, NCAA=0.3)

## Files Changed (not yet committed)
- `apps/progno/app/api/picks/today/route.ts` — PROGNO_FLOOR_CBB + env var changes
- `apps/progno/app/api/progno/picks/route.ts` — game_date query
- `apps/progno/app/lib/modules/signals/probability-analyzer-signal.ts` — tuned weights
- `apps/alpha-hunter/src/services/kalshi/execution-gate.ts` — production safety gate
- `apps/alpha-hunter/src/fund-manager.ts` — daily loss limit alignment
- `apps/alpha-hunter/src/intelligence/probability-bridge.ts` — MC prob away fix
- `apps/alpha-hunter/src/exchanges/exchange-manager.ts` — slippage buffer
- `apps/progno/run-historical-sim.cjs` — simulation script
- `grade-week.cjs` — grading script
- `apps/progno/simulation-results.json` — A/B sim output

## What's Left
- **Commit all changes** to gcc-vessels branch
- **Vercel deploy** to apply cron time + analyzer tuning
