# Gulf Coast Charters – Premium Charter Booking Platform

**The complete solution for charter fishing and water experiences on the Gulf Coast**

**Production:** https://gulfcoastcharters.vercel.app  
**Dev:** http://localhost:3009 | **Framework:** Next.js 14 (Pages Router) | **Database:** Supabase (PostgreSQL) | **Deploy:** Vercel

---

## Project overview

Gulf Coast Charters is a professional charter booking platform (fishing, dolphin tours, sunset cruises, party boats, kayak, intracoastal) with features competitors don’t have:

### Core features

- Real-time weather alerts (NOAA buoy, Open-Meteo)
- Community gamification & points system
- GPS location sharing with privacy controls
- Fishing tournaments and live leaderboards
- Real-time messaging
- Secure Stripe payments (85% to captains)
- USCG license verification
- PWA mobile app (installable, offline, push)
- AI concierge (Finn) and chatbot (Fishy)
- Admin panel with cron and scraper management

### Business model

- **15% platform commission** (85% to captains)
- Revenue: subscriptions, tournament fees, premium features (e.g. PRO/CAPTAIN media tiers)
- Target: $3M–$53M revenue potential (Years 1–5)

---

## Project structure

```
apps/gulfcoastcharters/
├── pages/              # Next.js pages & API routes
│   ├── api/            # REST APIs (bookings, weather, community, etc.)
│   ├── index.tsx       # Homepage
│   ├── search.tsx      # Charter search
│   ├── weather.tsx     # Weather
│   ├── dashboard.tsx    # My trips
│   └── admin/          # Admin pages
├── src/
│   ├── components/     # React components (UI, captain, community, mobile)
│   ├── lib/            # Utilities (supabase, media-tiers, badges, etc.)
│   ├── hooks/          # React hooks
│   └── pages/          # Additional page components
├── supabase/
│   ├── migrations/     # SQL migrations
│   └── functions/      # Edge Functions (Deno)
├── public/             # Static assets, manifest, sw.js, offline.html
└── docs/               # Documentation
```

---

## Tech stack

**Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, Radix UI, Lucide, Leaflet, Framer Motion  

**Backend:** Supabase (PostgreSQL, Auth, Storage), Supabase Edge Functions (Deno), Next.js API routes  

**Integrations:** Stripe, Resend, Sinch/Twilio, Open-Meteo, NOAA, AI Gateway (Claude/GPT), Google Custom Search, Amazon Affiliate  

---

## Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Supabase CLI (for migrations/functions)
- Stripe account

### Steps

```bash
cd apps/gulfcoastcharters
npm install
```

Copy `.env.example` to `.env.local` and set:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Email (Resend)
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...

# SMS (Sinch/Twilio)
SINCH_API_TOKEN=...
SINCH_SERVICE_PLAN_ID=...
# or TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN

# AI (Fishy/Finn)
GATEWAY_API_KEY=...
# OPENAI_API_KEY=...

# Admin
GCC_ADMIN_EMAILS=...
# CRON_SECRET=...   # For cron routes (review-requests, weather/booking-alerts)
```

```bash
# Link Supabase (if using CLI)
supabase link --project-ref YOUR_REF
supabase db push   # or run migrations manually

# Run dev server
npm run dev
```

Visit http://localhost:3009

---

## Key routes

| Purpose        | Path |
|----------------|------|
| Home           | `/` |
| Search charters| `/search` |
| Weather        | `/weather` |
| My trips       | `/dashboard` |
| Community      | `/community` |
| Captains       | `/captains`, `/captains/[id]` |
| Vessels        | `/vessels`, `/vessels/[id]` |
| Bookings       | `/bookings`, `/bookings/[id]` |
| Admin          | `/admin`, `/admin/campaigns`, `/admin/scraper`, `/admin/gps`, `/admin/sms-campaigns` |

---

## Database (high level)

**Core:** `bookings`, `captains`, `charters`/`vessels`, `reviews`, `users`/profiles  

**Features:** `weather_alerts`, `shared_users` (points/tier), `tournaments`, `messages`, `notifications`, `activity_feed`, `booking_trip_photos`, `captain_subscriptions`  

**Security:** RLS enabled, PostGIS for geo where used. See `supabase/migrations/` for schema.

---

## Deployment (Vercel)

- Build: `npm run build` | Output: `.next` | Node >= 20  
- Set all env vars in Vercel. Supabase and Edge Functions are separate (Supabase host + CLI for functions).

---

## Features deep dive

- **Weather:** NOAA buoy + Open-Meteo, alerts, captain/customer notifications.  
- **Gamification:** Points, badges, loyalty tiers (bronze→platinum), leaderboards.  
- **Messaging:** Direct and group messaging; read receipts.  
- **Tournaments:** Public/private, entry fees, leaderboards, photo verification.  
- **Location:** GPS sharing with privacy modes; Mapbox/Leaflet.  
- **Payments:** Stripe Connect; 85% captain payout; refunds.  
- **PWA:** Manifest, service worker (gcc-v1.0.0), install prompt, offline fallback, push.  
- **Media:** Photos free (tier limits); video PRO/CAPTAIN. See `docs/PWA_MEDIA_STRATEGY_SPEC.md`.

---

## Security

- Auth: Supabase Auth (email, Google, etc.), JWT, RLS.  
- Payments: Stripe (PCI DSS); no card data stored.  
- HTTPS, env for secrets, parameterized queries, React escaping.  
- USCG: manual verification, document upload, verified badge.

---

## Admin

`/admin` (admin role): cron-style jobs, user moderation, captain verification, revenue analytics, scraper, GPS dashboard, SMS/email campaigns.

---

## Roadmap (summary)

- **Phase 1 (MVP):** Booking, payments, weather, basic gamification ✅  
- **Phase 2:** Tournaments, messaging, PWA, captain analytics  
- **Phase 3:** AI fish ID, marketplace, corporate bookings, partner API  

---

## Business metrics (targets)

- Year 1: $3M → Year 5: $53M  
- Revenue: commissions, Captain Pro ($49/mo), customer premium ($9/mo), tournament fees, affiliate, ads, courses, corporate, insurance referrals.

---

## Quick start checklist

- [ ] Clone repo, `cd apps/gulfcoastcharters`, `npm install`  
- [ ] Copy `.env.example` → `.env.local`, fill keys  
- [ ] Supabase: link project, push migrations  
- [ ] Deploy Edge Functions (optional): `supabase functions deploy ...`  
- [ ] `npm run dev`, test booking/weather/payments  
- [ ] Deploy to Vercel, set env, configure domain  

---

## Documentation

- `docs/PWA_MEDIA_STRATEGY_SPEC.md` – PWA & media tiers (photos free, video premium)  
- `docs/PWA_AND_PHOTO_SHARING_DEEP_DIVE.md` – PWA and photo sharing from the boat  
- `docs/FUZZY_FEATURES_STATUS.md` – OCR, session isolation, USCG, GPS, etc.  
- `docs/GCC_CODEBASE_LOCATIONS.md` – Where GCC code lives (cevict-live, backups, etc.)  
- `supabase/migrations/` – Database schema

---

## Support

**Business:** jason@gulfcoastcharters.com  
**Legal:** Navid  

**Technical:** See `/docs` and implementation guides.

---

**Proprietary – © 2025 Gulf Coast Charters**

Built for Gulf Coast captains and anglers. Tight lines.
