# Praxis

Trading analytics app with arbitrage scanning (Kalshi + Polymarket), AI insights, and paid tiers (Starter $9, Pro $29, Enterprise $99). Stripe subscriptions, Clerk auth, Supabase for persistence.

## What it does

- **Arbitrage scanner** — Cross-platform (Kalshi + Polymarket) market matching and profit detection
- **Dashboard** — Trades, positions, portfolio view
- **AI chat** — Claude-powered analysis and recommendations
- **Subscriptions** — Starter / Pro / Enterprise via Stripe
- **Free trial** — 7-day trial with `free_trial_ends_at` in DB

## Quick start

```bash
cd apps/praxis
pnpm install
pnpm dev
```

Runs at **http://localhost:3002**

## Environment variables

Create `.env.local` or use KeyVault (`scripts/keyvault/set-secret.ps1` + `sync-env.ps1`):

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk auth |
| `CLERK_SECRET_KEY` | Yes | Clerk server |
| `NEXT_PUBLIC_APP_URL_PRAXIS` | Prod | App URL for redirects (e.g. `https://praxis.cevict.ai`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side |
| `STRIPE_SECRET_KEY` | Yes | Stripe (test or live) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing |
| `STRIPE_PRICE_ID_STARTER` | Yes | Starter tier price |
| `STRIPE_PRICE_ID_PRO` | Yes | Pro tier price |
| `STRIPE_PRICE_ID_ENTERPRISE` | Yes | Enterprise tier price |
| `ANTHROPIC_API_KEY` | For AI | Claude for chat |

See `.env.example` and `docs/WEBHOOK-SETUP.md`.

## Database

Run in Supabase SQL Editor:
- `supabase/subscriptions.sql`
- `supabase/migrations/20260205_free_trial_ends_at.sql`
- `supabase/migrations/20260211_praxis_subscriptions_pro.sql` (if using Pro DB)

## Production readiness

See `docs/PRODUCTION_READINESS_AUDIT.md` before deploying. Critical: Stripe Live keys, webhook, cron security, AI route auth.

## Tech stack

- Next.js 14, React 19
- Clerk (auth)
- Stripe (subscriptions)
- Supabase (DB)
- Anthropic (AI)

---

Part of the CEVICT monorepo.
