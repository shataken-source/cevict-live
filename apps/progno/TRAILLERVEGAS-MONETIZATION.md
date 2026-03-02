# Trailervegas.com monetization (no-BS)

Use the no-BS rule: don’t overbuild, don’t promise what you can’t ship, and validate with the smallest version first.

---

## Is this a stupid idea?

**No.** Selling backtesting data and/or offering “grade your picks against our outcomes” is a real product. People pay for clean historical outcomes and for backtest reports. The dumb part would be overcomplicating it (e.g. “upload source code and we run it”) before proving anyone will pay for the simple version.

---

## What to do first (money machine, minimal)

1. **Trailervegas = landing + one clear product**
   - **“Grade your picks”** – They upload a CSV/JSON of picks (date, home_team, away_team, pick, confidence, odds, league). You grade against your `game_outcomes` (and any stored odds if needed). You return: win rate, ROI, by league, maybe a PDF or simple dashboard. **Paid per report** (e.g. $5–20) or **subscription** (e.g. $X/month for N reports).
   - No “upload source code” at first. Running arbitrary code is a security, support, and liability mess. “Upload picks, we grade” is enough and sellable.

2. **Sell data (optional, second)**
   - You already have `historical_odds`, `game_outcomes`, `prediction_results`. Aggregated “outcomes only” (game_date, home, away, winner, scores, league) is the safest to sell – often derived from public scores (ESPN, etc.) or your own grading. **Check Odds API (and any other provider) ToS:** reselling raw odds feed is usually restricted; aggregated outcomes or “backtest results” are more defensible. When in doubt, sell outcomes + summary stats, not raw API dumps.

3. **Don’t overthink “save more data” yet**
   - Use what you have. Add new storage only when a concrete product needs it (e.g. “we need closing lines by book for a premium dataset”).

---

## What to avoid (no-BS)

- **“Upload source code and we backtest it”** – Sandboxing, languages, dependencies, support, and liability. Skip until you have revenue and a clear spec.
- **Vague “money machine”** – Pick one thing: “Upload picks → we grade” is the machine. Data sales or subscriptions are add-ons once that works.
- **Using the domain for something unrelated** – Trailervegas.com fits “Vegas / betting / sharp tools” (e.g. backtesting, data). Keep the brand aligned so it’s not confusing.

---

## Minimal build (to test while you’re testing)

| Piece | Purpose |
|-------|--------|
| **Landing page** (trailervegas.com) | One headline, “Grade your picks” CTA, pricing (e.g. $10/report or “Contact for data”). |
| **Upload flow** | Form or S3-style upload: CSV/JSON with columns like `date, home_team, away_team, pick, odds, stake, league`. |
| **Backend** | One API or serverless: load file, match rows to `game_outcomes` (and optional odds), compute win rate + ROI + by-league, return JSON or trigger a report. Reuse your existing grading logic (e.g. team matcher, outcome lookup). For in-house, this is `/api/progno/admin/trailervegas/grade`. |
| **Payment** | Stripe “pay $10 then get report” or “subscribe $X/month for 5 reports.” Start with one-time so you don’t need billing logic. |
| **Report** | Simple: “You went 42–38 (52.5% WR), +4.2% ROI. By league: NBA 55%, NHL 48%…” plus optional PDF. |

You don’t need to “save other data” for v1. You need: outcomes to grade against (you have), a clear upload format, and a way to take money.

---

## Data you already have (what’s usable)

- **game_outcomes** – Date, home, away, winner, scores. Core for grading any picks.
- **historical_odds** – Useful for “what were the odds that day?” in reports. Check ToS before selling raw.
- **prediction_results** – Your own graded picks; good for “our methodology” or internal benchmarks, not necessarily for customer uploads.

Monetization = **grade their picks with your outcomes** (and optionally show odds from your DB in the report). Data product = **sell aggregated outcomes or summary datasets** once you’re clear on provenance and ToS. For now, everything lives behind the admin secret at `/progno/admin/trailervegas` for internal testing only.

---

## In-house test flow (what to click)

1. **Open internal page**
   - URL: `/progno/admin/trailervegas`
   - Enter your **admin / CRON secret** in the password field.

2. **Prepare a test file**
   - CSV headers (recommended): `date,home_team,away_team,pick,odds,stake,league`.
   - Example row:
     - `2026-02-28,Los Angeles Lakers,Phoenix Suns,home,-110,100,NBA`

3. **Upload + run**
   - Choose the CSV/JSON file in the “UPLOAD PICKS” section.
   - Click **Run backtest**.
   - The page calls `/api/progno/admin/trailervegas/grade` (auth via your secret).

4. **Read results**
   - Status card shows: win rate, ROI, total picks.
   - Summary card shows JSON:
     - `counts` (total/graded/wins/losses/pending/unmatched/unsupported)
     - `performance` (winRate, roi, totalStake, totalProfit)
     - `byLeague` breakdown
     - `sampleLimit` to indicate how many graded rows are included in the sample.

5. **Iterate**
   - Once this feels right, you can:
     - Move the UI into a dedicated TrailerVegas app,
     - Put Stripe/auth in front of it,
     - Keep the current admin page as the internal console.

---

## Summary

- **Not stupid.** Scope it: “Upload picks → we grade with our data → paid report” is the machine. Add data sales later if it makes sense.
- **Skip “upload source code.”** Do “upload picks file” only.
- **Use trailervegas.com** for this one thing while you test; keep branding aligned with Vegas/betting/backtesting.
- **You don’t need new data storage for v1** – use existing `game_outcomes` and grading logic. Add storage when a real product need appears.
