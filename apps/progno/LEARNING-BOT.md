# Learning Bot (Experimental)

A small bot that uses **actual graded results** to suggest (or optionally apply) tuning changes. Everything in this doc is **experimental** until we see how it affects performance.

---

## 1. What We're Doing Now (No BS)

### Post-results learning (implemented)

- **When:** Runs after results exist — either manually from the admin fine-tune page, or automatically after the `daily-results` cron when `LEARNING_BOT_RUN_AFTER_RESULTS=1`.
- **What it does:** Reads `prediction_results` (and optionally `prediction_daily_summary`) for the last N days. By league, it looks at win rate at different confidence bands (e.g. picks with confidence ≥58 vs ≥60 vs ≥62). If raising the floor would have improved win rate on that slice, it suggests a new floor. Same idea for a global min confidence. It does **not** change analyzer weights (BLEND_WEIGHT, etc.) from results alone — those need 7-day sims; the bot only suggests **floor/min-confidence** tweaks from actual outcomes.
- **Output:** A list of suggested overrides (e.g. `PROGNO_FLOOR_NBA: 60`). You can review and apply from the fine-tune page, or set `EXPERIMENTAL_LEARNING_BOT_AUTO_APPLY=1` to have it merge suggestions into `tuning_config` automatically (use with caution).
- **Gating:** All auto-apply behavior is behind env flags; default is suggest-only.

This gives you one concrete thing: **data-driven floor suggestions** after each grading run, without touching the rest of the pipeline.

---

## 2. What We're Not Doing (Yet)

- **Real-time learning during runs** — No mid-run parameter updates. Learning runs in a separate step after results are in.
- **Early lines + Kalshi tuning** — Idea: after early-line predictions are generated, fetch Kalshi markets and adjust thresholds or pick list for that day. Possible later; needs a clear spec (what we tune, which markets).
- **Crypto.com submission** — Submitting picks to Crypto.com is a separate integration (key needed). The learning bot does not submit anywhere; it only suggests/apply tuning. Submission (Kalshi, Crypto.com, etc.) stays in its own layer.
- **Parlays/teasers from picks** — Building parlays/teasers from today’s picks and submitting to Kalshi is a product feature. The bot could later tune *how* we build parlays (min legs, max odds) from historical parlay results, but that’s a later phase.

---

## 3. Ideas for Later (Experimental)

- **Run after daily-results:** Cron runs grading → then (same cron or a chained one) run the learning bot so the next day’s predictions already use suggested floors. Keep auto-apply off until we’re happy with suggestions.
- **Early-line pass:** After early predictions are written, a job could compare to Kalshi markets (prices, liquidity) and adjust which picks to submit or confidence cutoffs for that day only.
- **Parlay/teaser tuning:** Store parlay/teaser outcomes (when we have them) and tune construction params (e.g. min confidence per leg, max total odds) from that history.
- **Submission pipeline:** One pipeline: “predictions → optional learning tweak → submit to Kalshi and/or Crypto.com.” Learning only affects the “optional learning tweak” step; adapters handle each destination.

---

## 4. Env Flags

| Variable | Meaning |
|----------|--------|
| `LEARNING_BOT_RUN_AFTER_RESULTS` | If `1`, run the learning bot after the daily-results cron (suggest only unless auto-apply is on). |
| `EXPERIMENTAL_LEARNING_BOT_AUTO_APPLY` | If `1`, when the bot runs it merges suggestions into `tuning_config` and saves. Default: off. |

---

## 5. Files

| File | Purpose |
|------|---------|
| `app/lib/learning-bot.ts` | Analyze recent `prediction_results`, suggest floor/min-confidence changes, optional apply. |
| `app/api/progno/admin/learning-bot/route.ts` | POST: run bot, return suggestions (and applied if auto-apply). |
| `app/progno/admin/fine-tune/page.tsx` | “Learning bot” section: Run, show suggested changes, Apply to form. |
| `app/api/cron/daily-results/route.ts` | Optionally invokes learning bot at end when `LEARNING_BOT_RUN_AFTER_RESULTS=1`. |

---

## 6. How to Use

1. **Manual:** Open Progno Admin → FINE-TUNE → run “Learning bot”. Review suggested floors → “Apply to form” → Save if you want.
2. **After results:** Set `LEARNING_BOT_RUN_AFTER_RESULTS=1`. After each daily-results run, the bot runs and logs suggestions (and applies only if `EXPERIMENTAL_LEARNING_BOT_AUTO_APPLY=1`).
3. **Experimental:** Turn on auto-apply only when you’re comfortable; monitor impact over a few days and revert from the fine-tune page if needed.
