# Empire Strategy Asset Map (What to Include and Why)

This is a high-level map of the **trading / prediction / arbitrage assets** across your repos and how they fit together. It’s meant as a checklist of what we should actually use (and how), not just a file index.

---

## 1. Progno – Sports Engine & Tuning

**Core code (already in use)**
- Picks API: `apps/progno/app/api/picks/today/route.ts`
- Engine + modules: `apps/progno/app/lib/modules/*`, `monte-carlo-engine`, `true-edge-engine`, `probability-analyzer-signal`, filters (league floors, home-only).
- Tuning + learning: `tuning-config.ts`, admin fine-tune page, `learning-bot.ts`, `app/api/progno/admin/tuning/*`.

**Claude Effect data collection (Phase 1)**
- `lib/data-collection/collectors.ts` + `config.ts`.
- Admin dry‑run endpoint: `POST /api/progno/admin/data-collection/preview` (no DB writes), which shows which feeds (news, weather, injuries, odds) work for a given team/date.

**Why include it**
- This is the **canonical sports signal generator** for the empire. Everything else (Alpha Hunter, TrailerVegas, arbitrage bots) should treat Progno as the ground truth for edges and confidence.
- The data‑collection layer gives you **inputs for the 7‑D Claude Effect** (sentiment, line movement, weather, injuries) in a controlled, inspectable way.

**Next usage steps**
- Phase 2+: add Supabase tables for sentiment/line‑movement/weather/injuries and implement `store()` in the collectors.
- Implement lightweight **risk/volatility signals** that consume those tables and adjust confidence a few points (not wholesale flips).

---

## 2. TrailerVegas – “Grade Your Picks” Product

**Where**
- Internal grader API: `apps/progno/app/api/progno/admin/trailervegas/grade/route.ts`.
- Admin UI: `apps/progno/app/progno/admin/trailervegas/page.tsx`.
- Product doc: `apps/progno/TRAILLERVEGAS-MONETIZATION.md`.

**What it does**
- Upload CSV/JSON (`date,home_team,away_team,pick,odds,stake,league`), match to `game_outcomes`, grade win/lose/pending/unmatched, compute WR + ROI (overall and by league).

**Why include it**
- This is the simplest, clearest **cash‑flow product**: “Upload picks → we grade with real outcomes → paid report”. It monetizes your existing history without changing live trading.

**Next usage steps**
- Keep internal endpoint for QA.
- Front it with a small TrailerVegas app + Stripe when you’re ready for users.

---

## 3. Alpha Hunter – Kalshi/Coinbase Execution + Learning

**Where**
- Main bot: `apps/alpha-hunter/src/index.ts` (`TradingBot` looping over Kalshi + Coinbase + Progno).
- Supabase memory: `apps/alpha-hunter/src/lib/supabase-memory.ts` (bot_predictions, trade_history, learnings, metrics).
- Category learners: `apps/alpha-hunter/src/intelligence/category-learners.ts`.
- Bot Academy (expert bots per category): `apps/alpha-hunter/src/intelligence/bot-academy.ts` + `train-bot-academy.ts`.
- Category training script: `apps/alpha-hunter/src/train-category-bots.ts`.

**Why include it**
- This is the **learning + execution layer** for Kalshi/crypto:
  - Records predictions and outcomes in Supabase.
  - Trains category‑specific and expert bots so future decisions get better.

**Next usage steps**
- Run the training scripts regularly (even in simulation mode) so expert bots accumulate historical data and are ready when you flip on full execution.
- Feed Alpha Hunter’s trade history + bot metrics into:
  - Trading Dashboard, and
  - future TrailerVegas “strategy reports” for markets beyond sports.

---

## 4. Polymarket–Kalshi Arbitrage Bot (Rust)

**Where**
- `apps/Polymarket-Kalshi-Arbitrage-bot/` (Rust project).
- Main doc: `apps/Polymarket-Kalshi-Arbitrage-bot/docs/Polymarket-Kalshi-Arbitrage-bot/README.md`.

**What it provides**
- A **high-performance Rust arbitrage engine** with:
  - Cross‑platform matching (Kalshi–Polymarket team/event code mapping).
  - Real‑time orderbook monitoring via WebSockets.
  - Arbitrage detection when `YES + NO < 1.00` across or within platforms.
  - Concurrent order execution + circuit breaker (max position, max daily loss, etc.).

**Why include it**
- You already have value/arbitrage logic in JS/TS, but this bot gives you:
  - **Battle‑tested arbitrage detection + execution patterns** (especially for orderbook‑level CLOB data).
  - A clear, well‑documented example of **circuit breakers and position caps** in a high‑speed environment.

**Next usage steps**
- Use the Rust project as a **reference implementation** for:
  - Refining JS/TS arbitrage detection (e.g., thresholds, fee handling, circuit breaker settings).
  - If/when you want high‑throughput cross‑market arb, deploy it as its own service and feed its opportunities into Alpha Hunter / Empire C2 rather than rewriting everything in TS.

---

## 5. Progno Massager (Python)

**Where**
- `apps/progno-massager/progno-massager/`.
- Docs: `docs/progno-massager/README.md`, `UNIVERSAL-PROGNO-GUIDE.md`.

**What it provides**
- Streamlit app + Python logic for:
  - 11 massager commands (noise trimming, momentum/time‑decay adjustments, injury/sentiment tweaks, arb/hedge calculators).
  - AI Safety 2025: supervisor, approval workflow, audit trail, math verification.
  - Supabase‑backed “memory” for historical predictions.

**Why include it (carefully)**
- As a **manual quant/analyst workbench**:
  - Good for prototyping hedge sizes, arb math, and risk filters before we port specific ideas into TS.
- You **do not** want Python subprocesses in the hot path for every trade.

**Next usage steps**
- Pull specific math that adds value:
  - Hedge calculator (stake sizing to neutralize / reduce risk).
  - Simple volatility / risk flags.
- Re‑implement those pieces as TS helpers inside Progno / Alpha Hunter rather than wiring Massager directly into live trading.

---

## 6. Arbitrage & Hedge Logic (JS/TS vs Rust/Python)

**Existing JS/TS arbitrage**
- Progno value engine + `arbitrage-detector` (sports).
- Alpha Hunter trade safety, profit‑take logic, and risk gates.

**Rust arbitrage bot**
- Polymarket–Kalshi arbitrage engine: highly optimized CLOB + circuit breaker design.

**Python hedging (Massager)**
- Arbitrage/hedge calculators with math verification and reasonability checks.

**What to include going forward**
- Keep **core execution logic in TS/Node** for integration with Alpha Hunter and Progno.
- Use Rust arbitrage bot as:
  - A separate high‑speed service when you need it, or
  - A design template for circuit breakers and order handling.
- Use Massager as:
  - A source of **formulas and safety checks**, re‑implemented in TS where we need them.

---

## 7. Empire C2 – Control & Dashboard Layer

**Where**
- `apps/empire-c2` (Next.js).
- Doc: `apps/empire-c2/docs/PROJECT-DESCRIPTION.md`:
  - “Empire C2 is the control/dashboard layer. Next.js app meant to host terminal execution (/api/admin/execute-command), health monitoring for core sites, and Source Surgeon triggers.”

**Why include it**
- This is the **ops console** that should sit above:
  - Progno (picks + tuning + learning),
  - Alpha Hunter (Kalshi + Coinbase bots),
  - Polymarket–Kalshi arbitrage service,
  - TrailerVegas (external product),
  - Progno Massager (manual quant tool).

**Next usage steps**
- Use Empire C2 (or Launchpad) as the unified:
  - Status board (health, latencies, balances, errors) for all bots/services.
  - Place to trigger:
    - Training runs (Bot Academy, category bots, learning‑bot backfills),
    - Review‑bundle exports,
    - Controlled “go live” switches for specific strategies.

---

## 8. Review & Audit Bundles

**Where**
- `apps/progno/scripts/Export-PrognoAuditBundle.ps1`
- `apps/progno/scripts/Export-PrognoSportsAndCoinbaseReview.ps1`

**Why include them**
- They produce AI‑readable bundles combining:
  - Progno sports logic + tuning + docs,
  - Alpha Hunter + Coinbase logic and schemas,
  - (in the review version) context for trading dashboards.
- These are the **entry points for external audits or second‑opinion AI reviews** without exposing live keys or databases.

**Next usage steps**
- Whenever you make a meaningful architectural change (new signal, new arbitrage flow, new risk rule):
  - Regenerate a bundle and have an external/AI reviewer sanity‑check the logic.

---

## 9. What *not* to wire into the hot path (for now)

- **Progno Massager as a subprocess in Alpha Hunter** – use its math and ideas, not the runtime.
- **Empire C2 execute‑command API for bots** – avoid letting a web UI execute arbitrary bot commands in production until access control and approval flows are nailed down.
- **Any “autonomous controller” (ANAI, etc.) that can start/stop services on its own** – keep human‑in‑the‑loop via Empire C2 while the system is still evolving.

---

## 10. One‑sentence summary

- **Progno**: generate edges and probabilities.  
- **Alpha Hunter**: learn from outcomes and execute (Kalshi/crypto) with risk controls.  
- **TrailerVegas**: monetize history by grading other people’s picks.  
- **Polymarket–Kalshi bot**: specialized high‑speed arb engine.  
- **Progno Massager**: manual quant/safety workbench, not a live dependency.  
- **Empire C2 / Launchpad**: central command and monitoring.  
- **Review bundles**: how you let outside AIs look inside safely.

