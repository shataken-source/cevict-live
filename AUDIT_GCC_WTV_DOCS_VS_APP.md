# Gulf Coast Charters & WhereToVacation — Docs vs App Audit

**Date:** February 2026  
**Scope:** `cevict-live` apps (gulfcoastcharters, wheretovacation) + monorepo `C:\gcc\cevict-app\cevict-monorepo` docs for both.

---

## 1. Gulf Coast Charters (cevict-live)

### 1.1 What the README Says vs What Exists

**Source:** `apps/gulfcoastcharters/README.md`. There is **no** `docs/` folder in this app; README references `docs/AUDIT_REPORT.md`, `docs/DEEP_AUDIT_SUMMARY.md`, `FEATURES_VERIFICATION_COMPLETE.md`, `PRODUCTION_READY_SUMMARY.md` — **none of these exist** in cevict-live.

| Doc feature | In app? | Notes |
|-------------|---------|--------|
| Captain directory, vessel listings, multi-day booking, Stripe, booking dashboard | ✅ | `pages/captains`, `vessels`, `bookings`, `api/bookings/create`, `api/calendar/*`, Stripe edge functions |
| Finn Concierge (memory, reminders, weather suggestions) | ✅ | `src/lib/finnAI.ts`, concierge components |
| Fishy Learning Chatbot | ✅ | Edge `fishy-ai-assistant`, learning tables |
| Real-time weather, NOAA buoy, weather alerts, tide charts, water temp | ✅ | `api/weather/current`, `tides`, `noaa-buoy`, `ComprehensiveWeatherDisplay`, `TideChart`, edge `weather-api`, `weather-alerts`, `noaa-buoy-data` |
| Gamification: points, badges, leaderboards, avatar | ✅ | `api/points/redeem`, `message-board/award-points`, `avatar/shop`, `loyalty`, `src/lib/badges.ts`, edge `points-rewards-system` |
| **Catch logging**: photo + GPS, **AI fish species (planned)**, catch history, social sharing | ⚠️ Partial | Edge `fish-species-recognition` exists. **No user-facing catch-logging page/flow** (no “log my catch” with photo upload + GPS). Community page mentions “share your catches” but no dedicated catch log or history UI. |
| SMS: booking reminders, weather alerts, campaigns | ✅ | Edge `sms-booking-reminders`, `sms-campaign-manager`, `captain-weather-alerts`; `api/admin/sms-campaigns`; pages `admin/sms-campaigns` |
| **Phone verification system** | ⚠️ Partial | Edge `sms-verification` exists; no obvious **in-app phone verification UI** (e.g. “Verify your phone” step). |
| Admin: captain applications, email campaigns, scraper, GPS dashboard, users | ✅ | `admin/captain-review`, `admin/campaigns`, `admin/scraper`, `admin/scraper-reports`, `admin/gps`, `admin/users` |
| Community feed, fishing buddy finder, catch of the day | ✅ | `community.tsx`, edge `fishing-buddy-finder`, `catch-of-the-day` |
| Gear (Amazon affiliate) | ✅ | `pages/gear`, marine products |
| Gift cards, rain checks, tips | ✅ | `api/gift-cards/*`, `api/rain-checks/*`, `api/tips/*`, pages `gift-cards`, `test-tip` |

### 1.2 Features in README / Docs but NOT (or barely) in the app

- **Catch logging UI** — No page or flow for users to log a catch (photo + GPS), view catch history, or trigger AI species recognition from the app. Backend/edge exists; front-end is missing.
- **Phone verification UI** — Documented “Phone verification system”; edge function exists, no clear user flow in the app.
- **Referenced docs** — `docs/AUDIT_REPORT.md`, `docs/DEEP_AUDIT_SUMMARY.md`, `FEATURES_VERIFICATION_COMPLETE.md`, `PRODUCTION_READY_SUMMARY.md` are not present in the repo.

---

## 2. WhereToVacation (cevict-live)

### 2.1 What the README Says vs What Exists

**Source:** `apps/wheretovacation/README.md`. README references `docs/AUDIT_REPORT.md`, `docs/DEEP_AUDIT_SUMMARY.md`, `docs/CROSS_PLATFORM_INTEGRATION.md` — **no `docs/` folder** in cevict-live wheretovacation; those files do not exist here.

| Doc feature | In app? | Notes |
|-------------|---------|--------|
| Vacation rental listings, search, filters | ✅ | `app/rentals`, `rentals/[id]`, `api/rentals`, `search` |
| Detailed rental pages, photos, amenities | ✅ | `rentals/[id]` uses `accommodations` |
| **Availability calendar** | ❌ | README: “Availability calendar”. No calendar on rental detail or list. |
| Booking with Stripe | ✅ | `api/bookings/create-checkout`, `BookingButton`, `bookings/success` |
| Finn Concierge, Fishy chatbot | ✅ | `FinnConcierge`, `FishyAIChat` components |
| Destination guides (attractions, best time, photos/videos) | ⚠️ Partial | `destination/[id]` shows name, attractions, last_updated. **Best time to visit, photo galleries, videos** not clearly surfaced (schema has `best_time_to_visit`, `photos`, `video_url` but not verified on page). |
| Integrated search (rentals + GCC boats) | ✅ | `api/integrated-search`, `search` page |
| **Vacation packages: create, combine rentals+charters+activities, save and share** | ⚠️ Partial | `packages` page + `api/packages/create`. **Package is not persisted to DB**: comment in code says “In production, you'd have a vacation_packages table”; API returns package in JSON but **does not insert into `vacation_packages`**. Table exists in migrations. |
| Booking management (history, confirmations) | ⚠️ Partial | `bookings/success`; no dedicated “my bookings” list page found. |
| User profiles: **saved favorites**, booking history, preferences, loyalty | ⚠️ Partial | `profile` page exists; **saved favorites** and **loyalty points** not verified in UI. |
| **Reviews / Guest reviews & ratings** | ❌ | README project structure lists `reviews/` and “Guest reviews & ratings”. **No `app/reviews/` route.** Unified reviews API exists (`unified-reviews/create`, `get`) but no reviews page for rentals or destinations. |
| **Cancellation management** | ❌ | Not found in routes or API. |

### 2.2 Features in README / Docs but NOT (or barely) in the app

- **Reviews page** — No `/reviews` or per-rental/destination reviews UI; only API.
- **Availability calendar** — Not present on rental pages.
- **Vacation packages persistence** — Packages not saved to `vacation_packages`; API returns data but does not write to DB.
- **Saved favorites** — Not clearly implemented in profile.
- **Booking history / management** — No clear “my bookings” list page.
- **Cancellation management** — Not implemented.
- **Referenced docs** — `docs/AUDIT_REPORT.md`, `docs/DEEP_AUDIT_SUMMARY.md`, `docs/CROSS_PLATFORM_INTEGRATION.md` are not in the repo.

---

## 3. Monorepo docs (C:\gcc\cevict-app\cevict-monorepo) relevant to GCC & WTV

These describe features or status that may not be in cevict-live or add context.

### 3.1 GCC

- **`apps/wheretovacation/HIDDEN_LOST_FEATURES_REPORT.md`** (Dec 2025) — Lists many “documented but not implemented” items for **both** WTV and GCC (payment, USCG QR verification, weather/NOAA, gamification, community, rain checks, tipping, gear shop, gift cards, affiliate, Fishy bot, tide data, fish activity predictions, GPS, ID.me, WTV partnership, last-minute deals, i18n, PWA). **Note:** In **cevict-live** GCC, several of these **are** implemented (Stripe, gift cards, rain checks, tips, many edge functions, weather/tides APIs). So treat HIDDEN_LOST as “monorepo / older state”; cevict-live GCC is ahead of that report but still missing, e.g., **catch logging UI** and **phone verification UI** as above.
- **`PROJECT_AUDIT_WTV_GCC.md`** — At that time, monorepo `apps/gcc` was described as empty/not found; cevict-live has a full `gulfcoastcharters` app, so that audit’s GCC part is outdated for cevict-live.
- **`docs/gcc/claude-enhancements/`** — About Us, homepage, charter listing improvements, blog/SEO; implementation guides, not necessarily reflected in cevict-live.
- **`docs/CHARTER_SETUP_GUIDE.md`**, **`docs/GCC_SCRAPER_DEPLOYMENT_COMPLETE.md`**, **`docs/ENTERPRISE_SCRAPER_IMPLEMENTATION.md`** — Scraper and charter setup; useful for context.
- **`docs/CHECK_GULF_COAST_CHARTERS.md`**, **`docs/FIX_GULF_COAST_CHARTERS.md`**, **`docs/GCC_VERCEL_FIX.md`** — Deployment/fix notes.

### 3.2 WhereToVacation

- **`apps/wheretovacation/HIDDEN_LOST_FEATURES_REPORT.md`** — Same file as above; WTV sections (payment, community, etc.) refer to monorepo state; cevict-live WTV has Stripe checkout and integrated search but still missing reviews page, package persistence, availability calendar, etc.
- **`apps/wheretovacation/README.md`** (monorepo) — Mentions `docs/CROSS_PLATFORM_INTEGRATION.md`, `PROJECT_SEPARATION.md`; community, booking, activity packages “needs implementation.”
- **`apps/wheretovacation/docs/`** (in monorepo only) — Many files (e.g. fishy-production-guide, final-launch-checklist, SMS_REMINDER_SETUP, STRIPE_EMAIL_PAYMENT_GUIDE, REFERRAL_SYSTEM_GUIDE, SOCIAL_SHARING_GUIDE, WEB_PUSH_NOTIFICATIONS_GUIDE, PWA_MOBILE_ENHANCEMENTS, TESTING_GUIDE, TROUBLESHOOTING_GUIDE, etc.). **None of these exist under cevict-live/apps/wheretovacation** (no `docs/` there).
- **`GCC_WTV_UPGRADE_COMPLETE_SUMMARY.md`**, **`WTV_FIXES_SUMMARY.md`**, **`BOTH_SITES_CONFIGURATION_COMPLETE.md`** — Upgrade/fix summaries in monorepo root.

---

## 4. Summary: Doc-only or underdone in the apps

### Gulf Coast Charters (cevict-live)

- **Catch logging UI** — Documented (photo + GPS, catch history, AI species “planned”).
  - **In app:** Only backend/edge (e.g. fish-species-recognition). **No user-facing catch log or catch history page.**
- **Phone verification UI** — Documented “Phone verification system”.
  - **In app:** Edge `sms-verification` only; **no clear in-app verification flow.**
- **Docs referenced in README** — Missing: `docs/AUDIT_REPORT.md`, `docs/DEEP_AUDIT_SUMMARY.md`, `FEATURES_VERIFICATION_COMPLETE.md`, `PRODUCTION_READY_SUMMARY.md`.

### WhereToVacation (cevict-live)

- **Reviews** — Documented (guest reviews & ratings, project structure `reviews/`).
  - **In app:** **No `/reviews` or reviews UI**; only unified-reviews API.
- **Availability calendar** — Documented for rentals.
  - **In app:** **Not present** on rental pages.
- **Vacation packages** — Documented (create, save, share).
  - **In app:** **Packages not persisted** to `vacation_packages`; API does not write to DB.
- **Saved favorites / booking history / cancellation** — Documented.
  - **In app:** **Favorites and cancellation not verified;** no clear “my bookings” list.
- **Docs referenced in README** — Missing: `docs/AUDIT_REPORT.md`, `docs/DEEP_AUDIT_SUMMARY.md`, `docs/CROSS_PLATFORM_INTEGRATION.md`. Entire `docs/` folder from monorepo is not in cevict-live WTV.

---

## 5. Recommendation

- **GCC:** Add a **catch logging** flow (page + photo + GPS → edge/DB) and a **phone verification** step in the app if you want those doc features; optionally add the referenced docs or a short `docs/` in the app.
- **WTV:** Implement **reviews UI** (e.g. `/reviews` or on rental/destination), **persist packages** to `vacation_packages` in `api/packages/create`, add **availability calendar** for rentals, and a **bookings list** (and favorites/cancellation if desired); optionally copy or recreate key monorepo `docs/` (e.g. `CROSS_PLATFORM_INTEGRATION.md`) into cevict-live.
