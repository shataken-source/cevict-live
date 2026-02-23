# Alpha-Hunter Audit Report
**Date:** 2026-02-22
**Scope:** Full system — Kalshi, Polymarket, Progno integration, data flow, env config

---

## System Health: 92% ✅

| Component | Status | Notes |
|---|---|---|
| Kalshi auth (executor) | ✅ Working | RSA-PSS, production enabled |
| Kalshi auth (kalshi-trader.ts) | ✅ Working | RSA-PSS, rate-limited |
| Kalshi auth (order-manager.ts) | ✅ Working | RSA-PSS (was HMAC — fixed in prior session) |
| Progno → Kalshi executor | ✅ Working | File-watch + one-shot modes |
| series_ticker market fetch | ✅ Fixed | Falls back to broad fetch if series_ticker returns 0 |
| PROGNO_DIR path | ✅ Fixed | Now checks `.progno/` subdir first |
| prognostication-sync.ts URL | ✅ Fixed | Was `localhost:3005`, now `prognostication.com` |
| prognostication-sync.ts endpoint | ✅ Fixed | Was `/api/kalshi/picks` (non-existent), now `/api/webhooks/progno` |
| PROGNOSTICATION_URL env var | ✅ Fixed | Added to `.env.local` + `env.manifest.json` |
| PROGNO_INTERNAL_API_KEY env var | ✅ Fixed | Added to `.env.local` + `env.manifest.json` |
| Polymarket trading | ⚠️ Read-only | No wallet keys configured — intentional |
| order-manager.ts base URL | ✅ Fixed | `https://api.elections.kalshi.com` (no double path) |

---

## Architecture

```
src/index.ts  (AlphaHunter scheduler — cron-based)
  ├─ 6:00 AM  → runDailyScan()     → AIBrain.analyzeAllSources()
  ├─ 9:00 AM  → runDailyHunt()     → daily-hunter.ts
  ├─ 12:00 PM → checkProgress()    → P&L vs daily target
  ├─ 5:00 PM  → runSportsScan()    → PrognoIntegration picks + arbitrage
  └─ 10:00 PM → sendDailySummary() → SMS via Sinch

src/progno-kalshi-executor.ts   ← PRIMARY LIVE EXECUTOR
  ├─ Reads predictions-YYYY-MM-DD.json from apps/progno/.progno/
  ├─ Sells positions expiring >14 days
  ├─ Fetches sports markets (series_ticker → broad fallback)
  └─ Places $5 limit orders per pick (RSA-PSS signed)

src/find-best-kalshi.ts         ← ANALYSIS / OPPORTUNITY SCANNER
  ├─ Fetches Progno picks from localhost:3008/api/picks/today
  ├─ Fetches 10k+ Kalshi markets (cursor pagination)
  └─ Surfaces best EV opportunities (no execution)

src/intelligence/
  ├─ kalshi-trader.ts           → Full Kalshi client (production, RSA-PSS)
  ├─ polymarket-trader.ts       → Polymarket read-only (no wallet keys)
  ├─ probability-bridge.ts      → Progno ↔ Kalshi probability matching
  ├─ arbitrage-detector.ts      → Edge calculation (min 3% edge)
  └─ prognostication-sync.ts    → Pushes Kalshi picks to Prognostication webhook
```

---

## Data Flow

```
Progno engine
  └─ run-progno-today.ts
       └─ writes predictions-YYYY-MM-DD.json
            ├─ to Supabase Storage (primary)
            └─ to apps/progno/.progno/ (local, for executor)

progno-kalshi-executor.ts (watches .progno/ dir)
  └─ on new file:
       ├─ sell long-term positions (>14d)
       ├─ fetch Kalshi sports markets
       └─ place $5 limit orders per matched pick

prognostication-sync.ts (runs after analysis cycles)
  └─ POST high-confidence picks → prognostication.com/api/webhooks/progno
       └─ stored in syndicated_picks table (rdbuwyefbgnbuhmjrizo)
```

---

## Daily Workflow Commands

```powershell
# From apps/progno — full pipeline
npm run syndicate:execute        # syndicate to Prognostication + execute on Kalshi
npm run syndicate:execute:dry    # dry run both

# Individual steps
npm run syndicate                # push picks to Prognostication only
npm run --prefix ../alpha-hunter execute      # execute on Kalshi only
npm run --prefix ../alpha-hunter execute:dry  # dry run Kalshi execution

# Analysis (no execution)
npm run --prefix ../alpha-hunter best-kalshi  # requires Progno on localhost:3008
```

---

## Environment Variables

### alpha-hunter `.env.local`

| Key | Status | Value |
|---|---|---|
| `KALSHI_API_KEY_ID` | ✅ | `ec529133-...` |
| `KALSHI_ENV` | ✅ | `production` |
| `KALSHI_PRIVATE_KEY_PATH` | ✅ | `C:\Cevict_Vault\kalshi_private.pem` |
| `PROGNO_BASE_URL` | ✅ | `http://localhost:3008` |
| `PROGNOSTICATION_URL` | ✅ | `https://prognostication.com` |
| `PROGNO_INTERNAL_API_KEY` | ✅ | `progno-internal-^J8X...` |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | `https://rdbuwyefbgnbuhmjrizo.supabase.co` |
| `POLYMARKET_API_KEY` | ❌ | Not configured (read-only mode) |
| `POLYMARKET_WALLET` | ❌ | Not configured (read-only mode) |
| `POLYMARKET_PRIVATE_KEY` | ❌ | Not configured (read-only mode) |

---

## Kalshi Market Matching

The executor uses two strategies to match Progno picks to Kalshi markets:

1. **Ticker suffix → keyword map** (`ABBREV_MAP`) — e.g. `NYK` → `['knicks', 'new york k']`
2. **Title word overlap** — requires ≥2 words from pick name in market title

Series tickers used:
- `KXNBAGAME` → NBA
- `KXNCAABGAME` → NCAAB
- `KXNFLGAME` → NFL
- `KXNHLGAME` → NHL
- `KXMLBGAME` → MLB
- `KXNCAAFGAME` → NCAAF

**Known issue:** Some winner markets don't appear until closer to game time. The executor will skip unmatched picks and log them.

---

## Polymarket Status

Read-only market discovery via Gamma API (public, no auth). Trading requires:
- `POLYMARKET_WALLET` — Ethereum wallet address
- `POLYMARKET_PRIVATE_KEY` — Wallet private key for signing CLOB orders
- `POLYMARKET_API_KEY` — CLOB API key

Not configured intentionally. Add to KeyVault when ready to enable.

---

## Files Changed in This Session

| File | Change |
|---|---|
| `src/progno-kalshi-executor.ts` | Fixed `PROGNO_DIR` to check `.progno/` subdir; added broad fetch fallback for `series_ticker` |
| `src/intelligence/prognostication-sync.ts` | Fixed URL default; fixed API endpoint to `/api/webhooks/progno`; fixed auth header |
| `env.manifest.json` | Added `PROGNOSTICATION_URL` and `PROGNO_INTERNAL_API_KEY` |
| `.env.local` | Synced via KeyVault — both new vars present |
| `package.json` | Added `execute`, `execute:dry`, `execute:watch` scripts |
| `apps/progno/package.json` | Added `syndicate:execute` and `syndicate:execute:dry` pipeline scripts |
