# PRAXIS Audit — Extracted & Mapped

**Purpose:** Pull the PRAXIS vision from your notes into one place and audit it against what you actually have. No docx dependency — everything below is from the text you pasted.

---

## What PRAXIS Was Supposed to Be

**Domain:** cevict.ai
**Tagline:** "Trade Smarter. Not Harder." / "Your Edge, Quantified." / "Where Probability Meets Profit."

**Core idea:** The *one* platform for probability traders that does:

- **Kalshi + Polymarket + (optional) Coinbase** in one place
- **Live API data** (not just CSV)
- **AI analysis** (Claude: "why did I lose money?", natural-language trade entry, predictive alerts)
- **Execution** (one-click trade, arb execution)
- **Risk & analytics** (Sharpe, drawdown, Kelly, correlation, tilt detector, tax docs)

**“Small but big” features (from spec):**

| # | Feature | Why it matters |
|---|--------|-----------------|
| 1 | What-If Calculator | Instant position math, Kelly size, break-even % |
| 2 | Settlement Alerts + P&L Preview | Reduces anxiety, shows stake before resolve |
| 3 | Insider Flow (Polymarket) | Polysights-style; they raised $2M on this alone |
| 4 | Regret Tracker | "Trades you almost made" → FOMO + pattern learning |
| 5 | Cross-Platform Price Comparison / Arb | Kalshi vs Polymarket arb, automated |
| 6 | Time Machine Backtesting | "What if I’d followed this strategy?" |
| 7 | Tilt Detector | Revenge-trading warning |
| 8 | News → Trade Pipeline | Breaking news → related markets + quick trade |
| 9 | Portfolio Correlation Matrix | Hidden concentration risk |
| 10 | Copy Trader Leaderboards | Social proof + follow winners |
| 11 | The Graveyard | Worst trades + lessons (learn from pain) |
| 12 | Voice Commands (mobile) | "Hey Praxis, what’s my P&L?" / place order |
| 13 | Tax Document Generator | CSV/1099-style export, TurboTax-friendly |
| 14 | Market Maker Mode | Spread capture, limit orders both sides |
| 15 | Dumb Money Indicator | Retail vs whale flow divergence |

**Tiers (from spec):** Free (CSV, basic stats) → Pro $29 (live, AI, alerts) → Trader $79 (execution, arb, SMS) → Fund $299 (API, white-label).

**Legal:** Spec said proprietary, personal use unless you explicitly license; you can sell it and still use/modify your own version.

---

## What You Actually Have (Current State)

| Piece | Location | What it is | Overlap with PRAXIS |
|-------|----------|------------|----------------------|
| **kalshi-dash** | `apps/kalshi-dash` | Next.js 14, CSV upload, PnL chart, trade list, maker/taker pie, series stats. **Client-side only**, no Kalshi API. | PRAXIS “layer 1”: CSV analytics. No live data, no AI, no Polymarket, no execution. |
| **prognostication** | `apps/prognostication` | Marketing site + Kalshi UI. Free/premium picks (from Progno), Kalshi picks from Supabase, trades + live stats from `trade_history`. | Shows trades and stats; no CSV upload, no arb UI, no “What-If”, no AI chat, no Polymarket. |
| **progno** | `apps/progno` | Sports picks engine (Cevict Flex). Odds API, daily predictions/results JSON. | Feeds prognostication picks; not a trader dashboard. |
| **alpha-hunter** | `apps/alpha-hunter` | CLI bot. Kalshi/Progno integration, writes `bot_predictions` / `trade_history` to Supabase, best-kalshi, etc. | Back-end “execution + data”; no unified dashboard UI. |
| **monitor** | `apps/monitor` | Ops dashboard (uptime, command center, alerts). Had audit: hardcoded phone, TODO SMS, shell exec security issues. | Internal ops; not a trader product. Could morph into “bot monitoring for traders” later. |
| **praxis** | `apps/praxis` | **Empty.** Claude started scaffolding (types, DB schema, Zustand, layout) Jan 18; files are gone. | PRAXIS was supposed to live here. |
| **trading-dashboard** | `apps/trading-dashboard` | **Empty.** Same mod date as praxis; likely same aborted build or copy. | Same as praxis — shell only. |

---

## Audit Summary

**What’s true:**

- **PRAXIS** = full vision doc (the “small but big” list + AI + tiers + cevict.ai). No code left; **praxis** and **trading-dashboard** are empty.
- **kalshi-dash** = working but narrow: CSV-only, Kalshi-only, no API, no AI, no Polymarket. It’s the “jsteng19-style” baseline.
- **prognostication** = live Kalshi *display* (picks, trades, stats from Supabase) and marketing; not the full “trader cockpit” PRAXIS described.
- **alpha-hunter + progno** = the infra (data, execution, picks). No single UI that ties them into the PRAXIS feature set.

**Gaps vs PRAXIS spec:**

- No single app that does: **live Kalshi + Polymarket + CSV + AI + arb + risk + execution** in one UI.
- No What-If calculator, regret tracker, tilt detector, tax generator, voice, or cross-platform arb UI.
- Polymarket is not integrated anywhere in your apps yet (only in the spec).
- “Sell it and use it” / white-label is still just spec; no product to package.

**Could it make money?**

- Spec argument: Polysights raised $2M on one feature; you’re spec’ing 50+ with AI. Even 1% of a growing market = real upside.
- Realistic take: **Yes, but only if built.** Right now the revenue potential is in the *idea* and in **prognostication** (subscriptions) + **alpha-hunter** (your edge). PRAXIS would be a *new* product (cevict.ai) that could sit alongside: use it yourself and/or sell Pro/Trader/Fund tiers.

---

## Recommendations

1. **Treat PRAXIS as the product spec**
   Keep the “small but big” doc and the tier list as the north star. Don’t rely on the old praxis/trading-dashboard folders; they’re empty.

2. **Decide where to build**
   - **Option A:** Rebuild PRAXIS in `apps/praxis` (or under `cevict.ai` in the monorepo) using the spec + existing infra (Supabase, Alpha-Hunter patterns, Progno where relevant).
   - **Option B:** Evolve **kalshi-dash** into “PRAXIS Lite” (add live API, then AI, then Polymarket) and keep prognostication as the marketing site.
   - **Option C:** Fold the most valuable PRAXIS features into **prognostication** (e.g. What-If, settlement alerts, basic arb view) so one app is “picks + trades + light analytics” and later spin cevict.ai out as the “pro” dashboard.

3. **Monitor**
   Keep using it as internal ops. If you ever productize “AI-powered trading bot monitoring for retail,” that’s a separate pivot; the PRAXIS audit doesn’t depend on it.

4. **Polymarket**
   You’re off the waitlist. Any real “PRAXIS” build should include Polymarket (even if only read-only at first) for cross-market arb and the insider-flow angle.

---

## One-Line Takeaway

**PRAXIS** is the full vision (cevict.ai, all platforms, AI, “small but big” features). **Nothing in the repo implements that vision yet** — praxis/trading-dashboard are empty, kalshi-dash is CSV-only, prognostication is picks + trades. The spec is still the best roadmap; next step is pick where to build (new app vs kalshi-dash vs prognostication) and start with one slice (e.g. live Kalshi + What-If, or CSV + AI “why did I lose?”).
