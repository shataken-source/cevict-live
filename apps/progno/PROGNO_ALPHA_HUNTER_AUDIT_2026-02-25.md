# PROGNO & ALPHA-HUNTER — Deep Audit Report
**Date:** February 25, 2026
**Status:** All critical and medium bugs fixed. Remaining low-priority items documented.

---

## PROGNO — Full Architecture

### Stack & Deployment
- **Framework:** Next.js 16 canary on Vercel
- **Database:** Supabase (storage + tables)
- **Scores:** ESPN free scoreboard (no key, no quota)
- **Odds:** The Odds API (paid, keyed)
- **URL:** `cevict-monorepo-progno-one.vercel.app` (deploys from `main` branch)

### Cron Schedule (vercel.json, all UTC)

| Time | Job | Purpose |
|------|-----|---------|
| `0 * * * *` | track-odds | Hourly odds snapshot → `historical_odds` table |
| `0 12 * * *` | daily-results | Grade yesterday's picks via ESPN scores |
| `15 13 * * *` | daily-results-retry | Re-run grading (catches late scores) |
| `0 13 * * *` | daily-predictions?earlyLines=1 | Early lines 2-5 days ahead |
| `30 13 * * *` | daily-predictions | Today's picks |
| `0 2 * * 1` | weekly-learning | Monday 2am |

### Core Data Flow

```
Odds API → /api/picks/today (Monte Carlo + 7D Claude Effect) → ranked picks
    ↓
daily-predictions cron → Supabase Storage (predictions-YYYY-MM-DD.json)
                       → Supabase `picks` table
                       → syndicate to Prognostication (3 tiers: free/premium/elite)
    ↓
daily-results cron → ESPN scores → grade picks
                   → Supabase `prediction_results`
                   → Supabase `prediction_daily_summary`
                   → Supabase `game_outcomes`
    ↓
track-odds cron → Odds API (Pinnacle/DK/FanDuel/BetMGM × 7 sports)
               → Supabase `historical_odds`
```

### Key API Routes

| Route | Purpose |
|-------|---------|
| `/api/picks/today` | Core prediction engine (2137 lines): Monte Carlo, 7D Claude Effect, value betting, vig-aware edge |
| `/api/progno/v2` | Dashboard endpoint (games, live-scores, predictions) |
| `/api/espn-scores` | Free ESPN scoreboard proxy with 30s edge cache |
| `/api/early-lines/analysis` | Early odds aggregation, injuries, news, arb detection |
| `/api/cron/daily-predictions` | Calls picks/today, persists to Supabase Storage + DB, syndicates |
| `/api/cron/daily-results` | Grades via ESPN + team-matcher, writes results to Supabase |
| `/api/cron/track-odds` | Snapshots odds from 4 bookmakers for 7 sports |
| `/api/progno/kalshi/` | Kalshi market matching for the web UI |

### Key Lib Files (app/lib/)

| File | Size | Purpose |
|------|------|---------|
| `prediction-engine.ts` | 59KB | Main prediction logic |
| `supplemental-data-sources.ts` | 30KB | College baseball, NASCAR, X/Twitter, MLB weather, scraped odds |
| `claude-effect.ts` | 28KB | 7D Claude Effect (SF, NM, NIG, EPD, IAI, CSI, TRD) |
| `monte-carlo-engine.ts` | 24KB | Monte Carlo simulation engine |
| `true-edge-engine.ts` | 23KB | Stadium/weather/travel edge calculations |
| `espn-team-stats-service.ts` | 16KB | ESPN team stats with caching |
| `odds-helpers.ts` | 15KB | Shin devig, implied prob, american/decimal conversion |
| `tier-assignment-service.ts` | 10KB | Free/premium/elite tier classification |
| `elite-picks-enhancer.ts` | 11KB | Extra analysis for elite tier |
| `team-matcher.ts` | 5KB | Fuzzy team name matching (shared with daily-results grading) |

### Supabase Tables Used
`picks`, `prediction_results`, `prediction_daily_summary`, `game_outcomes`, `historical_odds`

### Results APIs (lib/data-sources/results-apis.ts)
ESPN is primary (free, no key). Fallback chain: Rolling Insights → JsonOdds → TheSportsDB → Score24 → BALLDONTLIE. All optional (key-gated).

### Sports Supported
- **Short codes:** NHL, NBA, NFL, NCAAB (college basketball), NCAAF (college football), MLB, CBB (college baseball)
- **Odds API keys:** `icehockey_nhl`, `basketball_nba`, `americanfootball_nfl`, `basketball_ncaab`, `americanfootball_ncaaf`, `baseball_mlb`, `baseball_ncaa`

### Components (components/)

| Component | Purpose |
|-----------|---------|
| `EnhancedPicksCard.tsx` | Prediction display cards |
| `ClaudeEffectCard.tsx` | Claude Effect visualization |
| `SharpMoneyIndicator.tsx` | Sharp money / public money indicator |
| `ConfidenceGauge.tsx` | Visual confidence gauge |
| `EnhancedAccuracyDashboard.tsx` | Historical accuracy tracking |
| `LiveOddsWidget.tsx` | Real-time odds display |
| `NotificationCenter.tsx` | Alert notifications |
| `ExpertConsensus.tsx` | Expert consensus display |

### Environment Variables Required
```
ODDS_API_KEY                    # The Odds API key
NEXT_PUBLIC_SUPABASE_URL        # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY       # Supabase service role key
CRON_SECRET                     # Vercel cron authorization
PROGNOSTICATION_WEBHOOK_URL     # Syndication webhook
PROGNO_INTERNAL_API_KEY         # Internal API auth
API_SPORTS_KEY                  # API-Sports fallback (optional)
ROLLING_INSIGHTS_API_KEY        # Rolling Insights (optional)
```

---

## ALPHA-HUNTER — Full Architecture

### Stack & Deployment
- **Runtime:** Node.js/TypeScript (`tsx`), runs locally or as Windows service
- **Exchanges:** Kalshi (production, RSA-PSS auth), Coinbase Advanced Trade (JWT ES256)
- **AI:** Claude (Anthropic API) for market analysis
- **Database:** Supabase for memory/learning
- **Notifications:** Sinch SMS

### Entry Points (7 separate bots/scripts)

| Script | Purpose | Stake |
|--------|---------|-------|
| `index.ts` | Main scheduler (cron: 6am/9am/12pm/5pm/10pm) | varies |
| `progno-kalshi-executor.ts` | Auto-execute Progno sports picks on Kalshi | $5/pick |
| `kalshi-auto-trader.ts` | Non-sports Kalshi (crypto/politics/weather/fed) | $5 max |
| `daily-hunter.ts` | Daily orchestrator ($250/day target) | up to $50 |
| `crypto-trainer.ts` (46KB) | Main Coinbase trading bot | varies |
| `kalshi-live-trader.ts` (22KB) | Continuous Kalshi trading | $2 max |
| `cevict-flex-kalshi-bot.ts` | Cevict Flex picks → Kalshi execution | varies |

### Core Intelligence (31 files in src/intelligence/)

| File | Size | Purpose |
|------|------|---------|
| `kalshi-trader.ts` | 39KB | Kalshi API client (auth, markets, orders, balance, positions) |
| `category-learners.ts` | 37KB | Per-category learning models |
| `historical-knowledge.ts` | 28KB | Historical pattern database |
| `entertainment-expert.ts` | 28KB | Entertainment market analysis |
| `polymarket-trader.ts` | 25KB | Polymarket integration |
| `probability-bridge.ts` | 21KB | Progno ↔ Kalshi probability mapping |
| `progno-integration.ts` | 16KB | Fetches Progno picks, arb detection, Kelly sizing |
| `EliteTeamMatcher.ts` | 7KB | Advanced team name matching for Kalshi |
| `sport-config.ts` | 5KB | Sport-specific configuration |

### Data Flow (Sports)

```
Progno daily-predictions cron
    → Supabase Storage: predictions-YYYY-MM-DD.json
    ↓
progno-kalshi-executor.ts
    → watches for new file OR fetches from Supabase Storage
    → matches picks to Kalshi sports markets (GAME_SERIES tickers)
    → determineSide() → buyContracts()
    → logs results, tracks executed IDs in progno-executor-executed.json
```

### Data Flow (Non-Sports)

```
kalshi-auto-trader.ts
    → fetches Kalshi markets by category (crypto/politics/economics/weather/fed)
    → Claude AI analyzes each market → edge calculation
    → buy if edge > 3%

kalshi-live-trader.ts
    → continuous trading loop with $2 max per trade
```

### Fund Allocation
**60% Kalshi / 30% Crypto / 10% Reserve** (configured in `fund-manager.ts`)

### Safety Stack

| Guard | Location | Protection |
|-------|----------|------------|
| Balance check | `progno-kalshi-executor.ts` | Abort if `balance < 2 × stake`, cap picks by balance |
| $2 max trade | `kalshi-trader.ts` | Per-order limit |
| $5 max bet | `kalshi-auto-trader.ts` | CONFIG.maxBetSize |
| Daily loss limit | `trade-safety.ts` | $100 max daily loss |
| Duplicate prevention | `trade-safety.ts` | In-memory position tracking |
| 5-min cooldown | `trade-safety.ts` | Per-ticker cooldown |
| Rate limiting | `kalshi-trader.ts` | 8 req/sec (Kalshi Basic: 10) |
| 14-day expiry filter | `kalshi-trader.ts` | No long-term bets |
| URL validation | `execution-gate.ts` | Only Kalshi prod/demo origins |
| Unknown side skip | `progno-kalshi-executor.ts` | Skip pick if ABBREV_MAP has no entry |
| Stopword filter | `progno-kalshi-executor.ts` | Prevents false market matches on common words |

### Log Files (all at alpha-hunter root)
- `progno-executor.log` — from `progno-kalshi-executor.ts` appendFileSync
- `bot-output.log` (272KB) — from shell redirect
- `trades.log` (625KB) — from shell redirect
- `startup-output.log` (5KB) — from shell redirect

### Environment Variables Required
```
KALSHI_API_KEY_ID               # Kalshi API key ID
KALSHI_PRIVATE_KEY              # RSA private key (inline)
KALSHI_PRIVATE_KEY_PATH         # OR path to .key file
ANTHROPIC_API_KEY               # Claude AI
SUPABASE_URL                    # Supabase project URL
SUPABASE_KEY                    # Supabase service key
SINCH_SERVICE_PLAN_ID           # SMS alerts
SINCH_API_TOKEN                 # SMS alerts
MY_PERSONAL_NUMBER              # Phone for alerts
ALPHA_TIMEZONE                  # e.g. America/Chicago
DAILY_PROFIT_TARGET             # Default: 250
MAX_DAILY_LOSS                  # Default: 100
MAX_SINGLE_TRADE                # Default: 50
AUTO_EXECUTE                    # true/false
PROGNO_SPORTS_ONLY              # 1 to restrict to sports only (default: all sources)
COINBASE_API_KEY                # Coinbase CDP key
COINBASE_API_SECRET             # Coinbase CDP secret
```

---

## Bugs Fixed (This Audit Session — 9 total)

### Critical (4)

| # | App | Bug | Fix | File |
|---|-----|-----|-----|------|
| C1 | Progno | DST bug — hardcoded UTC-6 wrong during CDT | `Intl.DateTimeFormat` with `America/Chicago` | `daily-predictions/route.ts` |
| C2 | Progno | Early-lines reading from filesystem (always empty on Vercel) | `loadPicksFromStorage()` downloads from Supabase Storage | `early-lines/analysis/route.ts` |
| C4 | Alpha | Executor has no balance guard — could spend $60+ with $8 balance | Abort if `balance < 2×stake`, cap picks to `floor(balance/stake)` | `progno-kalshi-executor.ts` |
| C6 | Alpha | `lastFile` not reset on `run()` error — double-execution | Snapshot `attemptedFile` before try, advance on catch | `progno-kalshi-executor.ts` |

### Medium (5)

| # | App | Bug | Fix | File |
|---|-----|-----|-----|------|
| M1 | Progno | `predictionCache` rebuilt on every render | `useRef(new Map())` | `page.tsx` |
| M2 | Progno | `loadTodayBestBets` reads empty `games` after `setGames([])` | Pass `sourceGames` parameter | `page.tsx` |
| M4 | Progno | Cron collision — results-retry and predictions both at `30 13` | Stagger retry to `15 13` | `vercel.json` |
| M5 | Alpha | `determineSide()` silently defaults to NO for unknown tickers | Return `null`, skip pick | `progno-kalshi-executor.ts` |
| M6 | Alpha | `matchPickToMarket` false matches on 4-char common words | Stopword set (state, city, york, etc.) | `progno-kalshi-executor.ts` |

### Verified Not Bugs (3)

| # | Original Concern | Finding |
|---|-----------------|---------|
| C3 | `team-matcher` import path broken | Resolves correctly to `app/lib/team-matcher.ts` |
| C5 | `executed.json` IDs skip on matchup recurrence | `game_id` includes `commence_time` — already date-scoped |
| M3 | CBB sport key `baseball_ncaa` wrong | Confirmed correct per The Odds API docs |

## Bugs Fixed (Previous Audit Session — 11 total)

| # | File | Bug | Fix |
|---|------|-----|-----|
| 1 | `index.ts` | Dead code accessing `global.alphaHunterInstance` | Removed |
| 2 | `progno-integration.ts` | Arbitrage logic didn't distinguish home/away per book | Fixed to extract homeML/awayML |
| 3 | `daily-hunter.ts` | Hardcoded limit order price=50¢ | Parse from opportunity string |
| 4 | `probability-bridge.ts` | Women's basketball prefix matched men's picks | Replaced with correct prefixes |
| 5 | `progno-kalshi-executor.ts` | Missing GAME_SERIES prefixes | Added 7 more entries |
| 6 | `progno-kalshi-executor.ts` | `normSport()` didn't map "NCAA" → "NCAAB" | Fixed |
| 7 | `progno-kalshi-executor.ts` | `todayDateStr()` DST bug | `Intl.DateTimeFormat` with configurable timezone |
| 8 | `index.ts` | `sendDailySummary()` hardcoded wins=0, losses=0 | Read from `getPerformanceStats()` |
| 9 | `fund-manager.ts` | `releaseFunds()` always credited crypto | Check platform before crediting |
| 10 | `kalshi-trader.ts` | `getBalance()` returned 500 on auth error (looks like $500) | Changed to -1 |
| 11 | `probability-bridge.ts` | `safeNormalizeLeague` TDZ hack | Simplified (function declaration hoists) |

## Bugs Fixed (Coinbase/Crypto Session — 4 total)

| # | File | Bug | Fix |
|---|------|-----|-----|
| 1 | `crypto-trader.ts` | `detectTrend()`/`detectBreakout()` used `Math.random()` | Disabled random signals |
| 2 | `exchange-manager.ts` | `marketSell` got USD amount instead of crypto quantity | Convert USD→crypto via price |
| 3 | `crypto-trainer.ts` | Double-counted buy fee in PnL | Recover gross entry value |
| 4 | `coinbase.ts` | `transformOrder` mapped success→'pending' not 'FILLED' | Fixed status mapping |

---

## Remaining Known Issues (Fixed This Session)

All previously-known remaining issues have been addressed:

1. ~~`loadPreviousSnapshot()` always returns null~~ → **FIXED** — now loads from Supabase `historical_odds`
2. ~~track-odds missing CBB~~ → **FIXED** — added `baseball_ncaa` to sports list
3. ~~Fund allocation 40/50/10~~ → **FIXED** — updated to 60/30/10 (Kalshi/Crypto/Reserve)
4. ~~`kalshi-auto-trader.ts` dotenv override~~ → **FIXED** — removed bare `dotenv.config()` call
5. ~~`progno-integration.ts` arb logic single endpoint~~ → **FIXED** — returns empty instead of fake arb
6. ~~`kalshi-auto-trader.ts` `analyzePolitics()` uses `Math.random()`~~ → **FIXED** — returns market price (no edge, pass)
7. ~~`PROGNO_SPORTS_ONLY` defaults to true (blocks all non-sports sources)~~ → **FIXED** — now requires explicit `=1` to restrict

## Architecture Notes

### Kalshi Auth (both clients)
- Format: `ts + METHOD + pathWithoutQuery`
- Algorithm: RSA-PSS with SHA-256, SALTLEN_DIGEST
- Rate limit: 8 req/sec (Kalshi Basic allows 10)

### Two Kalshi Clients
- `kalshi-trader.ts` (`KalshiTrader` class) — used by index.ts, daily-hunter, kalshi-auto-trader. $2 max trade.
- `progno-kalshi-executor.ts` (`KalshiClient` class) — standalone executor. $5/pick with balance guard.
- Both share the same auth pattern but are separate implementations.

### ESPN Integration
- Scores: `site.api.espn.com/apis/site/v2/sports/{sport}/scoreboard`
- No API key required, no quota
- Used for: wallboard, daily-results grading, espn-scores endpoint

### Prognostication Syndication
- Picks are syndicated via webhook to Prognostication (www.prognostication.com)
- 3 tiers: free (basic picks), premium (detailed analysis), elite (full data)
- Tier assignment via `tier-assignment-service.ts`
