# Testing and Fine-Tuning Progno Picks

This document describes how to test the full prediction pipeline, fine-tune every variable, and run automated tuning (7-day historical + 10k simulations).

---

## 1. Overview

The pipeline has three main test/tune surfaces:

| What | Script / Command | Purpose |
|------|------------------|--------|
| **Full 7-day simulation** | `npm run simulate:7day` | Run the real pick engine on last 7 days of `historical_odds`, grade vs `game_outcomes`, report WR and ROI. |
| **7-day parameter sweep** | `npm run simulate:7day:tune` | Run the 7-day sim with multiple env configs (home-only, league floors), pick best by ROI. |
| **Cevict Probability Analyzer** | `npm run tune:probability-analyzer` | 7-day data, WITH vs WITHOUT 16-model analyzer; parameter sweep + bootstrap (default 1000, use `--runs=10000` for 10k). |
| **Today’s predictions** | `npm run predictions:today` | Same pipeline as 7-day sim but only games for today; no grading. |

Saved tuning can live in **Supabase `tuning_config`** (admin UI) or in **env** (`.env.local`). The app uses tuning config when present, else env defaults.

---

## 2. Prerequisites

- **Supabase:** `historical_odds` and `game_outcomes` populated (e.g. via `track-odds` cron and `daily-results` cron).
- **Env:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` in `apps/progno/.env.local`.
- **Node:** From repo root, `cd apps/progno` for all commands below.

---

## 3. Commands Reference

```bash
cd apps/progno

# Full 7-day sim (print steps + optional grading)
npm run simulate:7day

# 7-day sim, machine-parseable result only (for tuner)
npx tsx scripts/run-7day-simulation.ts --tune

# Parameter sweep over home-only and league floors
npm run simulate:7day:tune

# Cevict Probability Analyzer: 7-day A/B + parameter sweep
npm run tune:probability-analyzer

# Analyzer with 10,000 bootstrap runs
npx tsx scripts/probability-analyzer-simulation.ts --runs=10000

# Today’s picks only (no grading)
npm run predictions:today
```

---

## 4. Tunable Variables

### 4.1 Filters and floors

| Variable | Where | Meaning | Typical range |
|----------|--------|---------|----------------|
| `HOME_ONLY_MODE` | home-only filter | If `1`/`true`, drop all away picks. | `0` (off) or `1` (on). 7-day tune favored off. |
| `PROGNO_FLOOR_NBA` | league-floor filter | Min confidence % for NBA. | 56–64 |
| `PROGNO_FLOOR_NHL` | league-floor filter | Min confidence % for NHL. | 55–63 |
| `PROGNO_FLOOR_NFL` | league-floor filter | Min confidence % for NFL. | 58–64 |
| `PROGNO_FLOOR_MLB` | league-floor filter | Min confidence % for MLB. | 55–61 |
| `PROGNO_FLOOR_NCAAB` | league-floor filter | Min confidence % for NCAAB. | 60–68 |
| `PROGNO_FLOOR_NCAAF` | league-floor filter | Min confidence % for NCAAF. | 60–66 |
| `PROGNO_FLOOR_CBB` | league-floor filter | Min confidence % for CBB. | 64–72 |
| `PROGNO_MIN_CONFIDENCE` | league-floor filter | Default floor when league not in map. | 54–60 |

### 4.2 Cevict Probability Analyzer (16-model ensemble)

| Variable | Where | Meaning | Typical range |
|----------|--------|---------|----------------|
| `BLEND_WEIGHT` | probability-analyzer-signal | How much analyzer blends into pick. | 0.1–0.5 |
| `CONFIDENCE_WEIGHT` | probability-analyzer-signal | Weight of confidence in ensemble. | 0.5–1.0 |
| `EDGE_WEIGHT` | probability-analyzer-signal | Weight of edge in ensemble. | 0.3–0.8 |
| `SPREAD_WEIGHT` | probability-analyzer-signal | Weight of spread in ensemble. | 0.3–0.7 |
| `FLIP_THRESHOLD` | probability-analyzer-signal | Ensemble prob above which pick can flip. | 45–60 |
| `SPORT_MULTIPLIERS.NBA` etc. | probability-analyzer-signal | Per-sport multiplier (0 = no analyzer effect). | 0–1.5 |

### 4.3 Value bet (pick-engine)

| Variable | Where | Meaning | Typical range |
|----------|--------|---------|----------------|
| `VALUE_MIN_EDGE` | pick-engine (hardcoded or future env) | Min edge % for “high” value override. | 8–12 |
| `VALUE_MED_EDGE` | pick-engine | Min edge % for “medium” value override. | 4–6 |

---

## 5. How the Admin Fine-Tune Page Works

1. **Load:** Reads current config from `/api/progno/admin/tuning-config` (Supabase + env fallback).
2. **Edit:** You change any variable in the form.
3. **Test:** “Run test” sends the form as overrides to `/api/progno/admin/tuning/run-test`. The API runs the 7-day sim with those env overrides (child process), parses `TUNE_RESULT`, and returns WR, ROI, graded count, top picks. No saving.
4. **Save:** “Save config” POSTs the form to `/api/progno/admin/tuning-config`, which writes to Supabase `tuning_config`. Live picks: GET /api/picks/today calls loadTuningConfigAndApply() at the start of each request, so saved config is used for all pick generation (and cron daily-predictions when it calls picks/today).
5. **Auto fine-tune:** “Auto fine-tune” sends start date and bootstrap runs (e.g. 10000) to `/api/progno/admin/tuning/auto-tune`. The API runs the Probability Analyzer simulation (and optionally the 7-day floor sweep) with that window and runs, then returns suggested params. You can then click “Apply to form” and “Save” to persist.

Run test and analyzer: The run-test API runs the 7-day sim in a child process with form values as env overrides. The Probability Analyzer reads params from getTuningConfigSync() when present; when null (e.g. in the child), it falls back to process.env (BLEND_WEIGHT, FLIP_THRESHOLD, etc.), so Run test uses the form's analyzer settings.

---

## 6. Database: `tuning_config`

Create in Supabase (SQL):

```sql
create table if not exists tuning_config (
  id text primary key default 'default',
  config jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Optional: RLS so only service role can write
alter table tuning_config enable row level security;
create policy "Service role only" on tuning_config for all using (true);
```

The `config` JSON can mirror env keys, e.g.:

```json
{
  "HOME_ONLY_MODE": "0",
  "PROGNO_FLOOR_NBA": 58,
  "PROGNO_FLOOR_NHL": 57,
  "PROGNO_FLOOR_NCAAB": 62,
  "BLEND_WEIGHT": 0.1,
  "CONFIDENCE_WEIGHT": 1,
  "EDGE_WEIGHT": 0.8,
  "FLIP_THRESHOLD": 45,
  "SPORT_MULTIPLIERS": { "NBA": 0, "NHL": 0, "NCAAB": 0, "NCAA": 0.3 }
}
```

---

## 7. Debugging Tips

- **No games in 7-day sim:** Check `historical_odds` has rows in the last 7 days; run `track-odds` cron or backfill.
- **No outcomes / 0 graded:** Ensure `game_outcomes` is populated for that window (e.g. `daily-results` cron).
- **Test with today only:** Use `npm run predictions:today` to see current picks without grading.
- **Analyzer sweep slow:** Reduce `--runs` (e.g. 1000) while iterating; use 10000 for final tune.
- **Admin “Run test” timeout:** Run-test has a high maxDuration (e.g. 300s); if it still times out, run `npm run simulate:7day --tune` locally with the same env overrides and paste the result.

---

## 8. File Reference

| File | Role |
|------|------|
| `scripts/run-7day-simulation.ts` | 7-day sim; `--tune` prints `TUNE_RESULT=`. |
| `scripts/run-7day-tune.ts` | Sweeps home-only + league floors; spawns 7-day sim per trial. |
| `scripts/probability-analyzer-simulation.ts` | Analyzer A/B + parameter sweep; `--runs=N` for bootstrap. |
| `app/lib/modules/filters/league-floor-filter.ts` | Uses tuning config or `PROGNO_FLOOR_*`. |
| `app/lib/modules/filters/home-only-filter.ts` | Uses tuning config or `HOME_ONLY_MODE`. |
| `app/lib/modules/signals/probability-analyzer-signal.ts` | Uses tuning config or hardcoded analyzer params. |
| `app/api/progno/admin/tuning-config/route.ts` | GET/POST tuning config (Supabase). |
| `app/api/progno/admin/tuning/run-test/route.ts` | Run 7-day sim with overrides, return result. |
| `app/api/progno/admin/tuning/auto-tune/route.ts` | Run analyzer sim (e.g. 10k runs), return best params. |
| `app/progno/admin/fine-tune/page.tsx` | Admin UI: form, Test, Save, Auto fine-tune. |

---

*Last updated: after adding admin fine-tune page and 10k simulation option.*
