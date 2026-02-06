# Progno, Prognostication & Kalshi — For Dummies

What to run first, what runs anytime, and what you can run manually. Same Supabase project for all three.

---

## The three pieces (one sentence each)

| Thing | What it is |
|-------|------------|
| **Progno** | Sports picks engine (Cevict Flex). Runs on port **3008**. Produces today’s picks and optional daily prediction/result JSON files. |
| **Prognostication** | Marketing site + Kalshi UI. Runs on port **3005**. Shows free/premium picks (from Progno), Kalshi picks (from Supabase), trades, and live stats. |
| **Alpha-Hunter** | CLI bot. Finds Kalshi opportunities, writes predictions to Supabase, can place trades. No web server. |

---

## What to run first (order matters when you care about data)

1. **Supabase**
   Already set up. Same project for Progno, Prognostication, and Alpha-Hunter. Tables: `bot_predictions`, `trade_history`, `bot_metrics`, `bot_learnings`, and for Alpha-Hunter: `alpha_hunter_accounts`, `alpha_hunter_transactions`, `alpha_hunter_trades`, `bot_config`. Run **`apps/prognostication/supabase/migrations/001_kalshi_bot_tables.sql`** then **`002_alpha_hunter_and_bot_config.sql`**. If `bot_config` already exists with `config_key`/`config_value` and the 002 INSERT fails, run in SQL editor: `INSERT INTO bot_config (config_key, config_value) VALUES ('health_check', '{}'::jsonb) ON CONFLICT (config_key) DO NOTHING;`

2. **Progno** (if you want real sports picks on Prognostication)
   ```bash
   cd apps/progno
   npm run dev
   ```
   Serves at **http://localhost:3008**.
   Needs in `.env.local`: `ODDS_API_KEY` (The Odds API), optional Supabase if you want to cache picks.

3. **Prognostication** (the site you show people)
   ```bash
   cd apps/prognostication
   npm run dev
   ```
   Serves at **http://localhost:3005**.
   Needs in `.env.local`: `PROGNO_BASE_URL=http://localhost:3008`, Supabase URL + `SUPABASE_SERVICE_ROLE_KEY` for Kalshi picks/trades/stats.

4. **Alpha-Hunter** (only when you want bot predictions or “best Kalshi” scans)
   Run after Progno is up if you use Progno picks.
   ```bash
   cd apps/alpha-hunter
   npm run best-kalshi    # one-off: match Progno picks to Kalshi markets
   # or
   pnpm start run        # scheduler: scans, trades, SMS on a schedule
   ```
   Needs its own `.env` / `.env.local`: Supabase, Kalshi API keys, optional `PROGNO_BASE_URL`, etc.

**TL;DR:** Start **Progno** then **Prognostication** for the website. Start **Alpha-Hunter** only when you want bot/trading stuff.

---

## What can run anytime (no strict order)

- **Prognostication** — Works alone. Without Progno it shows no sports picks (or “no picks yet”). Without Supabase it shows no Kalshi picks and no trades (empty lists / zeros).
- **Progno** — Works alone. You can hit **http://localhost:3008/api/picks/today** anytime. Cron (below) is optional.
- **Alpha-Hunter** — Any script can run whenever. `best-kalshi` is more useful when Progno is running so it can fetch `/api/picks/today`.

---

## What can be run manually (no scheduler)

### Progno

| What | How |
|------|-----|
| Today’s picks (API) | Open **http://localhost:3008/api/picks/today** in browser or `curl`. |
| Generate today’s prediction file | `GET http://localhost:3008/api/cron/daily-predictions` (optional: `Authorization: Bearer YOUR_CRON_SECRET`). Writes `predictions-YYYY-MM-DD.json` in progno root. |
| Grade yesterday’s results | `GET http://localhost:3008/api/cron/daily-results` (same auth). Reads predictions for yesterday, fetches scores, writes `results-YYYY-MM-DD.json`. |

### Prognostication

| What | How |
|------|-----|
| Homepage | **http://localhost:3005** — trades + live stats from Supabase. |
| Free picks | **http://localhost:3005/free-picks** — from Progno via `/api/picks/today`. |
| Kalshi picks page | **http://localhost:3005/picks** — from Supabase `bot_predictions`. |
| Premium / pricing | **http://localhost:3005/premium-picks**, **http://localhost:3005/pricing**. |

### Alpha-Hunter

| What | How |
|------|-----|
| Best Kalshi (Progno → Kalshi) | `npm run best-kalshi` or `npm run find-best` (Progno should be running). |
| One-off scan | `pnpm start scan` or `pnpm start sports`. |
| Health check | `pnpm run health` (Supabase + Kalshi). |
| Fetch Progno picks only | `npm run progno-picks`. |
| Sandbox autopilot | `npm run kalshi:sandbox`. |
| Category experts | `npm run entertainment`, `npm run history:politics`, etc. |

---

## Scheduled / automated (optional)

- **Progno cron**
  - **8:00 AM** (or your chosen time): call `/api/cron/daily-predictions` so you get `predictions-YYYY-MM-DD.json` every day.
  - **12:00 AM**: call `/api/cron/daily-results` to grade the previous day.
  Use Windows Task Scheduler, Vercel Cron, or any cron; see **apps/progno/CRON-SCHEDULE.md**.

- **Alpha-Hunter scheduler**
  `pnpm start run` runs a 24/7 schedule (morning scan, main hunt, sports, summary, etc.). Only run this when you want the bot to run on its own.

---

## Ports and URLs (quick ref)

| App | Port | Base URL |
|-----|------|----------|
| Progno | 3008 | http://localhost:3008 |
| Prognostication | 3005 | http://localhost:3005 |

Prognostication’s `PROGNO_BASE_URL` should be `http://localhost:3008` when running Progno locally.

---

## Env keys (minimal)

- **Progno**: `ODDS_API_KEY` (required for picks). Optional: Supabase, `CRON_SECRET`, Sinch (SMS), Open Weather. See **apps/progno/.env.example**.
- **Prognostication**: `PROGNO_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Optional: Stripe, `NEXT_PUBLIC_KALSHI_REFERRAL_CODE`. See **apps/prognostication/ENV-KEYS-REFERENCE.md**.
- **Alpha-Hunter**: Supabase, Kalshi API (key ID + private key or path). Optional: `PROGNO_BASE_URL`, `BOT_API_KEY`, Sinch. See **apps/alpha-hunter/.env.example**.

---

## kalshi-dash & Praxis

**Not in this repo.** Searched `cevict-live` for `kalshi-dash`, `praxis` — no matches. If they live in another folder (e.g. Desktop, different repo), tell me the path and I can compare them to this setup and suggest how they fit or what to run first.

---

## One-line “I just want to see the site”

```bash
# Terminal 1
cd apps/progno && npm run dev

# Terminal 2
cd apps/prognostication && npm run dev
```

Then open **http://localhost:3005**. Free picks and homepage will use Progno + Supabase when keys and DB are set.
