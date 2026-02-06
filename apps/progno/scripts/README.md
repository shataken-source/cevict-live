# Progno Scripts

Scripts for daily runs, fetching data, training, and diagnostics.

**Full audit (what does what):** [SCRIPTS-AUDIT.md](./SCRIPTS-AUDIT.md)

## Quick reference

| Use | Script |
|-----|--------|
| **Daily predictions** | `get-predictions.ps1` — saves `predictions-YYYY-MM-DD.json` |
| **Daily results** | `get-results.ps1` — saves `results-YYYY-MM-DD.json` |
| **Run for today** | `run-progno-today.ts` or `trigger-pick-generation.ts` (cron endpoint) |
| **Run for dates** | `run-progno-for-dates.ts` |
| **Add API keys** | `add-anthropic-key.mjs`, `add-news-api-key.mjs` |
| **Fetch historical** | `fetch-2024-historical-data.mjs` or `fetch-available-results.ts` |
| **Import results** | `import-results.ts` |
| **Training / sim** | `pnpm simulate`, `pnpm simulate:2024`, `pnpm calculate:winrate` (see package.json) |
| **Diagnostics** | `check-monday-cron.ps1`, `diagnose-picks.sh` |

Older or redundant scripts are in [archive/](./archive).
