# Progno — Debug cheatsheet

**Use this when you're debugging what we originally built.** Don't change this file much; it's a pointer to where things live and how to test.

---

## What we built (original flow)

1. **Cevict Flex pipeline** — One engine for "today's picks": Odds API → consensus odds → 7D + Monte Carlo + value → top picks, max 3 per sport. No separate "simple" model for single-game.
2. **Single-game = same engine** — v2 `?action=prediction&gameId=...` and get-predictions.ps1 use the same Cevict Flex logic via `getSingleGamePick` (no more `predictGameWithEnrichment` for that).
3. **Keys at runtime** — Odds API key from `getPrimaryKey()` (env or `.progno/keys.json`). No throw at import in OddsService; live odds use real key, not placeholder.
4. **Cron** — `daily-predictions` (8 AM) writes `predictions-YYYY-MM-DD.json`; `daily-results` (midnight) grades yesterday and writes `results-YYYY-MM-DD.json`. Both accept `Authorization: Bearer CRON_SECRET` or Vercel cron header.
5. **Viewer / Arb** — CevictPicksViewer loads predictions/results from the Progno folder. CevictArbTool can use Progno's `/api/arb-proxy` so the key stays on the server.

---

## Key files (where to look when debugging)

| What you're debugging | File(s) |
|------------------------|--------|
| Today's picks (Cevict Flex) | `app/api/picks/today/route.ts` |
| Single-game prediction (v2) | `app/api/progno/v2/route.ts` → calls `getSingleGamePick` from picks/today |
| Odds / games | `lib/odds-service.ts` (key via `getPrimaryKey()` from app/keys-store) |
| Where the key comes from | `app/keys-store.ts` (.progno/keys.json, ODDS_API_KEY, NEXT_PUBLIC_ODDS_API_KEY) |
| Live odds | `app/live-odds-fetcher.ts` (uses getPrimaryKey) |
| Daily predictions cron | `app/api/cron/daily-predictions/route.ts` |
| Daily results cron | `app/api/cron/daily-results/route.ts` |
| Arb proxy (for Cevict Arb Tool) | `app/api/arb-proxy/route.ts` |
| EV / value detection / odds sanitization | `app/lib/monte-carlo-engine.ts` (calculateEV, sanitizeAmericanOdds), `app/api/picks/today/route.ts` (sanitizeAmericanOdds before gameData) |

---

## Data correctness (EV, edge, odds)

- **EV (expected_value / value_bet_ev):** Expected profit in **dollars per $100 bet** (American odds). Formula: `P(win)×profit_if_win − P(lose)×100`. Rounded to 2 decimals. Subscribers can interpret it as "on average, this bet returns $X profit per $100 wagered."
- **Edge %:** Model win probability minus market implied probability (percentage points). Positive = value.
- **Odds:** American format. Consensus odds are sanitized (e.g. -2 or +2 → ±110) before edge/EV are computed so bad data from the books doesn't produce absurd EVs. The API response includes a `metrics_guide` object that documents these.

---

## How to run

```bash
cd apps/progno
npm run dev
```

Serves at **http://localhost:3008**.

---

## Quick test URLs (no script)

- **Today's picks (Cevict Flex):**
  `http://localhost:3008/api/picks/today`
- **v2 games:**
  `http://localhost:3008/api/progno/v2?action=games`
- **v2 single-game prediction (need a real gameId from games):**
  `http://localhost:3008/api/progno/v2?action=prediction&gameId=...`
  Optional: `&sport=nfl` (or nba, nhl, mlb, etc.) so it doesn't hit all 6 sports.
- **Cron daily predictions (manual run):**
  `GET http://localhost:3008/api/cron/daily-predictions`
  (Header: `Authorization: Bearer YOUR_CRON_SECRET` if CRON_SECRET is set)
- **Cron daily results:**
  `GET http://localhost:3008/api/cron/daily-results`
  (Same auth. Use `?date=YYYY-MM-DD` to grade a specific day.)

---

## Common failure points

1. **"Odds API key not set"**
   Key is read at request time from `getPrimaryKey()` (see `app/keys-store.ts`). Set `ODDS_API_KEY` in `.env.local` or add key to `.progno/keys.json`. Don't rely on a throw at startup.

2. **v2 prediction returns something that doesn't match picks/today**
   v2 prediction should call `getSingleGamePick` in `app/api/picks/today/route.ts`. If it still uses `predictGameWithEnrichment`, that's the old path; search for `getSingleGamePick` in `app/api/progno/v2/route.ts` and make sure the prediction branch uses it.

3. **Cron returns 401**
   If `CRON_SECRET` is set, send `Authorization: Bearer <CRON_SECRET>`. Vercel cron sends `x-vercel-cron: 1` and is allowed without that header.

4. **No picks / empty response from picks/today**
   Check Odds API key and that The Odds API returns games for the regions you use. Check `lib/odds-service.ts` and any filters (sport, region) in `app/api/picks/today/route.ts`.

5. **Two different "pick" pipelines**
   Cevict Flex = `/api/picks/today` (and v2 prediction). There is also `/api/cron/generate-picks` (different pipeline, API-Sports, Supabase). For "what we built," use picks/today and daily-predictions cron; treat generate-picks as alternate/legacy unless you intentionally use it.

---

## Prognostication.com (marketing site + picks UI)

**App:** `apps/prognostication`. Marketing site, free/premium/elite picks, Kalshi picks from Supabase, Stripe checkout. Picks come from **Progno** via `PROGNO_BASE_URL`.

### How to run (local)

```bash
cd apps/prognostication
npm run dev
```

Typical port **3005** (or Next.js default 3000). Ensure **Progno** is running (e.g. `apps/progno` on 3008) so picks load.

### Env (prognostication)

| Key | Purpose |
|-----|--------|
| `PROGNO_BASE_URL` | Progno API base (e.g. `http://localhost:3008` or `https://your-progno.vercel.app`). **Required** for live picks. |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Kalshi picks, trades, stats, admin. |
| `STRIPE_SECRET_KEY` | Checkout and tier (free/pro/elite). |
| `NEXT_PUBLIC_SITE_URL` | Site URL in links/SMS (e.g. `https://prognostication.com`). |

Full list: `apps/prognostication/ENV-KEYS-REFERENCE.md`.

### Data flow (picks)

1. User hits **prognostication** `/picks`, `/free-picks`, or `/api/picks/today` (with optional tier params).
2. Prognostication **`/api/picks/today`** calls **Progno** `GET {PROGNO_BASE_URL}/api/picks/today`, then allocates picks to free/pro/elite tiers.
3. If `PROGNO_BASE_URL` is unset or Progno is down, picks/today can fall back to empty or cached; check logs for "PROGNO picks/today fetch failed".

### Key files (prognostication)

| What you're debugging | File(s) |
|------------------------|--------|
| Picks proxy + tier allocation | `app/api/picks/today/route.ts` |
| Progno single-game (elite fine-tuner, etc.) | Calls `{PROGNO_BASE_URL}/api/progno/v2?action=prediction&gameId=...` |
| Games list (elite-bets) | `app/api/progno/v2` proxy or direct Progno v2 games |
| Homepage / marketing | `app/page.tsx`, `app/picks/page.tsx` |
| Kalshi picks / trades | `app/api/kalshi/picks/route.ts`, `app/api/trades/kalshi/route.ts` (Supabase) |
| SMS (daily best bet, etc.) | `app/api/sms/*` (uses PROGNO_BASE_URL for picks) |

### Quick test (once Prognostication is live)

- **Homepage:** `https://prognostication.com` (or localhost)
- **Picks (tiered):** `https://prognostication.com/api/picks/today` (optional: `?email=...` or `?session_id=...` for pro/elite)
- **Free picks page:** `https://prognostication.com/free-picks`
- **Progno connectivity:** If picks are empty, confirm `PROGNO_BASE_URL` is set in Vercel (or .env.local) and points at a running Progno (e.g. Progno on Vercel or local 3008).

### Vercel (prognostication.com)

- **Project:** Same repo; Vercel project for `apps/prognostication` (or monorepo with that root).
- **Functions:** If you re-enable Vercel (e.g. after payment), serverless functions for `/api/*` will resume; cron and external calls (to Progno) depend on Progno's URL and availability.
- After functions are back, hit `/api/picks/today` and a picks page; if you see picks, Progno → Prognostication flow is working.

---

## Full audit and flow

- **Brutal audit (priorities, what's done, TODOs):** `PROGNO-BRUTAL-AUDIT.md` in this folder.
- **What to run first (Progno + Prognostication + Alpha-Hunter):** repo root `PROGNO-PROGNOSTICATION-KALSHI-FOR-DUMMIES.md`.
- **Cron schedule (Vercel / Task Scheduler):** `CRON-SCHEDULE.md` in this folder.
