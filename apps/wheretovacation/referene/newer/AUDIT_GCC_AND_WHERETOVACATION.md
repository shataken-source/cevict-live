# Audit: Gulf Coast Charters & Where To Vacation

**Date:** January 2026  
**Scope:** `apps/gulfcoastcharters`, `apps/wheretovacation`  
**Focus:** Structure, config, security, integration, and build health.

---

## 1. Overview

| App | Framework | Router | Port (dev) | DB |
|-----|-----------|--------|------------|-----|
| **gulfcoastcharters** | Next.js 16 | Pages | 3000 | Supabase |
| **wheretovacation** | Next.js 14 | App | 3003 | Supabase |

- **GCC** is a large charter-booking app (Pages + `src/`, many API routes, Supabase, Stripe, Resend, admin RBAC).
- **WTV** is a smaller vacation-planning app (App Router) that integrates with GCC for boats, SSO, and unified bookings/reviews.

---

## 2. Gulf Coast Charters – Findings

### 2.1 Structure & config

- **Pages + `src/`:** `pages/` holds routes and API; `src/` holds components, pages (e.g. `src/pages/`), and lib. Both `pages/` and `src/` contain page-like routes; ensure no duplicate routes (e.g. `pages/search.tsx` vs `src/pages/SearchResults.tsx`).
- **TypeScript include:** `tsconfig.json` `include` lists `pages/**/*`, specific `src/lib/*` and `src/types/*` files, and `lib/**/*`. It does **not** include `src/**/*`. Components in `src/components/` and other `src/` code may be type-checked only when imported from included files. **Recommendation:** Add `"src/**/*.ts"`, `"src/**/*.tsx"` to `include` (or rely on `next build` which uses its own TS context).
- **Path alias:** `@/*` → `./src/*` is set; any `src/` imports work at runtime; full IntelliSense depends on `include`.
- **Next config:** `env` forwards only `NEXT_PUBLIC_SUPABASE_*`. Other env (e.g. `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `STRIPE_*`) are read at runtime; no need to duplicate in `env` unless you want them inlined at build.

### 2.2 Security

- **Admin RBAC:** Admin API routes use `requireRole(req, res, ['admin'])` from `pages/api/_lib/rbac.ts`. RBAC supports `GCC_ADMIN_EMAILS` and `GCC_ADMIN_KEY` (header `x-admin-key`) for server-to-server. **Good.**
- **Cron / internal:** `cron/review-requests.ts` and `weather/booking-alerts.ts` use `CRON_SECRET` (Bearer or `?secret=`). **Good.** Ensure `CRON_SECRET` is set in production and not guessable.
- **Unified booking create:** `POST /api/unified-bookings/create` accepts `userId` and `bookingData` in the body and does **not** verify that the request is from that user (no session/cookie check). Any client can create a booking for any `userId`. **Critical:** Require authenticated user (e.g. Supabase session) and set `userId` from `user.id` on the server; do not trust `userId` from the body.
- **Secrets:** No hardcoded secrets found. Stripe, Resend, Supabase, and admin key are env-driven. Supabase Edge Functions use `Deno.env.get(...)`.

### 2.3 API & integration

- **Boats API:** `GET /api/boats` is public (no auth), returns vessel/boat listings. Used by WTV via `GET /api/gcc/boats` proxy. Response shape and fallbacks (vessels → boats → charters) are documented in code. **Good.**
- **Unified reviews:** `pages/api/unified-reviews/` has both `create.ts` / `get.ts` (Pages handlers) and `create/route.ts` / `get/route.ts` (App Router style). In Pages Router, only `create.ts` and `get.ts` serve `/api/unified-reviews/create` and `/api/unified-reviews/get`. The `create/route.ts` and `get/route.ts` files would map to paths ending in `/route`, which is non-standard here. **Recommendation:** Remove the `create/` and `get/` folders with `route.ts` to avoid confusion, or document that they are unused.

### 2.4 Env & manifest

- **env.manifest.json** lists required Supabase vars and optional GCC admin, Resend, and AdSense. It does **not** list:
  - `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (used for AdSense verification)
  - `STRIPE_*`, `CRON_SECRET`, `STRIPE_WEBHOOK_SECRET` (used by GCC and/or Edge Functions)
- **Recommendation:** Add optional entries for AdSense verification and document Stripe/Cron in README or a dedicated env doc so deployers know what to set.

### 2.5 ESLint

- Many rules are disabled (`react-hooks/exhaustive-deps`, `@typescript-eslint/no-unused-vars`, `no-case-declarations`, etc.). Reduces noise but hides real issues. **Recommendation:** Re-enable gradually and fix violations, or scope disables to specific files.

### 2.6 Deployment

- **vercel.json:** Security headers (X-Frame-Options, X-Content-Type-Options, HSTS) are set. **Good.**  
- **Install:** `npm install --legacy-peer-deps`; suggests peer dependency conflicts; worth resolving over time.

---

## 3. Where To Vacation – Findings

### 3.1 Structure & config

- **App Router only:** Single `app/` tree, `lib/`, `components/`. Clear and small.
- **next.config.js:** `eslint.ignoreDuringBuilds: true` and `typescript.ignoreBuildErrors: true`. Builds can succeed while hiding lint and type errors. **Recommendation:** Turn these off and fix errors so CI and production reflect real code health.
- **Stripe client:** `app/api/bookings/create-checkout/route.ts` and `app/api/bookings/verify/route.ts` use `new Stripe(process.env.STRIPE_SECRET_KEY || '', ...)`. If `STRIPE_SECRET_KEY` is missing, Stripe is instantiated with an empty string and can fail or behave unpredictably. **Recommendation:** Check for the key before creating the client and return 503/500 with a clear message when missing (similar to the existing check later in create-checkout).

### 3.2 Security

- **Unified booking create:** `POST /api/unified-bookings/create` (WTV) has the same issue as GCC: it accepts `userId` in the body and does not verify the request is from that user. **Critical:** Require Supabase auth (e.g. get session in route) and set `userId` from the session; do not trust `userId` from the body.
- **Unified reviews create:** Same pattern (if it accepts userId from body without auth) should be checked and fixed.
- **Supabase:** Service role key is used only in API routes and server-side libs; anon key in client. **Good.**

### 3.3 Integration with GCC

- **GCC base URL:** WTV uses `GCC_BASE_URL`, `NEXT_PUBLIC_GCC_BASE_URL`, or `GULFCOASTCHARTERS_BASE_URL`. `/api/gcc/boats` and integrated search use it. If unset, API returns 500 with a clear message. **Good.**
- **FinnConcierge:** Uses `NEXT_PUBLIC_GCC_BASE_URL` for GCC links; default `http://localhost:3006` may not match GCC’s actual dev port (3000). **Recommendation:** Align default with GCC’s port or document.

### 3.4 Env & manifest

- **env.manifest.json** includes Supabase, Stripe, and GCC base URL vars. It does not list `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (only needed if you add AdSense to WTV).

### 3.5 Deployment

- **vercel.json:** No security headers. **Recommendation:** Add the same headers as GCC (X-Frame-Options, X-Content-Type-Options, HSTS) for consistency and security.

---

## 4. Cross-project summary

| Area | GCC | WTV |
|------|-----|-----|
| Auth on unified booking create | ❌ No; trusts body `userId` | ❌ No; trusts body `userId` |
| Admin / RBAC | ✅ requireRole + optional key | N/A (no admin routes in scope) |
| Cron / internal APIs | ✅ CRON_SECRET | N/A |
| Stripe key handling | ✅ Env in Edge Functions | ⚠️ Empty string fallback |
| Env manifest vs code | ⚠️ Missing AdSense/Stripe/Cron | ✅ Aligned |
| Build strictness | ESLint relaxed | ⚠️ TS + ESLint ignored in build |
| Security headers (Vercel) | ✅ Set | ❌ Missing |
| GCC ↔ WTV integration | ✅ Boats API + proxy | ✅ Env-driven; port default may be wrong |

---

## 5. Recommended actions (priority)

### Critical (security)

1. **GCC and WTV – Unified booking create** ✅ **FIXED**
   - **GCC:** `POST /api/unified-bookings/create` now uses `getAuthedUser(req, res)`; returns 401 if not signed in; `userId` is taken from session only. Callers `PackageBookingWidget.tsx` and `test-cross-platform.tsx` updated to stop sending `userId` and to use `credentials: 'include'`.
   - **WTV:** `POST /api/unified-bookings/create` now uses `getServerUser()` (Supabase SSR from cookies); returns 401 if not signed in; `userId` is taken from session only. Added `getServerUser()` in `lib/supabase.ts`.
   - Apply the same rule to any unified-review or similar endpoints that accept `userId` in the body (audit those next if needed).

### High (reliability / config) ✅ DONE

2. **WTV – Build and Stripe** ✅
   - Set `ignoreBuildErrors: false` and `ignoreDuringBuilds: false`; fixed type errors (Stripe apiVersion, FinnConcierge type, finnAI profile null, shared-users destructuring). Excluded `supabase` from tsconfig so Deno Edge functions are not type-checked. Added `getStripe()` helper; Stripe routes return 503 if key missing.
   - SSO/unified-reviews API routes marked `dynamic = 'force-dynamic'`; `/sso/validate` page wrapped in `<Suspense>` for `useSearchParams()`.

3. **WTV – Security headers** ✅
   - Added `vercel.json` headers (X-Frame-Options, X-Content-Type-Options, HSTS) matching GCC.

4. **GCC – TypeScript include** ✅
   - Added `src/**/*.ts` and `src/**/*.tsx` to `tsconfig.json` `include`; removed redundant explicit `src/lib/*` entries.

### Medium (maintainability) ✅ DONE

5. **GCC – unified-reviews** ✅
   - Removed unused `pages/api/unified-reviews/create/route.ts` and `pages/api/unified-reviews/get/route.ts` (App Router style; Pages Router uses `create.ts` and `get.ts`).

6. **GCC – env.manifest**
   - Add optional entries for `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, and document Stripe and CRON_SECRET in README or env doc.

7. **WTV – FinnConcierge default**
   - Set default GCC base URL to `http://localhost:3000` (or document the correct GCC dev port).

### Low

8. **GCC – ESLint**
   - Gradually re-enable disabled rules and fix violations, or narrow disables to specific files.

9. **GCC – Dependencies**
   - Address peer dependency issues that require `--legacy-peer-deps` over time.

---

## 6. Files touched in this audit (reference)

- **GCC:** `next.config.js`, `tsconfig.json`, `env.manifest.json`, `pages/_document.js`, `pages/api/_lib/rbac.ts`, `pages/api/_lib/supabase.ts`, `pages/api/boats.ts`, `pages/api/unified-bookings/create.ts`, `pages/api/unified-reviews/*`, `vercel.json`, `README.md`, `components/SEOHead.jsx`
- **WTV:** `next.config.js`, `env.manifest.json`, `app/layout.tsx`, `app/api/gcc/boats/route.ts`, `app/api/unified-bookings/create/route.ts`, `app/api/bookings/create-checkout/route.ts`, `lib/supabase.ts`, `lib/supabase-client.ts`, `vercel.json`, `README.md`

---

*End of audit.*
