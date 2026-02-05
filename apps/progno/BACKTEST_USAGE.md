# Backtest: How to Use Min Confidence, Edge, etc.

You control the backtest with **environment variables**. Set them **before** you run the script (or inline in the same command).

## Where to set them

**Option A – cross-env (recommended on Windows)**  
So all vars reach the script when using `npm run`:

```powershell
cd apps/progno
npm install   # installs cross-env if needed

# Stricter: min confidence 60%, min edge 2%, Kelly sizing
npx cross-env BACKTEST_MIN_CONFIDENCE=0.6 BACKTEST_MIN_EDGE=0.02 BACKTEST_BET_SIZE=kelly npm run backtest:run

# Even stricter
npx cross-env BACKTEST_MIN_CONFIDENCE=0.9 BACKTEST_MIN_EDGE=0.05 BACKTEST_BET_SIZE=kelly npm run backtest:run
```

**Option B – Set env on separate lines (PowerShell)**  
Setting vars then running on the next line avoids parsing issues:

```powershell
cd apps/progno
$env:BACKTEST_MIN_CONFIDENCE="0.6"
$env:BACKTEST_MIN_EDGE="0.02"
$env:BACKTEST_BET_SIZE="kelly"
npm run backtest:run
```

**Option C – Run tsx directly**  
Bypasses npm so env is guaranteed:

```powershell
cd apps/progno
$env:BACKTEST_MIN_CONFIDENCE="0.9"
$env:BACKTEST_MIN_EDGE="0.02"
npx tsx scripts/run-backtest-historical.ts
```

The script prints **Config: minConfidence=… minEdge=… betSize=…** and **Games meeting threshold: N** so you can confirm your settings and see how many games qualified for a bet.

---

## Platform constraints (why results don’t change with your limits)

These limits are **platform constraints**, not the system ignoring your settings:

- **Games meeting threshold** is the number of games where the model’s confidence and edge passed your `minConfidence` and `minEdge`. The script prints this so you can see whether your thresholds are actually filtering.
- **With the current PredictionEngine and historical game data** (no live API/team stats), the model returns **high confidence and high edge for every game**. So **Games meeting threshold** stays at **285** (all games) no matter what you set for `BACKTEST_MIN_CONFIDENCE` or `BACKTEST_MIN_EDGE`. That’s why wagered, ROI, and return look the same when you change those variables—every game still qualifies.
- So you’re not seeing “disobedience”; you’re hitting a **constraint**: the backtest is correctly applying your limits, but the model’s outputs don’t vary enough for those limits to exclude any games. To see threshold effects (fewer bets, different ROI), the model would need to return a wider range of confidence/edge, or you’d need different data.

**Why do I get the same results when I change variables?**  
If **Config** shows your new values but **Games meeting threshold** is still 285 and wagered/ROI unchanged, that’s the constraint above. If **Config** still shows the old values, the env vars didn’t reach the script—use **Option A (cross-env)** or **Option B (separate lines)**.

---

## Claude Effect (“With” vs “Without”)

The backtest calls the **real Claude Effect** when `BACKTEST_USE_CLAUDE` is not `false`: it uses `gatherClaudeEffectData` and `applyClaudeEffect` (same as the v2 route). If those steps fail (e.g. sentiment/narrative APIs not running), it falls back to the base prediction, so **With Claude Effect** and **Without Claude** can show the same numbers when you run the backtest **standalone** (no Next.js server). To see a real difference:

- Run the backtest while the Progno app is running (e.g. `npm run dev` in another terminal), so `/api/sentiment/calculate`, `/api/narrative/calculate`, etc. are available; or  
- Set `BACKTEST_USE_CLAUDE=false` to force “without” and compare to a run with the server up.

**Option B – In a `.env` file**  
Create or edit `apps/progno/.env` (do not commit secrets). Example:

```env
BACKTEST_MIN_CONFIDENCE=0.6
BACKTEST_MIN_EDGE=0.02
BACKTEST_BET_SIZE=kelly
BACKTEST_BANKROLL=10000
```

Then run `npm run backtest:run`. The script will read these if your setup loads `.env` (e.g. dotenv in a wrapper). If you run `tsx scripts/run-backtest-historical.ts` directly, Node does **not** load `.env` unless you use something like `dotenv/config`. So for guaranteed use, **Option A (inline)** is simplest.

## What each variable does

| Variable | Meaning | Default |
|----------|----------|---------|
| `BACKTEST_MIN_CONFIDENCE` | Only place a bet if model confidence ≥ this (0–1, e.g. 0.6 = 60%). | 0.5 |
| `BACKTEST_MIN_EDGE` | Only place a bet if edge ≥ this (0–1, e.g. 0.02 = 2%). | 0 |
| `BACKTEST_BET_SIZE` | How much to bet per game: `fixed`, `kelly`, or `percentage`. | fixed |
| `BACKTEST_BANKROLL` | Starting bankroll (used for fixed % and Kelly). | 10000 |
| `BACKTEST_JSON` | Path to the games file (from fetch step). | .progno/backtest-games.json |
| `BACKTEST_START` / `BACKTEST_END` | Date range (YYYY-MM-DD). | 2024-01-01 / 2024-12-31 |
| `BACKTEST_LEAGUES` | Leagues to include, comma-separated, e.g. `NFL,NBA`. | NFL |
| `BACKTEST_USE_CLAUDE` | Set to `false` to turn off Claude Effect. | true |

## Quick reference

1. **Get games:**  
   `npm run backtest:fetch`  
   → writes `.progno/backtest-games.json`.

2. **Run backtest (defaults):**  
   `npm run backtest:run`

3. **Stricter (fewer bets, higher bar):**  
   `npx cross-env BACKTEST_MIN_CONFIDENCE=0.6 BACKTEST_MIN_EDGE=0.02 BACKTEST_BET_SIZE=kelly npm run backtest:run`

All of this is also summarized in the header comment of `scripts/run-backtest-historical.ts`.
