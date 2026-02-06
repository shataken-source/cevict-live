# Progno — Brutal Audit (Start to Finish)

**Scope:** `c:\cevict-live\apps\progno`
**Purpose:** What’s good and working, what’s wrong or needs work, what’s broken but should work, what’s not implemented but should be.

---

## 1. What’s good and working

### Core data and API

- **The Odds API integration**
  `lib/odds-service.ts` uses ODDS_API_KEY, fetches games and odds (h2h, spreads, totals), maps to a clean shape. **getGames** and **getGame** work. **getLiveScores** uses the scores endpoint (subject to Odds API historical limits; see ODDS-API-LIMITATION.md).

- **API v2 (`/api/progno/v2`)**
  Single entry for `action=games`, `action=prediction`, `action=live-scores`, `action=health`, `action=info`. Uses OddsService + `predictGameWithEnrichment`. Used by get-predictions.ps1 and your viewer flow. **Working.**

- **Keys store**
  `app/keys-store.ts`: .progno/keys.json, env fallbacks (ODDS_API_KEY, NEXT_PUBLIC_ODDS_API_KEY), getPrimaryKey, getKeyByLabel, getSportsBlazeKey, getAnthropicKey. Admin and scripts use it. **Working.**
  (Note: `lib/keys-store.ts` is a different, thin version using API_SPORTS_KEY / THE_ODDS_API_KEY — likely legacy; most code uses `app/keys-store.ts`.)

- **Enhanced Picks API (`/api/picks/today`)**
  Fetches all 6 sports from Odds API, consensus odds, 7D Claude Effect, Monte Carlo, value detection, Triple Alignment, top-10-by-composite, max 3 per sport. Writes to Supabase when configured; otherwise returns in-memory. **This is the “Cevict Flex” pipeline and it’s implemented and used.**

- **Admin / cron endpoints**
  Monday (scores + grading + calibration), Tuesday, Thursday, Friday, all-leagues, keys, diagnose, etc. Use getPrimaryKey and Odds API. **Functional** as long as ODDS_API_KEY (or keys.json) is set.

- **Scripts you kept**
  get-predictions.ps1, get-results.ps1, run-progno-today.ts, run-progno-for-dates.ts, trigger-pick-generation.ts, fetch-2024-historical-data.mjs, fetch-available-results.ts, import-results.ts, train/simulate scripts — all wired to the app and keys. **Worth keeping; they work in the way they’re designed.**

---

## 2. Working but wrong or needing improvement

### V2 “prediction” uses a fake engine

- **Issue:** For `?action=prediction&gameId=...`, v2 calls `predictGameWithEnrichment` in **lib/data-sources/predict-with-enrichment.ts**.
- **Reality:** That function does **not** use the 7D Claude Effect or Monte Carlo. It uses league averages, **randomized** team strength and form/h2h/injury text, and formula-based confidence/edge. So the **predictions-YYYY-MM-DD.json** you generate with get-predictions.ps1 (which hits v2 prediction per game) are **not** from the same model as the “Top 10” Cevict Flex picks from `/api/picks/today`.
- **Fix:** Either:
  - Point v2 `prediction` at the same pipeline as picks/today (per-game Monte Carlo + 7D + value), or
  - Clearly label v2 as “simple model” and use picks/today (or a dedicated “single game elite” endpoint) for the real Cevict Flex output.

### OddsService.getGame is inefficient

- **Issue:** `getGame(gameId)` loops over every sport and calls `getGames({ sport })` for each until it finds the game. So one prediction can trigger 6+ full Odds API calls.
- **Fix:** If the client sends sport (e.g. from the games list), add a `getGame(gameId, sport?)` that only fetches that sport. Or cache getGames results per sport with a short TTL so repeated lookups don’t refetch.

### Two keys-stores and inconsistent env names

- **app/keys-store.ts:** ODDS_API_KEY, NEXT_PUBLIC_ODDS_API_KEY, .progno/keys.json.
- **lib/keys-store.ts:** API_SPORTS_KEY, THE_ODDS_API_KEY, SPORTS_BLAZE_API_KEY.
- Most of the app uses `app/keys-store.ts`. Anything still importing `lib/keys-store` may be using the wrong env vars.
- **Fix:** Standardize on one keys store (app) and one set of env var names; deprecate or remove lib/keys-store or make it a thin wrapper that reads from app/keys-store / env.

### Cron generate-picks vs picks/today

- **`/api/cron/generate-picks`** uses API-Sports client (getClientForSport, getGames), Supabase, and a different Claude Effect path. It only runs NBA, NFL, NHL and writes to Supabase `picks` table.
- **`/api/picks/today`** uses The Odds API, 6 sports, Monte Carlo, 7D, value, top-10, and can also write to Supabase.
- So you have **two different pick pipelines**. If “daily picks” means Cevict Flex, the cron should probably call the same logic as picks/today (Odds API + 7D + MC) and not the API-Sports path. Otherwise you get two different products and confusion.

### Placeholders and stubs in the pipeline

- **lib/data-sources/game-enricher.ts:** Weather is a stub (fixed 68°F, clear). Injuries/stats may be real depending on injury-fetcher and team-stats-fetcher.
- **app/lib/sentiment/collectors.ts:** Twitter, Instagram, news, press conferences are placeholders; real collection “not implemented yet.”
- **app/api/cron/sentiment/route.ts:** Twitter/Instagram/news/press/beat reporter logic is placeholder; no real API or DB write.
- **app/lib/performance-tracker.ts:** Several TODOs: “query database for actual predictions and outcomes,” “store CLV,” etc. Stats are placeholder.
- **app/lib/simulation-engine.ts:** “TODO: Get actual game data from OddsService” — uses placeholder game data.
- So: **sentiment and “social” inputs to the 7D model are not real**; performance tracking and some sim paths are not backed by real DB data. The core “odds + 7D formula + Monte Carlo” in picks/today is real; the auxiliary data (weather, sentiment, stored results) is partial or fake.

---

## 3. Not working but should be

### Cursor bot disabled

- **app/api/cursor-bot/route.ts:** `botDisabled = true`. All actions return “disabled” or empty. So the Cursor bot dashboard and any consumer of this API get no real data.
- **Fix:** Either remove/archive the feature or implement and flip `botDisabled` to false when ready.

### Live odds / placeholder API key

- **app/live-odds-fetcher.ts:** Uses `"placeholder-api-key"` in at least one path (e.g. fetchLiveOdds). So live odds from that fetcher will fail or be wrong in production.
- **Fix:** Use getPrimaryKey() (or your real Odds API key source) everywhere live odds are fetched.

### News collector

- **lib/data-collection/news-collector.ts:** If API key is missing, it says “RSS fallback not implemented” and doesn’t provide a real fallback. So news-based enrichment is missing when key isn’t set.
- **Fix:** Implement a minimal RSS (or other free) path, or clearly disable news when key is absent.

### Historical results (The Odds API)

- **ODDS-API-LIMITATION.md:** The Odds API scores endpoint doesn’t support historical `daysFrom` the way you’d want for 2024 backfill. So “fetch 2024 results” from Odds API alone is limited. Your fetch-2024-historical-data.mjs and similar scripts may hit that limit.
- **Fix:** Rely on fetch-available-results (what the API does support), or use SportsData.io / SportsBlaze / manual imports for true 2024 historical results (as you already documented).

### Backtest engine

- **lib/backtesting/backtest-engine.ts:** “Placeholder — replace with your actual implementation” for at least one part. So backtests may not be fully driven by your real prediction pipeline.
- **Fix:** Wire backtest to the same odds + 7D + MC logic as picks/today so backtest reflects production behavior.

---

## 4. Not implemented (or barely) but needed

### Totals (Over/Under) as first-class picks

- You said “totals haven’t been fully implemented yet.” In picks/today, value detection does consider totals (Monte Carlo + detectValueBets), and recommended pick can be a total when value edge is high. So **recommendation** for totals exists, but:
  - If “fully implemented” means dedicated total-specific model, NIG/weather for O/U, or separate total confidence, that’s not there.
  - If it just means “show total picks in UI and in exports,” the data is there; the rest is UI/formatting.
- **Recommendation:** Define “totals fully implemented” (e.g. “we recommend O/U when value edge > X and show it like ML/Spread”). Then either add a dedicated total path or document that current total picks are “value-only” and good to go.

### Real sentiment and social data

- Sentiment/social collectors and cron/sentiment are placeholders. So SF (Sentiment Field), NIG (News Impact Grade), and any “narrative” that depends on news/social are not backed by real data. The 7D formula runs, but some dimensions are synthetic or default.
- **Needed:** Either implement at least one real source (e.g. news API or RSS) and wire it into the 7D inputs, or document that SF/NIG are “structural” only until data is added.

### Result grading and storage

- Monday job and weekly-page.helpers fetch scores and update predictions. If prediction storage is file-based or partial, “grading” may not persist everywhere you expect. Supabase picks table may get updates only when that path is used.
- **Needed:** Single source of truth for “prediction + result” (e.g. Supabase or a single file/schema) and ensure every pipeline that generates picks also writes there so Monday (or equivalent) can grade them all.

### Single “elite” game endpoint aligned with picks/today

- You have `/api/progno/elite-analyze` and `/api/progno/analyze-game`. If these don’t use the same 7D + Monte Carlo + value logic as picks/today, then “single game” and “top 10” can diverge.
- **Needed:** One canonical “single-game Cevict Flex” path (same as one game from picks/today) and have v2 and elite/analyze call it so behavior is consistent.

### API documentation and contracts

- Many routes exist; no single OpenAPI/Swagger or “what to call for what” doc. So “what’s the main endpoint for daily picks?” (picks/today) vs “what’s for single-game prediction?” (v2 or elite) is in code and audit only.
- **Needed:** Short doc (e.g. PROGNO-API.md) listing: main endpoints (v2, picks/today, cron, admin), which script/page uses which, and which key (ODDS_API_KEY, Supabase, etc.) each needs.

### Health and keys at startup

- **lib/odds-service.ts** throws at import if ODDS_API_KEY is not set. So the app can fail to start in dev if .env.local is missing. getPrimaryKey() in app/keys-store also reads keys.json, so the app can work without env if keys are in .progno. So behavior differs by “env only” vs “keys.json.”
- **Fix:** Have OddsService read key via getPrimaryKey() (or a shared key loader) so one place decides env vs keys.json. Optionally, make the throw a runtime check on first use instead of import so the app starts and fails only when hitting an endpoint that needs odds.

---

## 5. Summary table

| Area | Status | Action |
|------|--------|--------|
| Odds API + OddsService | ✅ Working | Optional: cache getGames; add getGame(id, sport). |
| API v2 (games, live-scores) | ✅ Working | — |
| v2 prediction | ⚠️ Wrong engine | Use same model as picks/today or rename to “simple model.” |
| Keys store (app) | ✅ Working | Standardize on it; retire or align lib/keys-store. |
| /api/picks/today | ✅ Working | This is your real Cevict Flex pipeline. |
| Cron generate-picks | ⚠️ Different pipeline | Align with picks/today (Odds API + 7D + MC) or document as “legacy.” |
| Admin Monday/Tue/Thu/Fri | ✅ Working | Ensure grading writes to same store as picks. |
| Cursor bot | ❌ Disabled | Implement or remove. |
| Live odds fetcher | ❌ Placeholder key | Use getPrimaryKey(). |
| predict-with-enrichment | ⚠️ Fake randomness | Replace with real model or mark as dev-only. |
| Sentiment / news / social | ❌ Placeholders | Implement at least one source or document as future. |
| Weather in enricher | ❌ Stub | Implement or remove from pipeline. |
| Performance tracker | ⚠️ Placeholder DB | Implement DB or remove dependency. |
| Backtest engine | ⚠️ Placeholder part | Wire to real 7D + MC pipeline. |
| Totals | ⚠️ Partial | Define “fully implemented”; add UX or docs. |
| Single-game elite | ⚠️ Unclear alignment | Make one canonical path = one game from picks/today. |

---

## 6. Suggested priority order

**Critical (fix first)**
1. v2 prediction: Use same engine as picks/today or clearly label as simple model.
2. Live odds: Remove placeholder API key; use getPrimaryKey().
3. OddsService: Don’t throw at import; resolve key via getPrimaryKey() (and optionally keys.json).

**High**
4. One keys-store and one set of env var names; fix any imports from lib/keys-store.
5. Cron generate-picks: Either call picks/today logic (Odds API + 7D + MC) or document as alternate pipeline.
6. getGame(gameId): Avoid 6× getGames; pass sport or cache.

**Medium**
7. Result grading: Single store for predictions + results; Monday (or equivalent) updates that store.
8. Single-game “elite” and v2 prediction: Same code path as one game from picks/today.
9. Backtest: Drive from same 7D + MC + value logic as production.

**Low**
10. Sentiment/news: One real data source or explicit “not yet implemented” in docs.
11. Weather: Real data or drop from enricher.
12. Cursor bot: Ship or remove.
13. API doc: PROGNO-API.md with main endpoints and which key each uses.

This is the brutal pass: what’s good, what’s wrong, what’s broken, and what’s missing, with concrete next steps.

---

## 7. Implementation log (priority order)

*Implementing from highest priority down; documenting as we go.*

### Done — Critical #1: v2 prediction same engine as picks/today

- v2 `?action=prediction&gameId=...` now uses Cevict Flex (7D + Monte Carlo + value), same as `/api/picks/today`.
- **Files:** `app/api/picks/today/route.ts` — added `buildPickFromRawGame`, `getSingleGamePick`, refactored loop to use them. `app/api/progno/v2/route.ts` — prediction case calls `getSingleGamePick`, maps to existing response shape; optional `?sport=` to avoid 6× fetch.

### Done — Critical #2: Live odds use getPrimaryKey()

- **File:** `app/live-odds-fetcher.ts` — import `getPrimaryKey`, use it in `fetchAndCompareOdds` and exported `fetchLiveOdds` instead of `"placeholder-api-key"`.

### Done — Critical #3: OddsService key at runtime

- **File:** `lib/odds-service.ts` — removed import-time throw; key resolved in `fetchFromOddsApi` via `getPrimaryKey()` from `app/keys-store`. Throws only when a request is made without a key.

### Done — EV and odds correctness (for selling picks / Prognostication)

- **EV (expected value):** Now correct “dollars per $100 bet” (American odds). Bad consensus odds (e.g. -2, +2) are sanitized to ±110 before edge/EV so responses never show absurd EVs (e.g. $2243 per $100). `app/lib/monte-carlo-engine.ts`: `sanitizeAmericanOdds`, `calculateEV` rounded to 2 decimals; `app/api/picks/today/route.ts`: consensus odds sanitized before value detection; `expected_value` / `value_bet_ev` rounded in response.
- **API:** Response includes `metrics_guide` (ev_per_100, edge_pct, odds) so subscribers know how to interpret the numbers.

### TODO — High #4–6

- #4: One keys-store and env names; fix lib/keys-store imports.
- #5: Cron generate-picks align with picks/today or document as alternate.
- #6: getGame(gameId, sport?) and/or cache to avoid 6× getGames.
