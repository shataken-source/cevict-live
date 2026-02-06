# Simulation & backtest – data and tuning

## What you have

1. **`pnpm simulate`** – Runs the 2024 simulator (`simulate-2024.ts`): loads `data/2024-games.json` (or Supabase/sample), uses **prediction-engine** (statistical, ELO, form, etc.), tunes method weights toward 90% win rate. Writes iterations to `data/simulations/` and best params to `data/tuned-parameters/2024-tuned-parameters.json`.

2. **`pnpm backtest`** – Runs the **BacktestEngine** (same path as production: PredictionEngine + Claude Effect) on a JSON game list. Uses `data/2024-games.json` by default. One run, one config.

3. **`pnpm backtest:tune`** – Same as backtest but loops over `minConfidence` (0.55–0.7) and `minEdge` (0.02–0.1), prints a table, and writes the best config to `data/tuned-parameters/backtest-tuned.json`.

## Game data shape

Backtest and simulation expect a JSON **array** of games. Each game:

```json
{
  "id": "game-1",
  "homeTeam": "Kansas City Chiefs",
  "awayTeam": "Buffalo Bills",
  "league": "NFL",
  "date": "2024-09-05",
  "odds": { "home": -150, "away": 130, "spread": -3.5, "total": 47 },
  "actualWinner": "Buffalo Bills",
  "actualScore": { "home": 20, "away": 24 },
  "teamStats": { "home": { "wins": 10, "losses": 7, "pointsFor": 380, ... }, "away": { ... } },
  "recentForm": { "home": ["W","L","W"], "away": ["W","W","L"] },
  "headToHead": { "homeWins": 2, "awayWins": 1 }
}
```

**Minimum:** `homeTeam`, `awayTeam`, `league`, `date`, `odds` (home, away; spread/total optional), `actualWinner`, `actualScore`.  
If `teamStats` / `recentForm` / `headToHead` are missing, the backtest script fills `teamStats` from `estimateTeamStatsFromOdds(odds, league)`.

## Feeding scraped or API data

- **Scraped (e.g. ScrapingBee):** Build a small harvester that fetches odds/results pages, parses them, and writes a JSON array in the shape above to `data/backtest-games.json` (or any path). Then run:
  ```bash
  pnpm backtest data/backtest-games.json
  pnpm backtest:tune data/backtest-games.json
  ```
- **API (Odds API, API-Sports, etc.):** Same idea: fetch historical odds + results, normalize to the game shape above, save JSON, run `backtest` or `backtest:tune`.

So: **any data source is fine as long as you produce that JSON array.** The engine doesn’t care whether it came from 2024-games, scraped HTML, or an API.

## Tuning loop (what “run in loops until tuned” means)

- **`backtest:tune`** – Grid over a few params (minConfidence, minEdge), run backtest for each, keep the config that gives the best win rate (or ROI if you change the script). One “loop” = one full grid; you can run it repeatedly after adding more data.
- **`pnpm simulate`** – Longer loop: the 2024 simulator runs many iterations, updates method weights from outcomes, and stops when it hits the target win rate or max iterations. That’s the “tune the engine with what it has” path for the **prediction-engine** (not the Claude Effect path).

For **production-like** tuning (Monte Carlo + 7D Claude Effect), use **backtest** and **backtest:tune** with as much historical data as you can (2024-games, scraped, or API). For **method-weight** tuning on the multi-method prediction engine, use **simulate** and **simulate:2024**.
