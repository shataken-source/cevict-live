# Alpha-Hunter — Simple (Sports Only) Setup

Patched to run with **only Progno sports picks**. No news/Kalshi scan/crypto/arb in the main flow.

## 1. Supabase: run migration 002

In the **same** Supabase project you use for Prognostication, run the SQL from:

**`apps/prognostication/supabase/migrations/002_alpha_hunter_and_bot_config.sql`**

This creates `alpha_hunter_accounts`, `alpha_hunter_transactions`, `alpha_hunter_trades`, and `bot_config` so fund-manager and health check don’t fail.

**If `bot_config` already exists with columns `config_key` / `config_value`** (and 002's INSERT failed with "column key does not exist"), run this in the Supabase SQL editor:

```sql
INSERT INTO bot_config (config_key, config_value)
VALUES ('health_check', '{}'::jsonb)
ON CONFLICT (config_key) DO NOTHING;
```

Then re-run the full 002 migration; the INSERT will no-op. No renames or drops needed.

## 2. Env (alpha-hunter)

In `apps/alpha-hunter/.env.local` (or `.env`):

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service role key
- `PROGNO_BASE_URL` — e.g. `http://localhost:3008` (Progno app)

Optional: `ANTHROPIC_API_KEY` (for Claude ranking), Sinch for SMS, Kalshi keys for `best-kalshi`.

**Sports-only is default.** To turn on news/Kalshi/crypto/arb again, set `PROGNO_SPORTS_ONLY=0`.

## 3. Run

**Terminal 1 — Progno (so picks exist):**

```bash
cd apps/progno && npm run dev
```

**Terminal 2 — Alpha-Hunter:**

```bash
cd apps/alpha-hunter
npm install
npm run health        # Supabase + Kalshi check (optional Kalshi)
npm start scan        # One-off: fetch Progno picks, rank, suggest
# or
npm start run         # Scheduler (6am/9am/12pm/5pm/10pm/midnight)
```

- **Scan:** Fetches today’s picks from Progno, filters by confidence/EV, ranks (Claude if key set), logs top opportunity and can send SMS.
- **Best Kalshi (separate):** `npm run best-kalshi` — matches those Progno picks to Kalshi markets and prints top EV (requires Progno running).

## 4. Commands (simple)

| Command | What it does |
|--------|----------------|
| `npm run health` | Check Supabase (and Kalshi if configured) |
| `npm start scan` | One-off scan: Progno sports only → suggest |
| `npm start run` | Start scheduler (sports-only scans on the clock) |
| `npm start status` | Show balance and stats |
| `npm run best-kalshi` | Progno picks → Kalshi markets (run Progno first) |

Fund-manager starts with zero balance (in-memory). Use `npm start deposit 100` to add funds if you use that tracking.
