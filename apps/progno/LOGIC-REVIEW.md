# PROGNO + ALPHA-HUNTER: Full Logic Review Document
# Generated: 2026-02-28
# Purpose: Upload to external AI agents for independent review

## SYSTEM OVERVIEW

Two interconnected systems:
1. **Progno** — Sports prediction engine (Next.js, Vercel, Supabase)
2. **Alpha-Hunter** — Automated trading bot that consumes Progno picks to trade on Kalshi + crypto

## PROGNO PREDICTION PIPELINE

### Step 1: Odds Ingestion
Location: `apps/progno/app/api/picks/today/route.ts`
Sources (in order): Memory cache (30min) → Supabase historical_odds (2h) → The-Odds API → API-Sports
Consensus: averages up to 5 bookmakers, validates |price| >= 100 (American odds)
Sports: NBA, NCAAB, NHL, NFL, MLB, NCAAF, CBB (college baseball)

### Step 2: Devigging (Shin Model)
Location: `apps/progno/app/lib/odds-helpers.ts` shinDevig()
Method: Shin (1991) model, binary search (40 iterations)
Removes favorite-longshot bias, outputs true probabilities summing to 1.0

### Step 3: Monte Carlo Simulation
Location: `apps/progno/app/lib/monte-carlo-engine.ts`
Iterations: 5,000 per game
Distributions:
  - Normal (Box-Muller): NBA (avg=112, std=12, HA=3.0), NCAAB (72, 11, 4.0), NFL (24, 10, 2.5), NCAAF (28, 14, 3.5)
  - Poisson: NHL (3.0, 1.2, 0.3), MLB (4.5, 2.5, 0.2), CBB (5.0, 3.0, 1.0)
Default totals: NBA=224, NCAAB=145, NFL=44, NCAAF=58, NHL=6, MLB=9, CBB=10

### Step 4: 7-Dimensional Claude Effect
Location: `picks/today/route.ts:889+`
- SF (Sentiment): odds-derived only = (homeProb - 0.5) * 0.3
- IAI (Information Asymmetry): spread-vs-ML implied probability gap
- NM, CSI, NIG, EPD: all return 0 when no real data (honest zeros)
- TRD: temporal decay multiplier

### Step 5: Confidence Formula v4
Location: `picks/today/route.ts:1432-1499`
Formula:
  marketBaseConf = max(favoriteProb, 1-favoriteProb) * 100
  mcBlendedConf = marketBaseConf * 0.6 + mcPct * 0.4
  trueEdgeBoost = trueEdgeResult.totalEdge * 80
  confidence = round(mcBlendedConf + trueEdgeBoost - chaosPenalty)
  if isHomePick: confidence += 5 (HOME_BIAS_BOOST)
  else: confidence -= 5 (or -10 for NBA away)
  earlyDecay applied if game > 1 day out
  ceiling = marketImplied + 20% (10% for baseball)
  clamp [30, 95]

### Step 6: Filtering (3 layers)
1. Odds range: minOdds=-200, maxOdds=500 for "best" strategy
2. HOME_ONLY_MODE (default ON): drops all away picks
3. Confidence floor: strategy min=57%, then per-league floors (NFL/NCAAF=62%, others=57%)

### Step 7: 16-Model Probability Analyzer
Location: `app/lib/modules/signals/probability-analyzer-signal.ts`
Models: Bayesian, WeightedFactors, Consensus, RandomForest, XGBoost, NeuralNet,
        Markov, KNN, SVM, LSTM, Attention, GradientBoost, Elo, Poisson, Linear, Momentum
Ensemble: confidence-weighted average of all 16 models
FLIP logic: if oppEnsemble > 45 AND pickEnsemble < 55 AND gap > 10 → flip pick
Sport multipliers: NCAA (college baseball) = 0.3, all others = 0
Tuned params (from 249-game A/B sim): blend=0.1, confW=0.5, edgeW=0.3, spreadW=0.3

### Step 8: Selection
Top N picks by composite score (default 25)
compositeScore = normalizedEdge*40 + normalizedEV*40 + (confidence/100)*20

### Step 9: Tier Assignment
Location: `app/lib/tier-assignment-service.ts`
Elite: confidence >= 70% (env: PROGNO_TIER_ELITE_MIN)
Premium: confidence >= 62% (env: PROGNO_TIER_PREMIUM_MIN)
Free: bottom 3 picks
Home picks prioritized for Elite tier (backtest: +112% ROI home vs -18% away)

## ALPHA-HUNTER TRADING PIPELINE

### Probability Bridge
Location: `src/intelligence/probability-bridge.ts`
Fetches Progno picks from /api/picks/today
Prefers mc_win_probability (raw MC, 0-1 scale) over confidence (has bias/decay baked in)
Flips MC prob for away picks: mcProb = isHomePick ? mc_win_probability : 1 - mc_win_probability
Matches to Kalshi markets by ticker prefix (KXNBAGAME, etc.) + team name tokens

### Kalshi Trade Evaluation
Location: `src/intelligence/kalshi-trader.ts`
Net profit: contracts = stake / (priceCents/100), gross = contracts * $1, fee = 7% of profit
Maker-only: limit orders 1¢ inside spread
Edge calculation: modelProbability - entryPrice (in cents as %)
Minimum edge: 5% (skips if model < market)
Minimum net profit: $0.50

### Execution Gate
Location: `src/services/kalshi/execution-gate.ts`
Production by default (KALSHI_ENV=demo for demo)
Hard cap: throws if MAX_SINGLE_TRADE > $50
assertMaxTradeSize(amount) for per-trade check

### Safety Gates
- MAX_SINGLE_TRADE: $10 default
- MAX_DAILY_TRADES: 20 (10 per platform)
- MAX_DAILY_LOSS: $50 (aligned between trade-limiter and fund-manager)
- Emergency stop: global kill switch
- Duplicate prevention: extracts game ID from ticker

### Crypto Trading
Location: `src/strategies/crypto-trader.ts` + `src/exchanges/exchange-manager.ts`
Assets: BTC, ETH, SOL only
Strategies: Mean Reversion (2%+ 24h move), Momentum (70%+ directional), Breakout
Exchanges: Coinbase (primary), Binance (price comparison)
$50 USDC reserve floor, 0.5% slippage buffer on sells
Profit-taking: every 5th cycle, sells 50% of positions up > 4%

### Learning Loop
Location: `src/services/kalshi/learning-loop.ts`
Logs predicted prob vs market odds for every trade
After 100 settled trades per category: calibration adjustment via Postgres RPC

## VERIFIED PERFORMANCE (Feb 20-27, 2026)
76 picks graded: 53 correct, 23 wrong = 69.7% win rate
Best day: Feb 20 (88.9%), Worst: Feb 22 (33.3%)

## A/B SIMULATION RESULTS (249 games, 1000 bootstrap sims)
Without analyzer: 57.66% WR, 9.81% ROI, $12,401 avg bankroll
With analyzer: 58.87% WR, 11.53% ROI, $12,837 avg bankroll (+1.72pp ROI)
NCAA flips: 3/3 won (original would have lost all 3)

## KNOWN ISSUES / RISKS
1. API key rotation: if primary key is depleted, every other request fails (1-min bucket rotation)
2. CevictScraper (port 3009) must be running for injury data — blocks pipeline if down
3. prediction-tracker.ts resets on Vercel cold starts (memory only, no Supabase persistence)
4. cevict-probability-analyzer.ts is dashboard-only, NOT wired into pipeline
5. Kalshi market can price games very differently from our model (e.g., OKC 89% vs our 65%)
   — this is correct behavior (no edge = no bet), not a bug

## ENV VARS (all configurable without code change)
PROGNO_MIN_ODDS (-200), PROGNO_MAX_ODDS (500), PROGNO_MIN_CONFIDENCE (57)
PROGNO_HOME_BIAS_BOOST (5), PROGNO_AWAY_BIAS_PENALTY (5)
PROGNO_FLOOR_NBA/NFL/NCAAB/NCAAF/NHL/MLB/CBB (57-62)
PROGNO_TOP_N (25), FILTER_STRATEGY (best), HOME_ONLY_MODE (true)
PROGNO_TIER_ELITE_MIN (70), PROGNO_TIER_PREMIUM_MIN (62), PROGNO_TIER_FREE_MAX (3)
MAX_SINGLE_TRADE (10), MAX_DAILY_LOSS (50), KALSHI_ENV (prod)
