# Progno Scripts Audit

Quick reference for what each script does and whether it’s worth keeping.  
*(Generated from a one-pass review of the folder.)*

---

## ✅ KEEP — Actively useful

| File | What it does | Why keep |
|------|----------------|----------|
| **add-anthropic-key.mjs** | Adds Anthropic/Claude API key to `.progno/keys.json` | One-time or occasional setup; no duplicate elsewhere. |
| **add-news-api-key.mjs** | Adds News API key to `.progno/keys.json` | Same as above for news. |
| **get-predictions.ps1** | Calls local API (v2 games + prediction) per league, saves `predictions-YYYY-MM-DD.json` | Matches your “daily predictions” flow and the Cevict Picks Viewer format. |
| **get-results.ps1** | Calls v2 games API per league, saves raw games + scoreInfo → `results-YYYY-MM-DD.json` (League, GameId, HomeTeam, AwayTeam, HomeScore, AwayScore, Winner, Completed). Run after games finish to get scores. *Not* the same file shape as the daily-results cron (which grades predictions → `{ date, results: GradedPick[], summary }`). |
| **check-monday-cron.ps1** | Checks Monday cron status, `.progno` files, and hits `/api/admin/monday` | Debugging and verifying cron/results. |
| **diagnose-picks.sh** | Bash: day-of-week, cron schedule, picks file existence/size, API reach | Same idea as above for Unix. |
| **run-progno-today.ts** | Fetches today’s odds (Odds API), runs weekly analyzer, saves predictions to `.progno` | Core “run for today” pipeline. |
| **run-progno-for-dates.ts** | Same idea for specific dates; fetches odds, analyzes, can add results | Backfills or custom date runs. |
| **trigger-pick-generation.ts** | POSTs to `/api/cron/generate-picks` with CRON_SECRET | Manual trigger for pick generation (e.g. when cron isn’t used). |
| **import-results.ts** | Imports/merges results from JSON/CSV into `2024-results-all-sports.json` | Feeding historical results for training. |
| **fetch-theodds-historical.ts** | Enriches `backtest-games.json` with real historical odds (paid Odds API) | Backtesting with real odds. |
| **FETCH-HISTORICAL-DATA.md** | Docs for fetch-2024-historical-data.mjs and training | Keep as doc. |
| **ODDS-API-LIMITATION.md** | Documents Odds API not supporting historical scores; suggests alternatives | Keep as doc. |

---

## ⚠️ KEEP BUT CONSOLIDATE — Historical data fetchers (pick one path)

You have **several** ways to get “2024” (or historical) results. They overlap; pick one approach and keep those scripts.

| File | What it does | Recommendation |
|------|----------------|-----------------|
| **fetch-2024-historical-data.mjs** | Odds API; fetches completed games for 2024, all leagues → `2024-results-all-sports.json` | **Keep** if you still use Odds API for historical. |
| **fetch-2024-results.ts** | Odds API scores endpoint; date range by 30-day chunks → same format | Likely **redundant** with above (and Odds API limits historical scores per ODDS-API-LIMITATION.md). |
| **fetch-2024-results-alternative.ts** | “Alternative” strategies (recent completed, etc.) for 2024 results | **Keep one** “fetch 2024 results” script; this or the .mjs. |
| **fetch-available-results.ts** | Tries multiple day ranges from Odds API, saves whatever’s available | Useful for “whatever we can get” without assuming 2024. **Keep** if you use that. |
| **fetch-2024-sportsblaze.mjs** | **SportsBlaze API** → `2025-results-all-sports.json` (filename says 2025) | **Keep** only if you use SportsBlaze. |
| **fetch-2024-python.py** | **nba_api** (and other sources) for 2024 NBA (and others?) | **Keep** only if you prefer Python or need nba_api. |

**Suggested cleanup:** Keep **fetch-2024-historical-data.mjs** (or **fetch-available-results.ts**) as the main “get historical results” path; keep **fetch-theodds-historical.ts** for backtest enrichment; keep **fetch-2024-sportsblaze.mjs** / **fetch-2024-python.py** only if you use those APIs. Remove or archive the rest of the fetch-2024-* variants to avoid confusion.

---

## ⚠️ KEEP — Training / simulation (referenced in package.json)

| File | What it does | Why keep |
|------|----------------|----------|
| **run-simulation.ts** | Entry point: loads 2024 data, runs `SimulationEngine` until 90% win rate | Used by `pnpm simulate`. |
| **simulate-2024.ts** | `SimulationEngine`: 2024 data, prediction engine, tuning toward 90% win rate | Core simulation logic. |
| **simulate-yesterday.ts** | Fetches yesterday’s games, runs predictions with Claude Effect, no DB | Good for “did we get yesterday right?”. |
| **calculate-2024-win-rate.ts** | Fetches 2024 NFL (Odds API), runs predictions, gets results, win rate by week | Used by `pnpm calculate:winrate`. |
| **train-bot-2024.ts** | Loads 2024 results (all leagues), calls `cursorLearnFromFinals` | Trains Cursor Effect bot on 2024. |
| **fine-tune-engine.ts** | Loads 2024 results, calibrates (confidence bins, spread/total bias) → `calibration.json` | Calibration for prediction engine. |

These are the ones that actually drive “training” and “simulation” in your app. Keep them unless you’ve fully replaced that flow elsewhere.

---

## ❓ MAYBE — Depends on your stack

| File | What it does | Keep if… |
|------|----------------|----------|
| **generate-picks-now.ts** | Uses API-Sports client, Claude Effect, Supabase teams; generates picks per game | You still use API-Sports + Supabase for pick generation. |
| **scrape-rotowire-injuries.py** | Scrapes Rotowire injury pages (basketball, etc.) | You use injury data in predictions and don’t have another source. |

If you’ve moved to a different pick pipeline (e.g. only run-progno-today + cron), **generate-picks-now.ts** might be obsolete. If you never wired Rotowire into the app, the Python script is optional.

---

## ❌ REMOVE OR ARCHIVE — Likely obsolete / experiments

| File | What it does | Why remove or archive |
|------|----------------|------------------------|
| **ORIGINAL-get-predictions - Copy.ps1** | Copy of `get-predictions.ps1` | Duplicate; keep only the main one. |
| **fetch-2024-results.ts** | Odds API scores (limited historical support) | Superseded by ODDS-API-LIMITATION.md and other fetchers. |
| **test-kaggle-titanic.ts** | Tests Kaggle Titanic integration (`../app/kaggle-integration`) | Unrelated to Progno; experiment. |
| **test-learning-system.ts** | Tests “anything predictor” + “anything learner” with fake Q&A | Experimental learning system; only keep if you still use that. |
| **test-predictions-with-sample-data.ts** | Unit-style tests for prediction engine with sample games | Useful for dev; **keep** if you run tests, **archive** if you never run it. |

Safe to **delete**: `ORIGINAL-get-predictions - Copy.ps1`.  
**Archive** (e.g. move to `scripts/archive/`): the test-* and any fetch-2024-* you’re not using.

---

## Summary table

| Category | Action |
|----------|--------|
| **Key helpers** | Keep: `add-anthropic-key.mjs`, `add-news-api-key.mjs` |
| **Daily ops** | Keep: `get-predictions.ps1`, `get-results.ps1`, `check-monday-cron.ps1`, `diagnose-picks.sh`, `trigger-pick-generation.ts` |
| **Progno pipeline** | Keep: `run-progno-today.ts`, `run-progno-for-dates.ts`, `import-results.ts`, `fetch-theodds-historical.ts` |
| **Historical fetch** | Keep **one** primary (e.g. `fetch-2024-historical-data.mjs` or `fetch-available-results.ts`); keep SportsBlaze/Python only if used; archive the rest. |
| **Training / sim** | Keep: `run-simulation.ts`, `simulate-2024.ts`, `simulate-yesterday.ts`, `calculate-2024-win-rate.ts`, `train-bot-2024.ts`, `fine-tune-engine.ts` |
| **Maybe** | Decide: `generate-picks-now.ts`, `scrape-rotowire-injuries.py` |
| **Docs** | Keep: `FETCH-HISTORICAL-DATA.md`, `ODDS-API-LIMITATION.md` |
| **Remove** | `ORIGINAL-get-predictions - Copy.ps1` |
| **Archive** | `test-kaggle-titanic.ts`, `test-learning-system.ts` (and optionally `test-predictions-with-sample-data.ts`), redundant fetch-2024-* |

If you want, next step can be: create an `archive/` subfolder and move the “remove/archive” files there, and add a one-line README in `scripts/` that points to this audit.
