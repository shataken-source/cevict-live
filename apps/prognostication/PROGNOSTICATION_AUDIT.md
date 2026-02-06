# Prognostication — Audit & Recommendations (Feb 2026)

One-time full pass: progno ↔ prognostication integration, tier placement (free / pay regular / pay ultra), and what to change, add, remove, or leave as-is. You said we can burn it down and start over; below is a mix of fixes done and a concrete roadmap.

---

## 1. Integration status (Progno → Prognostication)

### What’s working
- **Progno as source:** Prognostication `GET /api/picks/today` calls Progno `GET /api/picks/today` (via `PROGNO_BASE_URL`). Picks are mapped into `EnginePick[]` and split into **free / pro / elite** in `allocateTiers()`.
- **Tier logic:** Free = 1 pick (60–70% confidence). Pro = 3 strong picks (70–85%). Elite = all remaining picks. No overlap.
- **Free display:** `/free-picks` fetches `/api/picks/today` (no auth) and shows `data.free` only. Correct.

### What was broken (and is fixed)
- **`/api/user/tier`** always returned `free`. It now uses **Stripe** (customer by email or `session_id`, active subscription, price IDs) to return `pro` or `elite`. Same logic as `/api/picks/today` tier check.
- **Pro/Elite had nowhere to see picks.** There was no page that passed `email` or `session_id` to `/api/picks/today` and rendered `pro` / `elite`. That’s added: **`/my-picks`** (see below).

### What you asked for: “Pay ultra get enhanced pick”
- **“Enhanced pick”** in Progno = **EnhancedPicksCard** (confidence, projected score, edge, key factors, Claude Effect). That lives in **progno** (e.g. `apps/progno/app/components/EnhancedPicksCard.tsx`).
- **Prognostication** doesn’t use that component; it has its own API shape (`EnginePick`: game, pick, confidencePct, edgePct, keyFactors, rationale, simulationResults, predictedScore).
- **Done:** A local **`EnhancedPickCard`** in prognostication (`components/EnhancedPickCard.tsx`) that takes `EnginePick` and supports:
  - **Pro:** header + pick + confidence + edge + risk/score.
  - **Elite:** same + key factors, rationale, simulation results (the “enhanced” experience).
- **Elite** picks are shown with `variant="elite"` on `/my-picks`, so Pay Ultra (Elite) gets the enhanced card. Pro gets the same card with less detail.

**Note:** `EnhancedAccuracyDashboard` in progno is a **performance/ROI dashboard** (charts, accuracy by league, etc.). It calls `/api/performance`, which exists in progno, not in prognostication. If you want that dashboard on prognostication, you’d add a route (or proxy) that serves or proxies that data; it’s separate from “enhanced pick” cards.

---

## 2. Where picks appear (free / pay regular / pay ultra)

| Tier   | Where they see picks | Source |
|--------|----------------------|--------|
| Free   | `/free-picks`        | `GET /api/picks/today` → `free` (no auth). |
| Pro    | `/my-picks`          | `GET /api/picks/today?email=…` or `?session_id=…` → `pro` (Stripe-verified). |
| Elite  | `/my-picks`          | Same API → `pro` + `elite`; elite list uses `EnhancedPickCard` with `variant="elite"`. |

- **Login:** `/login` uses email → `/api/user/tier` and stores `user_email` (e.g. in localStorage) and redirects pro/elite to dashboard; you can point that dashboard to `/my-picks` if you want.
- **Post-checkout:** Checkout `success_url` is `/success?session_id={CHECKOUT_SESSION_ID}`. A **`/success`** page was added: it redirects to **`/my-picks?session_id=...`** so after payment the user lands on their picks. Optional: change `success_url` to point straight to `/my-picks?session_id={CHECKOUT_SESSION_ID}` and drop `/success` if you prefer.

---

## 3. Fine-tuner (Elite)

- **`/elite-fine-tuner`** is the page that lets users “fine-tune” bets (factor weights, simulation, analyze-game). It’s in **`app/elite-fine-tuner/page.tsx`**. It already:
  - Checks tier via `/api/user/tier` (now fixed with Stripe).
  - Fetches pro + elite picks from `/api/picks/today` when building the game list.
  - Calls Progno for simulation and “analyze-game” (e.g. v2 prediction with Claude Effect).
- **Leave as-is** for now; with the fixed tier, Elite users will get in and see the right data.

---

## 4. Recommendations: change / add / remove / leave

### Fixes already done
- **`/api/user/tier`** — Stripe-backed pro/elite; same price IDs as checkout and picks/today.
- **`/my-picks`** — Tier-gated Pro/Elite picks with `EnhancedPickCard` (elite = enhanced view).
- **`/success`** — Redirect to `/my-picks?session_id=...` after checkout.
- **`EnhancedPickCard`** — New component for Pro/Elite; Elite gets key factors, rationale, simulation.

### Change (recommended)
- **Nav / entrypoints:** Add a “My Picks” link (e.g. in `EnhancedNavbar` or main nav) that goes to `/my-picks`. For logged-in pro/elite, this is the main picks destination.
- **`/premium-picks`:** Right now it’s marketing only (price, “Subscribe Now” button not wired). Either:
  - Wire “Subscribe Now” to the same checkout flow as `/pricing`, and/or
  - Make it redirect to `/my-picks` for already-paid users (e.g. if tier from cookie/query is pro/elite).
- **`/picks/free`** — Uses **hardcoded fake picks**. Either remove this route and use **`/free-picks`** as the single “free” entry, or make `/picks/free` redirect to `/free-picks`. Same idea: one canonical free picks page.
- **`/picks/premium`** — Pure gate (“Premium Picks Access Required”). Consider redirecting to `/my-picks` when user has tier pro/elite, otherwise to `/pricing` or `/login`.

### Add (optional)
- **Performance dashboard for Elite:** If you want the Progno-style accuracy dashboard (EnhancedAccuracyDashboard) on prognostication, add an API in prognostication (e.g. `GET /api/performance` that proxies to Progno or replicates the metric logic) and a page that uses it. Not required for “enhanced pick” to work.
- **Docs folder:** No `docs/` today. Optional: add a short `docs/INTEGRATION.md` (progno URL, Stripe price IDs, tier → picks flow) for future you or other devs.

### Remove or consolidate
- **Duplicate free picks:** Prefer a single free picks experience: keep **`/free-picks`** (live API), and either remove **`/picks/free`** or make it redirect to `/free-picks`.
- **Duplicate premium entrypoints:** Consolidate “premium” and “pro” into one mental model: e.g. “Pro” = pay regular, “Elite” = pay ultra; use `/pricing` and `/my-picks` as the main paths and simplify or remove `/premium-picks` and `/picks/premium` if they don’t add value.

### Leave as-is (for now)
- **`/picks` (Kalshi):** Different product (Kalshi picks from Alpha-Hunter). Keep as-is unless you want to merge or rename.
- **`/elite-bets`:** Simulations, parlay/teaser suggestions; good Elite-only tools. Keep.
- **`/elite-fine-tuner`:** Fine-tune weights and run analyze-game. Keep.
- **Checkout and pricing:** Stripe flow and price IDs are consistent with tier and picks/today. Keep.
- **Admin (monitor, performance, picks, revenue, users):** No change needed for integration.

---

## 5. Completely new page (optional)

If you want one “home base” for paid users:
- **Dashboard (e.g. `/dashboard`):** After login or success, show:
  - One block: “Today’s picks” (link or embed of `/my-picks` content).
  - One block: “Elite tools” (links to `/elite-bets`, `/elite-fine-tuner` for elite only).
  - Optional: account summary (tier, next billing), support link.
- This is optional; `/my-picks` alone can be the main post-login landing if you prefer.

---

## 6. Summary

- **Progno ↔ prognostication:** Picks flow from Progno into prognostication; free/pro/elite allocation is correct; **user tier now comes from Stripe** so pro/elite actually get their picks.
- **Free / Pay regular / Pay ultra:** Free → `/free-picks`. Pro and Elite → **`/my-picks`** with Stripe-verified tier; **Elite uses the enhanced pick card** (key factors, rationale, simulation).
- **Enhanced pick:** Implemented as **`EnhancedPickCard`** in prognostication with an **elite** variant; no dependency on progno’s React components.
- **Fine-tuner:** Unchanged; with fixed tier it works for Elite.
- Next steps you might take: add “My Picks” to nav, consolidate free/premium routes, optionally add a dashboard or performance API and page.
