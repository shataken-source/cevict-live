# Progno Flow Audit: Odds → Probability → Picks

## Data flow (end-to-end)

1. **Odds**
   - **Source:** The Odds API (`api.the-odds-api.com/v4/sports/{sport}/odds/`).
   - **Key:** `getPrimaryKey()` (env `ODDS_API_KEY` / `NEXT_PUBLIC_ODDS_API_KEY` or `.progno/keys.json`).
   - **Entry points:**  
     - `GET /api/picks/today` — fetches odds per sport (NBA, NFL, NHL, MLB, NCAAF, NCAAB), builds picks.  
     - `GET /api/progno/odds` and `OddsService` / `weekly-page.helpers.ts` — same key, different callers.

2. **Probability**
   - American odds → implied probability via `oddsToProb()` (in `picks/today/route.ts`).
   - **7D Claude Effect:** `calculate7DimensionalClaudeEffect()` adjusts home/away probabilities (SF, NM, IAI, CSI, NIG, TRD, EPD).
   - **Monte Carlo:** `MonteCarloEngine.simulate()` + `detectValueBets()` for win/spread/total probabilities and value edges.
   - Final confidence: base from odds + Claude boost + Monte Carlo boost − chaos penalty, clamped 52–92.

3. **Picks**
   - Per game: favorite (moneyline), best value type (spread/total/moneyline), confidence, analysis, `game_id`, `expected_value`, `reasoning[]`.
   - Optional persistence: Supabase `picks` table (when credentials present).
   - **Alpha-hunter:** `PrognoIntegration.getTodaysPicks()` calls `/api/picks/today`, then `mapPrognoPickToShape()` maps to `PrognoPick` (gameId, expectedValue, reasoning). `convertToOpportunities()` uses those fields for opportunities.

## Fixes applied (audit follow-up)

- **picks/today:** Uses `getPrimaryKey()` for the Odds API key. Each pick includes `game_id`, `expected_value`, and `reasoning[]` for consumers (e.g. alpha-hunter).
- **Alpha-hunter:** `getTodaysPicks()` maps raw progno picks to `PrognoPick` via `mapPrognoPickToShape()` so `convertToOpportunities()` gets correct `gameId`, `expectedValue`, and `reasoning`.
- **Health:** `GET /api/health/progno` now includes an optional `oddsApi: { ok, message? }` check (key + one sport fetch); health still returns 200 if prediction-tracker succeeds.

## Key files

| Role | Path |
|------|------|
| Picks API | `app/api/picks/today/route.ts` |
| Odds key | `app/keys-store.ts` (`getPrimaryKey`) |
| Odds fetch (helpers) | `app/weekly-page.helpers.ts` |
| Monte Carlo | `app/lib/monte-carlo-engine.ts` |
| Prediction engine | `app/lib/prediction-engine.ts` |
| Health | `app/api/health/progno/route.ts` |
| Alpha-hunter integration | `apps/alpha-hunter/src/intelligence/progno-integration.ts` |
