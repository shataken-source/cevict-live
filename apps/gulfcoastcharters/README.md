# GulfCoastCharters (GCC)

Next.js (Pages Router) app for a charter booking platform with:

- **Public pages**: captains directory, vessels, gear recommendations
- **Admin**: campaigns (Resend email), users, captain applications
- **Weather stack**: Open‑Meteo weather/marine, NOAA buoy data, NOAA alerts, tides
- **Offline inspections**: encrypted IndexedDB storage (WebCrypto AES‑GCM) + sync support

## Run locally

From repo root:

```bash
cd apps/gulfcoastcharters
npm install
npm run dev
```

## Key routes

- **Home**: `/`
- **Captains**: `/captains`
- **Vessels**: `/vessels`
- **Gear**: `/gear`
- **Admin**: `/admin`
  - Email campaigns UI: `/admin/campaigns`

## API routes (Pages Router)

Located in `pages/api/`:

- **RBAC + Supabase helpers**: `pages/api/_lib/`
  - `rbac.ts`: `requireRole()` gate (supports server-to-server `x-admin-key`)
  - `supabase.ts`: `getSupabaseAdmin()`, `getSupabaseServer()`, `getAuthedUser()`
- **Campaign emails**:
  - `pages/api/admin/campaigns/index.ts` (list/create)
  - `pages/api/admin/campaigns/[id]/send.ts` (send)
  - `pages/api/send-test-email.ts` (test send)

## Supabase Edge Functions (Deno)

Located in `supabase/functions/` (these are **not** built by Next.js; see TS config note below):

- `weather-api`: Open‑Meteo weather + marine response used by `ComprehensiveWeatherDisplay`
- `weather-alerts`: pulls NWS alerts for a lat/lon point
- `noaa-buoy-data`: buoy list + live observations
- `captain-weather-alerts`, `points-rewards-system`, `fishing-buddy-finder`, `catch-of-the-day`

## Offline inspection storage

- Source: `offlineInspectionStorage.ts`
- Export barrel: `lib/offlineInspectionStorage.ts`

Design goals:
- No plaintext inspection data in localStorage
- Encrypted blobs in IndexedDB (`gcc_secure_offline`)
- AES‑GCM via WebCrypto

## Environment variables (high-signal)

### Supabase (required for most admin + auth)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend client)
- `SUPABASE_SERVICE_ROLE_KEY` (server/admin routes only)

### Admin access

- `GCC_ADMIN_EMAILS`: comma-separated emails that should be treated as admin (fallback if profile role missing)
- `GCC_ADMIN_KEY`: optional server-to-server key (sent as `x-admin-key`) for automation / internal calls

### Email (Resend)

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO`

### Ads

- `NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID`

### Affiliate (Gear)

- `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG`

## TypeScript config note (important)

This app contains **Deno** edge functions under `supabase/functions/` that import remote URLs.
Next.js typechecking can fail if it tries to compile those files, so `tsconfig.json` excludes `supabase/`.

## Deployment

- `vercel.json` includes baseline security headers.
- App builds with `npm run build` inside `apps/gulfcoastcharters`.

