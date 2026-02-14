# START HERE – Gulf Coast Charters (No-BS)

**This repo:** Next.js + Supabase charter booking app (Gulf Coast Charters).  
**Docs in this folder:** `apps/gulfcoastcharters/docs/`. Many docs were written early; treat as intent or reference until you confirm in code.

---

## What’s in the repo

- **App:** `apps/gulfcoastcharters/` — Next.js/React, TypeScript, Supabase, Stripe.
- **Supabase:** Edge functions in `supabase/functions/`; migrations in `supabase/migrations/` (if present).
- **Docs:** `docs/` — platform guide, feature status, setup, and various guides. Use `COMPREHENSIVE_PLATFORM_GUIDE.md` (no-BS) and `FEATURE_IMPLEMENTATION_STATUS.md` for current state.

---

## Features (doc vs code)

Docs mention things like:

- Inland waterway boats (PWC, pontoon, etc.) — check schema and listing/booking flows.
- T‑shirt designs / merch — if present, look for merch or shop components and routes.
- Cross‑platform (GCC ↔ WhereToVacation) — check shared auth, APIs, and any WTV-specific code.
- Beneficial features for users and captains — see Community, captain dashboard, bookings, points/badges.

**Do not assume “all complete and production-ready.”** Verify routes and components; see `FEATURE_IMPLEMENTATION_STATUS.md` for what’s been checked.

---

## Where to look first

| Goal | Where to look |
|------|----------------|
| Run the app | `README` in app root; `START_HERE.md` or `QUICK_START.md` in docs (paths may need updating to this repo). |
| What’s built vs planned | `docs/COMPREHENSIVE_PLATFORM_GUIDE.md` (no-BS), `docs/FEATURE_IMPLEMENTATION_STATUS.md`. |
| Admin routes | `src/App.tsx` — all `/admin/*` routes. |
| DB / RLS | Supabase project; migrations and RLS policies in repo. |
| Payments | Stripe edge functions and checkout components; env keys. |
| API surface | `docs/API_REFERENCE.md` or `API_QUICK_REFERENCE.md` if present. |

---

## Revenue numbers in old docs

Older docs (e.g. t‑shirts, inland boats, cross‑platform packages) sometimes cite revenue projections (e.g. $86K Year 1, $222K Year 2). Those are **estimates**, not guarantees. Ignore them for technical decisions; use real metrics once you have them.

---

## What to do first

1. **Run the app:** Follow the main README or `START_HERE.md` in this repo (use paths under `apps/gulfcoastcharters/`).
2. **Confirm env:** Supabase URL/keys, Stripe keys, any optional (email, SMS, AI) in `.env` or host env.
3. **Check feature status:** `FEATURE_IMPLEMENTATION_STATUS.md` and grep for routes/components you care about.
4. **Pick one area:** e.g. bookings, payments, admin, or community — then trace code and docs for that only.

---

**No-BS rule:** If a doc says something is “complete” or “production-ready,” confirm it in the codebase. Prefer this file and `COMPREHENSIVE_PLATFORM_GUIDE.md` (no-BS) over older “START HERE” or “Complete Package” copy.
