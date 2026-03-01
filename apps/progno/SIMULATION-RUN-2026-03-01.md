# 7-Day Simulation Run — 2026-03-01

## 1. Data flow verification (evidence from run)

| Check | Evidence | Status |
|-------|----------|--------|
| **7-day window** | Script uses last 7 days from **latest** `historical_odds.captured_at`. Console: `Using 7-day window: 2026-02-22 to 2026-03-01`. | ✅ Correct |
| **Odds range in DB** | `Odds range: 2026-02-18 to 2026-03-01` — full span of data; window is a subset. | ✅ |
| **Outcomes range** | `game_outcomes` queried with `game_date` from `outStart` (odds start −1 day) to `outEnd` (odds end +1 day) so late/early games are included. Code: L593–602. | ✅ Correct |
| **Time alignment** | Reconstructed games use `commence_time` from odds; matching to outcomes is by team names + `game_date` (outcomes). No UTC/Chicago mix — outcomes use `game_date` string. | ✅ |
| **Counts** | 132,820 odds rows → 585 unique games (by `game_id`) → 186 matched to outcomes; 1000 outcomes fetched. | ✅ Flowing |

**Conclusion:** Data is flowing correctly and the 7-day window and date ranges are applied as designed.

---

## 2. Simulation results (this run)

- **Timestamp:** 2026-03-01T23:11:52Z  
- **Bootstrap runs:** 1000  
- **Games analyzed:** 186 matched (399 unmatched = pending/no outcome)  
- **League breakdown:** NCAAB 94, NCAA 64, NBA 25, NHL 3  

### Baseline (WITHOUT probability analyzer)

| Metric | Value |
|--------|--------|
| Win rate | 48.37% |
| ROI | -8.06% |
| Avg final bankroll | $8,563 |
| % profitable sims | 14% |
| Max drawdown | 22.11% |

### With analyzer (tuned)

| Metric | Value |
|--------|--------|
| Win rate | 50% |
| ROI | -5.75% |
| Avg final bankroll | $8,967 |
| % profitable sims | 21.4% |
| Max drawdown | 19.61% |

### Verdict

- **ROI improvement:** +2.31 pp (from -8.06% to -5.75%).  
- **Profitable sims:** +7.4 pp (14% → 21.4%).  
- **Verdict:** `HELPS` — analyzer improves outcomes in this 7-day window.

### Optimal params (this run)

- blend 0.1, confidence 1, edge 0.8, spread 0.3, flip 45, underdog 0  
- Sport multipliers: NBA 0, NHL 0, NCAAB 0, **NCAA 0.3** (others default 1)

---

## 3. Comparison to previous simulation run (Feb 28)

Previous `simulation-results.json` (from earlier audit) was from a **different** run:

| Item | Previous (Feb 28) | This run (Mar 1) |
|------|-------------------|------------------|
| Timestamp | 2026-02-28T19:22:29Z | 2026-03-01T23:11:52Z |
| Bootstrap runs | 20,000 | 1,000 |
| Games analyzed | 274 | 186 |
| Unmatched | 502 | 399 |
| Baseline win rate | 55.72% | 48.37% |
| Baseline ROI | +6.03% | -8.06% |
| With-analyzer win rate | 56.83% | 50% |
| With-analyzer ROI | +7.6% | -5.75% |
| Verdict | HELPS (+1.57 pp ROI) | HELPS (+2.31 pp ROI) |

Different windows and samples (274 vs 186 games, different dates), so absolute ROI/win rate are not comparable. In **both** runs the analyzer **helps** (positive ROI delta and HELPS verdict).

---

## 4. “Today’s database” vs simulation vs fixes

These are separate things:

- **7-day simulation**  
  Uses `historical_odds` + `game_outcomes` for **past** games in a 7-day window. It does **not** read `actual_bets` or today’s predictions. It only compares WITH vs WITHOUT the probability analyzer.

- **Today’s database (live)**  
  - **actual_bets:** Rows with `game_date` = today (CST). Served by `GET /api/progno/wallboard/bets` (and used by Command Center / admin).  
  - **Predictions:** Stored in Supabase Storage as `predictions-YYYY-MM-DD.json` (and optionally in DB). Filled by “Run both” / daily-predictions cron.

- **Fixes we made (admin Kalshi submit)**  
  - Execute and preview now use **America/Chicago** for “today” (same as cron and wallboard).  
  - If local prediction files are missing, they **fall back to Supabase Storage** for `predictions-{today}.json` and `predictions-early-{today}.json`.  
  So after “Run both,” all 7 picks are available to “Submit to Kalshi” instead of only 1.

**Comparing “after fixes” vs “without fixes” for today:**

- **Without fixes:** Execute used UTC “today,” so it could look for the wrong date and load 0 or 1 pick; preview same.  
- **With fixes:** Execute/preview use Chicago “today” and Supabase fallback, so they see the same 7 picks that were saved by “Run both.”

So:

- **Simulation:** Confirms data flow and timing for the 7-day analyzer A/B test; results are in `simulation-results.json`.  
- **Today’s DB:** To see “what’s in the database for today” you can call `GET /api/progno/wallboard/bets` (with progno running on 3008) — response has `date`, `bets[]`, and `summary` (total, wins, losses, pending, stake, P&amp;L, ROI). That is the live state for today; the simulation does not change it.  
- **Fixes:** They fix the **number of picks** (and correct date) used for Kalshi submit and bet selection, not the simulation script itself.

---

## 5. How to re-run

```bash
cd C:\cevict-live\apps\progno
npx tsx scripts/probability-analyzer-simulation.ts
```

Optional: more bootstrap runs for smoother stats:

```bash
npx tsx scripts/probability-analyzer-simulation.ts --runs=20000
```

Results are written to `apps/progno/simulation-results.json`.
