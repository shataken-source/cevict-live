# Alpha-Hunter Audit

**TL;DR:** Yes, it can be saved. The core is solid (Kalshi + Progno integration, Supabase writes for predictions/trades, scheduler). The pain is **two competing database schemas**, **fund-manager never loading from DB**, **one broken import**, and **too many entry points** built in parallel. Fix the schema and hydration, then treat a handful of scripts as “supported” and the rest as experimental.

---

## What’s in the repo

- **50+ npm scripts** across Kalshi, crypto, sports, “experts,” training, and reporting.
- **Two persistence layers:** `fund-manager` + `performance-metrics` use **alpha_hunter_*** tables; **supabase-memory** (and settlement-worker, sandbox, etc.) use **bot_predictions**, **trade_history**, **bot_metrics**, **bot_learnings**, **bot_config**, **bot_strategy_params**.
- **Main entry:** `index.ts` → scheduler (6am scan, 9am hunt, 12pm check, 5pm sports, 10pm summary, midnight reset) or one-off commands (scan, sports, status, deposit, withdraw).

---

## Critical issues

### 1. Two database schemas, one Supabase project

| Used by | Tables |
|--------|--------|
| **fund-manager**, **performance-metrics** | `alpha_hunter_accounts`, `alpha_hunter_transactions`, `alpha_hunter_trades` |
| **supabase-memory**, settlement-worker, sandbox, health check | `bot_predictions`, `trade_history`, `bot_metrics`, `bot_learnings`, `bot_config`, `bot_strategy_params` |

The migration you ran for Prognostication only created the **bot_*** / **trade_history** set. It did **not** create:

- `alpha_hunter_accounts`
- `alpha_hunter_transactions`
- `alpha_hunter_trades`
- `bot_config` (health check does `from('bot_config').select('key').limit(1)`)

So today:

- **Fund-manager** with Supabase enabled will fail on deposit/withdraw/getOpenTrades/resetDailyCounters (table missing or wrong schema).
- **Health check** can fail if `bot_config` doesn’t exist.

**Fix:** Either run **alpha-hunter’s** `supabase-schema.sql` in the same Supabase project (adds `alpha_hunter_*` and any missing tables), or add a small migration that creates `bot_config` and the alpha_hunter_* tables. Then you have one project with both worlds. Longer term, unify on one set of tables (e.g. use `trade_history` for all trades and one `accounts` or config row for fund state).

### 2. Fund-manager never hydrates from Supabase

`getAccount()`, `getOpenTrades()`, and balance/PnL are derived from **in-memory** state only:

- `this.kalshiBalance` / `this.cryptoBalance` (set by `updateKalshiBalance` / `updateCryptoBalance`)
- `this.trades` (set by `recordTrade`)
- `this.allocatedFunds`

There is no `loadFromSupabase()` or equivalent on startup. So after a restart:

- Balance and open trades are zero/empty until something (e.g. Kalshi fetch or a manual deposit) updates them.
- Any persistence to `alpha_hunter_accounts` / `alpha_hunter_trades` is write-only for those code paths; reads never use DB.

**Fix:** Either:

- Add a startup step that loads `alpha_hunter_accounts` (e.g. `alpha_hunter_main`) and `alpha_hunter_trades` (status in `pending`/`active`) into the in-memory state, or
- Document that “fund-manager is in-memory only unless you run scripts that push to Supabase; restart = reset” and rely on Kalshi/Coinbase APIs for real balances when needed.

### 3. Broken dynamic import for daily hunt

```ts
// index.ts line 161
const { runDailyHunt: run } = await import('./daily-hunter.js');
```

The file is `daily-hunter.ts`. With `tsx` this often resolves, but the explicit `.js` can break in some setups. Prefer:

```ts
const { runDailyHunt: run } = await import('./daily-hunter');
```

(and ensure your runner resolves `.ts` to the same module).

### 4. Duplicate notions of “a trade”

- **fund-manager** records to `alpha_hunter_trades` (id, opportunity_id, type, platform, amount, target, entry_price, exit_price, status, profit, reasoning, executed_at, settled_at).
- **supabase-memory** and Kalshi/settlement code use **trade_history** (platform, trade_type, symbol, market_id, entry_price, amount, pnl, outcome, etc.).

So “record a trade” can mean two different tables and two shapes. Prognostication’s homepage reads **trade_history**; fund-manager and performance-metrics read **alpha_hunter_trades**. They won’t match unless you sync or unify.

**Fix:** Pick one source of truth. Easiest short term: have the scheduler / Kalshi execution path write to **trade_history** (and optionally to alpha_hunter_trades for backward compat), and treat trade_history as what the rest of the ecosystem (prognostication, stats) uses. Longer term, migrate fund-manager to read/write trade_history and deprecate alpha_hunter_trades.

---

## High priority (no schema change)

- **Health check:** If you don’t create `bot_config`, health will fail Supabase when it tries to select from it. Either add a migration that creates `bot_config` with a single row, or change health to a simpler check (e.g. `from('bot_predictions').select('id').limit(1)`) so it works with the migration you already ran.
- **News scanner:** `scanRSSFeed` uses `getSampleNews()` (stub); Twitter/Reddit return `[]` without real keys. So “analyze all sources” is mostly Progno + Kalshi + crypto + stub news. Either wire real RSS/API or document that news is placeholder.
- **Kalshi demo-only:** `assertKalshiDemoOnly()` in kalshi-trader blocks production. That’s intentional. When you want live trading, you’ll need to relax that in a controlled way (env flag, etc.).

---

## What’s in good shape

- **find-best-kalshi / find-best:** Clear flow: Progno picks → Kalshi markets → opportunities with optional Coinbase. Well-contained, works with your current Progno + Supabase setup.
- **KalshiTrader:** Rate limiting, PEM/env key loading, demo base URL, getMarkets, findOpportunities, findOpportunitiesWithExternalProbs. Substantial and usable.
- **supabase-memory:** saveBotPrediction, getBotPredictions, trade_history, bot_metrics, bot_learnings, bot_config. Aligned with Prognostication and the migration you ran.
- **Scheduler (index.ts):** Cron layout is clear; only the daily-hunt import and DB assumptions need the fixes above.
- **Execution gate:** Demo-only and URL checks are the right safety layer.

---

## Recommendation: “Save it” in three steps

### Step 1: One Supabase schema

- In the **same** Supabase project you use for Prognostication/Alpha-Hunter, run **alpha-hunter’s** `supabase-schema.sql` (or a trimmed version that only creates `alpha_hunter_accounts`, `alpha_hunter_transactions`, `alpha_hunter_trades`).
- Add a minimal **bot_config** table if missing (e.g. `key TEXT PRIMARY KEY, value JSONB`), and one row so health check’s `from('bot_config').select('key').limit(1)` succeeds.

Then:

- fund-manager stops failing on insert/update/select for alpha_hunter_*.
- health check passes when Supabase and keys are set.

### Step 2: Fix import and (optionally) hydrate

- Change `import('./daily-hunter.js')` to `import('./daily-hunter')`.
- Optionally: in fund-manager (or a small init module), on first use or startup, load `alpha_hunter_accounts` and open trades from `alpha_hunter_trades` into the in-memory state so restarts don’t start from zero. If you don’t need persistence across restarts, document current behavior instead.

### Step 3: Declare “supported” vs “experimental”

- **Supported (maintain and use):** e.g. `health`, `best-kalshi`, `find-best`, `progno-picks`, `kalshi:sandbox`, and the scheduler’s daily flow once Step 1–2 are done. These depend on Kalshi + Progno + Supabase and are the ones that align with Prognostication and your docs.
- **Experimental / use at your own risk:** The rest (crypto-trainer, microcap, entertainment, history:*, bot-manager, live 24-7, etc.). Keep the code but don’t assume every script is production-ready; fix when you actually use them.

---

## Can it be saved?

Yes. The core value (Kalshi + Progno, Supabase for predictions and trades, scheduler, best-kalshi) is there. The main problems are:

1. Schema split and missing tables for fund-manager and health.
2. Fund-manager not loading from DB.
3. One bad import.
4. Many scripts built in parallel without a single “blessed” path.

Fix 1–3 and narrow the surface to the 5–6 flows you care about; the rest can stay as-is until you need them. That’s a manageable path to “saved.”
