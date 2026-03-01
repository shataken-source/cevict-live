# The Two Systems: Analyzers and Today’s Changes

## 1. Which “analyzer” is which

### A. 16-model probability analyzer (cevict-probability-analyzer)

| Item | Location | Role |
|------|----------|------|
| **Standalone app** | `C:\cevict-live\apps\progno\cevict-probability-analyzer\` | HTML/JS UI; runs 16 models (Bayesian, XGBoost, Neural Net, LSTM, etc.) on picks. |
| **Served by progno** | `GET /api/serve/analyzer` → `cevict-probability-analyzer/index.html` | Same app, injected with API base + date so it can load picks from progno. |
| **Production signal** | `apps/progno/app/lib/modules/signals/probability-analyzer-signal.ts` | Same 16-model logic; used **inside** the pick engine when generating predictions. Can flip the pick when ensemble disagrees with baseline. |
| **Simulation** | `apps/progno/scripts/probability-analyzer-simulation.ts` | Inline copy of the 16-model logic; runs WITH vs WITHOUT analyzer on last 7 days of `historical_odds` + `game_outcomes`; tunes params and reports HELPS/HURTS. |

So the “analyzer” that “helps” in the simulation is this **16-model ensemble**. It lives in:

- **cevict-probability-analyzer** = the app you open (or serve via /api/serve/analyzer).
- **probability-analyzer-signal.ts** = what actually runs when progno generates picks (same math, params from simulation).

### B. Sportsbook-terminal

| Item | Location | Role |
|------|----------|------|
| **App** | `C:\cevict-live\apps\sportsbook-terminal\` | Dashboard + API (Express). **Does not implement an analyzer.** |
| **Data source** | Reads **progno output**: `apps/progno/predictions-{date}.json` and `predictions-early-{date}.json` | Serves those picks via `/api/picks/today`, `/api/kalshi-picks.json` (with fallback), and feeds the UI. |
| **Scheduler** | `scripts/scheduler.ts` | Archives predictions/results to `C:\cevict-archive\Probabilityanalyzer`; can import Kalshi/Polymarket from progno API. |

So **sportsbook-terminal** is a **consumer** of progno. The “analyzer” that affects the picks it shows is the same 16-model one inside progno (probability-analyzer-signal). Sportsbook-terminal just displays and serves whatever progno wrote to the prediction files.

---

## 2. Do both still “help” before and after today’s changes?

### 16-model analyzer (cevict-probability-analyzer + probability-analyzer-signal)

- **Today’s code changes:** None. We did **not** change `probability-analyzer-signal.ts` or the simulation script’s analyzer logic.
- **Before/after:** Same behavior. The 7-day simulation run today (2026-03-01) again reported **HELPS** (ROI +2.31 pp with analyzer, more profitable sims).
- **Conclusion:** The 16-model analyzer **still helps**; no regression from today’s changes.

### Sportsbook-terminal

- **Today’s code changes:** We **did** change sportsbook-terminal:
  - **Before:** `today` for “which prediction file to load” was **UTC** (`new Date().toISOString().split('T')[0]`). In evening CT that could be tomorrow’s date, so it could miss today’s file.
  - **After:** `today` is **America/Chicago** via `getTodayChicago()` in:
    - `findTodaysPrognoFile()`
    - `GET /api/picks/today`
  So it now looks for the same date as progno’s cron and execute/preview (`predictions-YYYY-MM-DD.json`).
- **Before/after:** Before: risk of wrong date and no picks when opening the terminal in evening CT. After: correct date, so it loads today’s progno file when it exists.
- **Conclusion:** Sportsbook-terminal **still helps** (still serves progno picks and UI) and is **more reliable** after the change because it uses the same “today” as progno.

---

## 3. Summary table

| System | What it is | Changed today? | Still helps? |
|--------|------------|----------------|--------------|
| **cevict-probability-analyzer** | 16-model ensemble app (HTML + served by progno) | No | Yes (unchanged; simulation still HELPS) |
| **probability-analyzer-signal** | Same 16 models inside progno pick engine | No | Yes |
| **7-day simulation** | Tests WITH vs WITHOUT analyzer on Supabase 7-day data | No | Yes (run today: HELPS) |
| **sportsbook-terminal** | Consumer of progno prediction files; dashboard + API | Yes (today = Chicago) | Yes; more reliable for “today” |

---

## 4. Other “today” changes (progno only)

These were done earlier today and are separate from the two systems above:

- **Progno execute/preview (Kalshi submit):** “Today” set to America/Chicago; fallback to Supabase Storage when local prediction files are missing; bare-array prediction files accepted. So “Submit to Kalshi” sees all 7 picks after “Run both.”
- **Wallboard (Command Center):** Fixed ESPN sport map typo (MLB, NCAA) in `app.js`.

None of these change the 16-model analyzer logic or the simulation. They only fix date/loading and display.
