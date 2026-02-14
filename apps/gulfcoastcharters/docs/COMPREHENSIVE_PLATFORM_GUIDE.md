# Gulf Coast Charters - Platform Guide (No-BS)

**What this doc is:** A single reference for what the platform is supposed to do and how it’s intended to run.  
**Implementation status:** Many items are *described* here; not all exist in the codebase. In-code routes/pages are noted where known. When in doubt, grep the repo or check `FEATURE_IMPLEMENTATION_STATUS.md`.

---

## Quick Start for Admins

### Initial setup
1. **Admin:** Go to `/admin` (and related admin routes; requires admin role).
2. **Site settings:** Business hours, contact info, policies — configure where the app exposes them.
3. **Payments:** Set Stripe keys in environment (see env docs).
4. **Feature flags:** Use the app’s feature-flag system if present.
5. **Default ads:** Configure where the Default Ads / ad manager lives.

### Daily ops (if you use them)
- Review captain applications: `/admin/captain-review`
- Bookings: use dashboard / booking management routes
- Monetization: `/admin/monetization`
- Security: `/admin/security`
- Moderation: `/admin/photo-moderation`, reviews as implemented
- Other admin routes: see `App.tsx` for `/admin/*` paths.

---

## Revenue Streams (as designed)

These are the *intended* streams. Existence in code varies; check routes and components.

| # | Stream | In-code / notes |
|---|--------|------------------|
| 1 | Premium captain listings ($99–299/mo) | Captain dashboard / upgrade flow — verify in app |
| 2 | Sponsored charter listings ($49–199) | Admin → Monetization |
| 3 | Lead gen fee (e.g. 15% per booking) | Logic in payments/Stripe — confirm % and payouts |
| 4 | Booking commission (e.g. 10%) | Stripe/checkout — confirm implementation |
| 5 | Premium memberships ($19–99/mo) | `/admin/memberships` |
| 6 | Affiliate (5–10%) | Affiliate analytics, link tester, credentials in admin |
| 7 | Email marketing (per-send cost) | Email campaigns / mailing list routes in admin |
| 8 | Banner ads | Default Ads Manager, ad slots in UI |
| 9 | Video / pre-roll | If implemented, check video components and config |
| 10 | Corporate/enterprise | Sales/ops; may be manual or separate tooling |

---

## Security (as designed / partial)

- **SSL/TLS:** Handled by host (e.g. Vercel). No app-specific SSL config.
- **2FA:** Docs say SMS, TOTP, email; check auth implementation for what’s actually on.
- **WebAuthn/Passkeys:** Docs only until verified in auth flows.
- **Session:** Timeout and multi-device behavior — check auth/session code.
- **Rate limiting:** `rateLimiter` in `src/lib`; confirm usage on API/login routes.
- **RLS:** Supabase RLS on tables; policies in migrations.
- **Audit logging:** If present, check admin/audit code and retention.
- **OAuth:** Google/Facebook/Apple — only if implemented in auth provider config.

---

## Performance

- **DB:** Supabase connection; pooling/limits are Supabase-side.
- **Caching:** Service worker / PWA if implemented; no Redis in this app by default.
- **CDN:** Static assets via host (e.g. Vercel).
- **Load testing:** `stressTesting` in `src/utils` if used; no implied SLA.
- **Monitoring:** Use host + Supabase dashboards; no “99.9%” or “<200ms” guarantee in this doc.

---

## Conversion / UX (intent only)

- **A/B tests:** Only if feature-flag or experiment system is wired up.
- **Exit intent, social proof, urgency:** Doc language; implement and measure yourself.
- **No generic conversion %:** Claims like “5–8% conversion” are not validated here.

---

## Mobile

- **PWA:** If manifest and service worker are present, core flows can work offline where implemented.
- **Responsive:** App is responsive; touch targets and 3G speed are design goals, not certified.

---

## Automation & AI

- **AI/recommendations:** e.g. Gemini; see AI/chatter/recommendation components and env keys.
- **Emails:** Booking confirmation, reminders, review follow-up — check edge functions and email config.
- **Chatbot:** `/admin/chatbot`; verify model and handoff.
- **Weather:** NOAA/OpenWeatherMap; see weather edge functions and alerts.

---

## Analytics & reporting

- **Dashboards:** Admin analytics and monetization pages; data from Supabase (and any external tools you add).
- **Weekly report:** Only if a job or script sends it; check cron/scheduled functions.
- **Export:** CSV/Excel/PDF only if implemented in admin UI or scripts.

---

## Maintenance & support

- **Backups:** Supabase backups; “daily at 2am UTC” is Supabase default unless you change it. No S3 restore in app unless you built it.
- **Updates:** Dependencies and deployments are your process; no “weekly/monthly” promise in code.
- **Support channels:** Contact details (email, phone, chat) are what you configure — no built-in live chat unless you added it.

---

## Integrations

- **Stripe:** Primary payments; keys in env.
- **PayPal / Crypto:** Doc says “alternative” / “coming soon” — check code.
- **Email:** Mailjet/SendGrid/Brevo — whatever is in env and used by edge functions.
- **SMS:** Sinch/Twilio — check SMS edge functions and env.
- **Calendar:** Google/iCal/Outlook — only if implemented (e.g. calendar sync endpoints).
- **Accounting:** QuickBooks/Xero — export or sync only if you implemented it.

---

## Emergency procedures

- **Outage:** Check host status, enable maintenance if you have it, notify users, restore from backups.
- **Security incident:** Revoke credentials, force password reset, notify per policy, document.
- **Data loss:** Stop writes, restore from Supabase (or latest backup), verify, resume, post-mortem.

---

## Compliance & legal

- **GDPR:** Data export and delete depend on what you built; consent and privacy policy are your content.
- **ADA:** Aim for WCAG 2.1 AA; test with real users and tools.
- **Maritime:** USCG verification, insurance, safety — see captain/boat verification and any compliance flows in app.

---

## Growth (ops/marketing)

- SEO, referral program, partnerships, content: described in strategy docs; implementation is outside this codebase unless you added specific features.

---

**Last updated:** February 2026  
**Version:** 2.0 (no-BS pass)  
**Use:** Cross-check with repo and `FEATURE_IMPLEMENTATION_STATUS.md` for what’s actually implemented.
