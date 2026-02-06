# Sports Results APIs — Previous Day's Game Results

Used by the **daily-results** cron and for backtesting. When The Odds API and API-Sports have no scores for a league, we try these providers (in order). Add API keys to `.env.local` as you restore them.

Reference: [SourceForge – Best Sports Data APIs of 2026](https://sourceforge.net/software/sports-data-apis/)

## Leagues

NFL, NBA, NHL, MLB, NCAAB, NCAAF.

## Providers (in `results-apis.ts`)

| Provider           | Env key                    | Cost        | Leagues                          | Notes                          |
|--------------------|----------------------------|------------|-----------------------------------|--------------------------------|
| **ESPN**           | —                          | Free       | All six                          | No key; near real-time; tried first |
| Rolling Insights   | `ROLLING_INSIGHTS_API_KEY` | $50/mo     | All six + EPL, PGA, NASCAR, etc. | Post-game data; 24x7 support    |
| JsonOdds           | `JSONODDS_API_KEY`         | $29.99/mo  | All six + WNBA, MMA, etc.         | Results + odds; low-cost       |
| TheSportsDB        | `THESPORTSDB_API_KEY`      | Free       | Schedules, scores, metadata      | Default `1` for free tier       |
| Score24            | `SCORE24_API_KEY`          | Free tier  | 60+ sports, 5000+ leagues        | Fixtures, results, standings   |
| BALLDONTLIE        | `BALLDONTLIE_API_KEY`      | Free       | NBA only                          | Optional key; 60 req/min        |

## Env vars (see `.env.example`)

```
ROLLING_INSIGHTS_API_KEY=
ROLLING_INSIGHTS_BASE_URL=https://api.rollinginsights.com
JSONODDS_API_KEY=
JSONODDS_BASE_URL=https://api.jsonodds.com
THESPORTSDB_API_KEY=1
SCORE24_API_KEY=
SCORE24_BASE_URL=https://api.score24.com
BALLDONTLIE_API_KEY=
```

## Usage

- **Cron:** `app/api/cron/daily-results/route.ts` calls `fetchPreviousDayResultsFromProviders(league, date)` when Odds API and API-Sports return no scores for that league.
- **Programmatic:** `import { fetchPreviousDayResultsFromProviders, fetchAllLeaguesResultsForDate } from '@/lib/data-sources/results-apis'` (or relative path). Use for backfills or scripts.

## Endpoint shapes

Provider base URLs and response shapes may differ from the defaults in code. Adjust `ROLLING_INSIGHTS_BASE_URL`, `JSONODDS_BASE_URL`, etc., and the parsing in `lib/data-sources/results-apis.ts` to match each provider’s docs once you have keys.
