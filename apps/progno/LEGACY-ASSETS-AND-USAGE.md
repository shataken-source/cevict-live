# Legacy Assets and How to Use Them (Progno, Alpha Hunter, TrailerVegas)

This is a map of **high‑value pieces from the old monorepo** and how we’re using (or plan to use) them in the current `cevict-live` setup.

---

## 1. Claude Effect Data Collection (Progno)

**Where (current repo)**
- `lib/data-collection/collectors.ts` – `SentimentDataCollector`, `NarrativeDataCollector`, `IAIDataCollector`, `CSIDataCollector`, `DataCollectionManager`.
- `lib/data-collection/config.ts` – `loadDataFeedConfig()` with Twitter, News, weather, injuries, odds, etc.

**New in Phase 1**
- `app/api/progno/admin/data-collection/preview/route.ts`  
  - `POST /api/progno/admin/data-collection/preview` (admin/cron secret).  
  - Runs collectors in **dry‑run** mode and returns a **summary** only:
    - Phase 1 (sentiment): `socialCount`, `newsCount` (Twitter/Facebook/News when keys are present).
    - Phase 2 (narrative): flags for schedule/roster presence (still TODO in collectors).
    - Phase 3 (IAI): whether odds are available, line‑movement samples, `sharpIndicator`.
    - Phase 4 (CSI): whether weather data was fetched, injury count, referee flag.

**How to use now**
- Configure keys via env + keys store (`Twitter Bearer Token`, `News API Key`, `OpenWeather API Key`, `Odds API Key`).  
- Hit the preview endpoint with:
  - a `teamName` for Phase 1 and 4, and
  - optional `stadium` + `gameDate` for weather/injuries:

```bash
curl -X POST http://localhost:3008/api/progno/admin/data-collection/preview \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "teamName": "Kansas City Chiefs",
    "stadium": { "name": "Arrowhead Stadium", "city": "Kansas City", "state": "MO" },
    "gameDate": "2026-09-10T18:30:00Z",
    "include": { "phase1": true, "phase3": true, "phase4": true }
  }'
```

**Suggested future use (Phase 2+)**
- Add real `store()` implementations that write to Supabase tables:
  - `sentiment_snapshots`, `line_movement_snapshots`, `weather_snapshots`, `injury_snapshots`.
- Create **small, focused signal modules** that read those tables and add bounded `confidenceDelta` to picks (e.g. ±2–3 points for weather, ±3–5 for meaningful injury clusters, a small adjustment for sharp line moves).

---

## 2. Progno Generic Predictions DB + API

**Where**
- `app/api/progno/predictions/route.ts`  
- Supabase migrations in old monorepo (`apps/progno/database/schema.sql` – mirrored into current DB).

**What it does**
- General‑purpose predictions layer: `progno_predictions` (any domain) + `progno_outcomes` + `progno_accuracy_metrics`.
- API endpoints:
  - `GET /api/progno/predictions` – reads from `picks` table (sports) for now.
  - `POST /api/progno/predictions` – writes rows into `progno_predictions`.

**New in Phase 1**
- Zod‑validated POST payload:
  - `prediction_type`, `question`, `prediction_data`, `confidence` are required.
  - Accepts numeric or string `confidence`, clamps to 0–100.
  - Logs a small, safe summary when a prediction is created:
    - `{ type, category, conf, edge_pct, source }` (no full `prediction_data` logged).

**How to use now**
- As a **unified log** of non‑sports Progno predictions (travel, pets, generic):
  - Store all model outputs here with a confidence + optional `edge_pct` and `risk_level`.
  - Later connect outcomes → `progno_outcomes` and viz via `/api/progno/predictions/stats`.

**Suggested future use**
- Build a small UI under `/progno/admin` that shows:
  - recent predictions by type/category,
  - correctness once outcomes are filled,
  - calibration plots for confidence vs actual hit rate.

---

## 3. Module System and Planned Signals

**Where**
- `app/lib/modules/README.md`
- `app/lib/modules` – `signals/`, `filters/`, `data-sources/`, `ranking/`, `pick-engine.ts`, `module-registry.ts`.

**What it gives you**
- A clean way to add or swap **signals**, **filters**, and the **confidence formula** without touching pick‑engine core.
- README lists **planned modules** like `InjuryReportSignal`, `WeatherSignal`, `RestAdvantageSignal`, `SharpMoneySignal`, `EarlyLineDecayFilter`, etc.

**How to use now**
- Continue using the existing signal/filter modules as the primary way to add logic (we already wired tuning/learning into filters + analyzer).

**Suggested future use**
- Implement new signals that **consume the data‑collection tables** (once Phase 2 is in place). Examples:
  - `InjurySignal` – uses `injury_snapshots` and adjusts confidence when `totalImpact` and `clusterInjuries` exceed thresholds.
  - `WeatherSignal` – adjusts totals/ML confidence for strong wind/rain based on `weather_snapshots`.
  - `SharpMoneySignal` – taps `line_movement_snapshots` to favour sides with sharp indicators.

---

## 4. Enhancements Wrapper (Validation / Logging / Rate Limiting)

**Where (old design, not fully wired)**
- Old monorepo `apps/progno/README*.md` (enhancements folder with zod validator, logger, rate limiter, strategy enhancer).

**What we’ve already pulled in**
- We are using **zod** in `app/api/progno/predictions/route.ts` for the POST body.

**Suggested future use**
- Wrap key APIs (`/api/picks/today`, `/api/progno/predictions`, `/api/progno/admin/*`) with:
  - **Zod validation** at the edge for inputs (query params and bodies).
  - **Structured logging** that records timing + request shape (no secrets, no raw odds).
  - Optional **rate limiting** (bottleneck) for public endpoints if/when you open them.

---

## 5. Alpha Hunter – Bot + Coinbase Integration

**Where**
- `apps/alpha-hunter/README.md`, `.env.example`, `supabase-schema.sql`, `migrations/`.
- `apps/alpha-hunter/src/` (decision engine, Kalshi trader, project scanner, Coinbase exchanges).

**Current use**
- Not fully wired into progno in this repo; used as a separate bot.

**How it fits now**
- **Crypto side** is now part of the **review bundle** via `Export-PrognoSportsAndCoinbaseReview.ps1`, so another AI can audit sports → crypto execution end‑to‑end.

**Suggested future use**
- Keep the main bot in **simulation mode** while:
  - Aligning its risk limits with Progno’s tuning + learning‑bot insights.
  - Feeding its live P&L (for crypto) into:
    - the **Trading Dashboard** (`apps/trading-dashboard`), and
    - future TrailerVegas reports (e.g. “sports edge vs Coinbase strategy P&L”).

---

## 6. Trading Dashboard

**Where**
- `apps/trading-dashboard/README.md`
- `apps/trading-dashboard/src/types/trading.ts`

**What it does**
- Next.js dashboard for **Kalshi + Coinbase** metrics (balances, trades, charts, performance).

**Suggested use with current stack**
- Wire it to Alpha Hunter’s APIs / Supabase tables (`alpha_hunter_trades`, `crypto_trades`) so you have:
  - A live **P&L view** for both prediction markets and Coinbase.
  - A clean visual layer to compare Progno’s sports edge vs realized trading performance.

---

## 7. TrailerVegas – “Grade Your Picks”

**Where**
- Internal grader:
  - `app/api/progno/admin/trailervegas/grade/route.ts`
  - `app/progno/admin/trailervegas/page.tsx`
- Monetization doc:
  - `TRAILLERVEGAS-MONETIZATION.md`

**What it does**
- Internal‑only **pick grading engine**:
  - Upload CSV/JSON: `date, home_team, away_team, pick, odds, stake, league`.
  - Matches against `game_outcomes` via `team-matcher`.
  - Grades each row (win/lose/pending/unmatched/unsupported) and computes win rate + ROI (overall and by league).
  - UI under `/progno/admin/trailervegas` using the admin/cron secret.

**Suggested future use**
- Productize as **trailervegas.com**:
  - Stand up a small public Next.js app that fronts this API via the Cevict gateway or direct Vercel project.
  - Add Stripe for “pay‑per‑report” or a small subscription.
  - Keep current admin page as the **internal tool** backing that product.

---

## 8. Wallboard / Command Center

**Where**
- `apps/progno/wallboard/README.md`

**What it does**
- TV‑optimized **real‑time trading wallboard**:
  - Live game ribbon, detailed panel, open bets & EV, bankroll meter, rotating intel.

**Suggested future use**
- Treat as the visual **“command center”** during live trading:
  - Feed it from `/api/picks/today`, `prediction_results`, and `actual_bets`.
  - Show Progno confidence + Alpha Hunter / Coinbase exposure in one place.

---

## 9. Review Packages for External AI Audits

**Where**
- `apps/progno/scripts/Export-PrognoAuditBundle.ps1`
- `apps/progno/scripts/Export-PrognoSportsAndCoinbaseReview.ps1`

**What they do**
- Build **one‑file, AI‑readable** bundles:
  - Full Progno engine (`...AuditBundle.ps1`).
  - Progno sports + Alpha Hunter/Coinbase (`...SportsAndCoinbaseReview.ps1`).

**How to use now**
- From repo root:

```powershell
cd C:\cevict-live
.\apps\progno\scripts\Export-PrognoSportsAndCoinbaseReview.ps1
```

- Upload the generated `.txt` to an AI and ask for:
  - audits of sports edge + crypto execution,
  - safety/risk reviews,
  - tuning suggestions.

---

## Summary

- Phase 1 work hooked **data‑collection preview** and **zod‑validated predictions** into the current app without changing live pick behaviour.
- The legacy assets above are now mapped and ready to be:
  - turned into **new signals** (via data‑collection → Supabase → module system),
  - wrapped with **validation/logging** at key APIs,
  - surfaced in **Alpha Hunter + Trading Dashboard + TrailerVegas** products, and
  - packaged cleanly for **external AI audits** via the exporter scripts.

