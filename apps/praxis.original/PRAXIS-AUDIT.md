# PRAXIS (praxis.original) — Audit Report

**App:** PRAXIS — AI-powered prediction-market trading analytics (Kalshi + Polymarket)
**Stack:** Next.js 14, React 18, TypeScript, Tailwind, Zustand, Recharts, Clerk (deps only), Stripe
**Audit date:** 2026-02-04

---

## 1. Overview

| Area | Status | Notes |
|------|--------|--------|
| **Purpose** | Clear | Trading dashboard: CSV import, P&L analytics, arbitrage scanner, AI insights |
| **Structure** | Good | `src/app` (routes + API), `src/components`, `src/lib`, `src/types` |
| **Types** | Strong | Central `src/types/index.ts` — Trade, PortfolioStats, ArbitrageOpportunity, etc. |
| **State** | Zustand | Persisted store (trades, settings); filter state; no server session |

---

## 2. What Works

- **Dashboard:** Stats (P&L, win rate, Sharpe, Sortino, max drawdown, Kelly), cumulative P&L chart, win/loss pie, recent trades, CSV import/export.
- **Trades / Positions:** Filter (all/open/settled), sort (date/P&L), open positions + total exposure.
- **Analytics:** Dedicated view (see `AnalyticsView.tsx`).
- **Arbitrage:** API at `/api/arbitrage` — `fetchAllMarkets()` (Kalshi + Polymarket), `findSimilarMarkets()` (word-overlap similarity), `detectArbitrageOpportunities()` (yes+no combo &lt; 0.99). GET (scan) and POST (custom ticker/id comparison). Kalshi uses **demo** client by default (`kalshiDemo`).
- **Markets API:** `/api/markets` — fetch by platform (kalshi | polymarket | all), limit, status.
- **AI:** `/api/ai-chat` — Anthropic Messages API; key from body or `ANTHROPIC_API_KEY`; model `claude-sonnet-4-20250514`.
- **Stripe:** Checkout (subscription, demo `userId`), webhook (subscription lifecycle, in-memory `subscriptions` Map). Pricing page with Free / Pro ($29) / Enterprise ($299); `priceId` in pricing is literal `price_pro` / `price_enterprise` (must be real Stripe Price IDs in prod).
- **CSV:** Kalshi + Polymarket parsers; generic parser; export to CSV.
- **Utils:** Formatting, `calculatePortfolioStats`, `calculateDailyStats`, Sharpe/Sortino/drawdown/Kelly.

---

## 3. Gaps & Issues

### 3.1 Auth (Clerk)

- **Clerk is in `package.json` but not used.** No `ClerkProvider` in layout, no `SignedIn`/`SignedOut`.
- **Sign-in/sign-up** (`sign-in/[[...sign-in]]/page.tsx`, `sign-up/[[...sign-up]]/page.tsx`) are placeholders: “Authentication is being set up. For now, enjoy full access.”
- **Impact:** Dashboard is effectively public. Stripe checkout uses `userId = demo_${Date.now()}`; webhook stores subscriptions in an in-memory Map (lost on restart).

**Recommendation:** Either wire Clerk (layout provider, protect `/` and `/pricing`), or remove Clerk and document “no auth” for this reference app.

---

### 3.2 Stripe

- **Checkout:** Requires `STRIPE_SECRET_KEY`; uses placeholder `userId`; success/cancel URLs use `NEXT_PUBLIC_APP_URL` (default not set in `.env.example`).
- **Pricing page:** Sends `priceId: 'price_pro' | 'price_enterprise'` — these must be real Stripe Price IDs (e.g. `price_1xxx`) in production; document in `.env.example` (`STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_ENTERPRISE`).
- **Webhook:** Subscription state stored in process memory; not durable. Plan: persist in DB (e.g. Supabase) keyed by real user id once auth exists.

---

### 3.3 Vercel cron

- **`vercel.json`** defines a cron:
  ```json
  "path": "/api/cron/arbitrage-scan",
  "schedule": "*/5 * * * *"
  ```
- **That route does not exist.** API is at `/api/arbitrage` (GET).
- **Fix:** Either add `src/app/api/cron/arbitrage-scan/route.ts` that calls the same logic as the arbitrage GET, or change the cron path to an existing route (e.g. a thin wrapper that calls `/api/arbitrage` or shared `scanForArbitrage()`).

---

### 3.4 Kalshi / Polymarket config

- **Kalshi:** `lib/api/kalshi.ts` exports `kalshiDemo` (used by `lib/api/index.ts`). Demo uses demo API base; production would need env-driven client and keys. `.env.example` has `KALSHI_DEMO_API_KEY`, `KALSHI_PROD_API_KEY`, `KALSHI_ENVIRONMENT` — ensure `fetchAllMarkets` and markets route use the chosen env.
- **Polymarket:** Read-only Gamma/CLOB usage is fine; no wallet in layout. Settings store Polymarket wallet for “connection” display; trading not wired in this app.

---

### 3.5 ArbitrageView UI vs API

- **ArbitrageView** defines its own `ArbitrageOpportunity` shape and uses **mock data** (`MOCK_OPPORTUNITIES`) by default.
- **Real API** returns a different shape: `crossPlatform`, `singlePlatform.kalshi` / `polymarket`, `summary`, etc.
- **Impact:** UI can show fake arbs; need to wire the view to `GET /api/arbitrage` and map response to the component’s props (or adapt the component to the API shape).

---

### 3.6 Dashboard time range

- **Dashboard** shows time-range buttons (1W, 1M, 3M, ALL) but they don’t update the chart (no `selectedTimeRange` or filter applied to `dailyStats`). `useFilteredTrades` uses `filterState.dateRange` for the trade list but the P&L chart uses all `dailyStats`.

---

### 3.7 Alerts

- **Nav:** “Alerts” with badge count; click does nothing (`onClick={() => {}}`). No alerts view/page.
- **Store:** `alerts`, `addAlert`, `acknowledgeAlert`, `clearAlerts` exist but nothing triggers `addAlert` (no price/drawdown/arb logic).

---

### 3.8 Minor

- **Stripe API version:** `2025-12-15.clover` — confirm this is the desired Stripe API version.
- **Missing route:** No `/api/cron/arbitrage-scan` (see 3.3).
- **Root layout:** No Clerk wrapper; no global error boundary.

---

## 4. File Summary

| Path | Role |
|------|------|
| `src/app/page.tsx` | Main dashboard (stats, chart, trades, CSV, nav); single large file |
| `src/app/layout.tsx` | Root layout, metadata, dark theme |
| `src/app/pricing/page.tsx` | Pricing + Stripe checkout trigger |
| `src/app/sign-in/[[...sign-in]]/page.tsx` | Placeholder sign-in |
| `src/app/sign-up/[[...sign-up]]/page.tsx` | Placeholder sign-up (not read; assume same) |
| `src/app/api/arbitrage/route.ts` | GET scan, POST compare |
| `src/app/api/markets/route.ts` | GET markets by platform |
| `src/app/api/ai-chat/route.ts` | Anthropic proxy |
| `src/app/api/stripe/checkout/route.ts` | Stripe Checkout Session |
| `src/app/api/stripe/webhook/route.ts` | Stripe webhook, in-memory subscriptions |
| `src/lib/store.ts` | Zustand store (trades, alerts, settings, filter, viewMode) |
| `src/lib/api/index.ts` | Unified markets, normalize, findSimilarMarkets, detectArbitrage, scanForArbitrage |
| `src/lib/api/kalshi.ts` | Kalshi client (demo/prod), getMarkets, etc. |
| `src/lib/api/polymarket.ts` | Polymarket Gamma/CLOB, getEvents, parse prices |
| `src/lib/csv-parser.ts` | Kalshi/Polymarket CSV → Trade[]; export |
| `src/lib/utils.ts` | format*, calculatePortfolioStats, calculateDailyStats, Sharpe/Sortino/Kelly/drawdown |
| `src/types/index.ts` | Trade, Position, Market, PortfolioStats, ArbitrageOpportunity, etc. |
| `src/components/AnalyticsView.tsx` | Analytics view |
| `src/components/AIInsightsView.tsx` | AI insights (uses apiKey from settings) |
| `src/components/ArbitrageView.tsx` | Arbitrage UI (currently mock data) |
| `src/components/SettingsView.tsx` | Settings (Kalshi, Polymarket, Anthropic, alerts, display, trading) |
| `.env.example` | Clerk, Stripe, Kalshi, Polymarket, Supabase, Sinch, SendGrid, PostHog |
| `vercel.json` | Cron `/api/cron/arbitrage-scan` (missing), API headers, /dashboard → / |

---

## 5. Recommendations (priority)

1. **Fix or remove cron:** Add `src/app/api/cron/arbitrage-scan/route.ts` that calls `scanForArbitrage()` (and optionally persists or notifies), or point the cron to an existing route.
2. **Wire ArbitrageView to real API:** Replace mock data with `fetch('/api/arbitrage')` and map `crossPlatform` / `singlePlatform` to the component (or refactor component to accept API shape).
3. **Auth:** Either integrate Clerk in layout and protect routes + use real `userId` in Stripe metadata, or remove Clerk and document unauthenticated usage.
4. **Stripe:** Persist subscription state (e.g. Supabase) keyed by user id; use real Stripe Price IDs in env and in pricing page.
5. **Dashboard time range:** Connect time-range buttons to filter `dailyStats` (or `trades`) so the P&L chart and stats respect 1W/1M/3M/ALL.
6. **Alerts:** Implement a simple Alerts view and trigger `addAlert` from drawdown/arbitrage (or remove the nav item until ready).

---

## 6. Security / Env Checklist

- **Secrets:** All API keys in env; `.env.example` documents them. No keys in repo.
- **Stripe webhook:** Signature verified with `STRIPE_WEBHOOK_SECRET`.
- **AI:** Key from request body or env; no auth on `/api/ai-chat` (anyone can call with their key in body).
- **Arbitrage/Markets:** No auth; Kalshi/Polymarket use server-side env keys for server fetch.

---

---

## 7. Implemented (2026-02-04)

All audit recommendations were implemented:

1. **Cron** — Added `src/app/api/cron/arbitrage-scan/route.ts`; GET calls `scanForArbitrage()`, returns summary; optional `CRON_SECRET` or Vercel cron header.
2. **ArbitrageView** — Uses real API only; initial state empty, loading until first scan; always sets opportunities from API response (no mock fallback).
3. **Clerk** — `ClerkProvider` in root layout; `middleware.ts` with `clerkMiddleware()`; sign-in/sign-up pages use `<SignIn />` / `<SignUp />`; dashboard wrapped in `SignedIn`/`SignedOut` with sign-in prompt when signed out.
4. **Stripe** — Checkout accepts `plan` ('pro'|'enterprise') and resolves price ID from `STRIPE_PRICE_ID_PRO` / `STRIPE_PRICE_ID_ENTERPRISE`; accepts `userId` from body (Clerk). Pricing page sends `plan` and `userId` from `useAuth()`. Webhook persists via `src/lib/subscription-store.ts` (Supabase when env set, else in-memory). Table: `subscriptions (user_id, status, plan, current_period_end)`.
5. **Dashboard time range** — `filterTradesByTimeRange()` in utils; stats and dailyStats computed from time-filtered trades; 1W/1M/3M/ALL buttons call `setTimeRange()` and highlight active range; "View All" goes to Trades view.
6. **Alerts** — `AlertsView` component; nav item opens alerts view; drawdown alert when max drawdown exceeds settings threshold (once per session); arbitrage alert when scan finds opportunities.

*End of audit.*
