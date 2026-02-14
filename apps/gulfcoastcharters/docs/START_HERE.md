# START HERE – Setup (No-BS)

Get the Gulf Coast Charters app running. Time depends on your machine and whether DB is already set up; “5 minutes” is optimistic if you still need to create a Supabase project and run migrations.

---

## Prerequisites

- Node.js 18+
- A Supabase project (create at [supabase.com](https://supabase.com) if needed)
- Your project’s URL and keys (anon + service_role if you’ll run migrations or admin flows)

---

## Setup options

### Option A: Automated (if the script works)

From the **app root** (e.g. `apps/gulfcoastcharters/`):

```bash
npm run setup
```

If that fails, use Option B.

### Option B: Manual

**1. Database**

- Open your Supabase project → SQL Editor.
- Use the schema that matches this repo. In this repo you have:
  - `COMPLETE_DATABASE_SETUP.sql` (app root)
  - `database-schema.sql`, `database-permissions.sql`
  - `supabase/migrations/` for incremental migrations
- Run the appropriate SQL (full setup or migrations) so tables, RLS, and functions exist. If you use an existing project, you may already have some of this; run only what’s missing.

**2. Environment**

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with:

- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — only if you need server-side admin (and keep it secret)

Add Stripe and any other keys the app expects (see `.env.example` or docs).

**3. Install and run**

```bash
npm install
npm run dev
```

Open `http://localhost:3000` (or the port shown). If the app loads but DB calls fail, fix env or run the missing DB steps.

---

## Verify

- Sign up / log in if auth is enabled.
- Check one admin route (e.g. `/admin`) if you have an admin user; RLS and roles must be set up.
- See `FEATURE_IMPLEMENTATION_STATUS.md` for what’s been tested and what’s still pending.

---

## Deployment

- **Vercel:** Connect repo, set env vars, deploy. Use same env as `.env.local` (no service role in client if you can avoid it).
- **Netlify:** Same idea; build command and publish dir per Next.js.
- **Edge functions:** Deploy Supabase functions from `supabase/functions/` with Supabase CLI; set secrets (Stripe, etc.) in Supabase.

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| DB connection / RLS errors | Supabase URL and anon key; that the right SQL has been run for your project. |
| “Module not found” | `npm install` from app root; correct Node version. |
| Points / functions missing | DB setup: `award_points`, `user_stats`, and related objects must exist. |
| Admin access | Admin role / RLS policies for your user; see `CHECK_ADMIN_*.sql` or similar in repo if present. |

---

## What’s in the app

- **Auth:** Email (and possibly OAuth) via Supabase.
- **Captains:** Profiles, search, ratings — see captain-related pages and components.
- **Bookings:** Create/manage bookings; payment via Stripe when configured.
- **Community:** Reports, photos, comments, likes — see Community routes and components.
- **Gamification:** Points, badges, leaderboards — backend in DB, UI in app.
- **Admin:** Routes under `/admin/*` in `App.tsx` (e.g. monetization, captain review, security, campaigns).

Don’t assume every doc feature is implemented. Use this file to get running; use `COMPREHENSIVE_PLATFORM_GUIDE.md` (no-BS) and `FEATURE_IMPLEMENTATION_STATUS.md` for what’s real.

---

**Stack:** Next.js, Supabase (PostgreSQL), Tailwind; Stripe for payments.  
**Last updated:** February 2026 (no-BS pass).
