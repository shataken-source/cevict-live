# Website Monitor – Audit Report

**Location:** `apps/monitor-20260204T071703Z-3-001/monitor`
**Audit date:** 2025-02-03

## What It Is

This is a **website monitoring dashboard** (not a trading “market monitor”). It provides:

- **Multi-website monitoring:** Add URLs, track uptime, response time, and status (up/down/slow).
- **Visitor analytics:** Store and show unique visitors per day/week (data comes from `visitor_stats`; no built-in tracker).
- **Bot status:** Per-site bot status (running/waiting/broken) with optional SMS when broken.
- **AI chat:** Claude-based assistant with site context for diagnostics.
- **SMS alerts:** Critical alerts (site down, bot broken) with configurable phone number (SMS sending is stubbed).
- **Command Center:** Separate “ops” dashboard for CEVICT projects: health checks, start/stop/restart (Windows PowerShell), Alpha Hunter metrics and risk factors, AI messaging, logs.

So: one app = **Website Monitor** (main dashboard + admin) + **Command Center** (project ops). Both are in the same Next.js app.

---

## Current State: Worth Fixing?

**Yes.** The core is implemented and coherent. Gaps are mostly small bugs and one missing API. Fixing them is low effort and gets you a usable monitor.

---

## What’s Implemented

| Area | Status | Notes |
|------|--------|--------|
| **DB schema** | Done | Migration `20250126_website_monitor.sql`: `monitored_websites`, `uptime_checks`, `visitor_stats`, `bot_status`, `alert_config`, `alerts`. RLS enabled with permissive policies. |
| **Supabase** | Done | `lib/supabase.ts` – `createSupabaseClient()` used by API routes; throws if env missing. |
| **Websites CRUD** | Done | GET/POST/PUT/DELETE `/api/websites`. |
| **Admin config** | Done | GET/POST `/api/admin/config` for SMS/email/critical_only. Handles no existing row. |
| **Monitor stats** | Done | GET `/api/monitor/stats?websiteId=&period=day|week|month` – uptime %, response time, visitors, bots. |
| **Manual check** | Done | POST `/api/monitor/check` – runs one uptime check and stores it; can trigger SMS. |
| **Bot status** | Done | GET/POST `/api/bots/status` – get/update bot status per website. |
| **AI chat** | Done | POST `/api/ai/chat` – Claude with optional site context. |
| **Alerts SMS** | Done | POST `/api/alerts/sms` – Twilio when `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` set; otherwise logs only. |
| **Visitor tracking** | Done | POST `/api/visitors/track` – upsert `visitor_stats` by website + date. |
| **Monitor worker** | Done | `scripts/monitor-worker.ts` – entrypoint via `process.argv[1]` so tsx works; fetches enabled sites, HEAD, writes `uptime_checks`, optional SMS. |
| **Dashboard UI** | Done | Grid of site cards (with “Check now” refresh per card), uptime/response/visitors/bots, detail panel with “Check now” button, AI chat. |
| **Admin UI** | Done | Alert config, add/edit/delete websites. |
| **Command Center** | Done | Health proxy, control (start/stop/restart), metrics, risk-factors, AI message, logs. Paths under `C:\cevict-live\apps\...`; control only when not on Vercel and platform is Windows. |

---

## Bugs and Gaps (Fixed or Documented)

### 1. Dashboard: 30s interval never refreshes stats (fixed)

- **Issue:** The 30s `setInterval` calls `websites.forEach(w => fetchStats(w.id))` but `websites` is from the initial render (empty). So only the first load and the “websites changed” effect fetch stats; the interval only refreshes the website list.
- **Fix:** Refresh stats inside the interval using the **current** list: e.g. refetch websites in the interval and then call `fetchStats` for each ID from the response (or use a ref to the current `websites` and iterate that). Applied in `app/page.tsx`.

### 2. Monitor stats: duplicate bots in list (fixed)

- **Issue:** `/api/monitor/stats` returns all `bot_status` rows for the website. Multiple updates for the same bot yield multiple entries. The dashboard expects one row per bot.
- **Fix:** In `/api/monitor/stats`, return only the **latest** row per `bot_name` (e.g. dedupe by `bot_name` after ordering by `updated_at` desc). Applied in `app/api/monitor/stats/route.ts`.

### 3. Server-side SMS call uses relative URL (fixed)

- **Issue:** In `api/monitor/check/route.ts` and `api/bots/status/route.ts`, `fetch('/api/alerts/sms', ...)` is used. From a server-side route there is no browser base URL, so the request can fail or hit the wrong host.
- **Fix:** Use an absolute URL: `process.env.NEXT_PUBLIC_BASE_URL` or `VERCEL_URL` + `/api/alerts/sms`. Applied in both routes.

### 4. Visitor tracking API (implemented)

- **POST `/api/visitors/track`** added: body `websiteId`, `date?`, `uniqueVisitors`, `totalVisits?`; upserts `visitor_stats` on `(website_id, date)`.

### 5. SMS sending (implemented)

- **`/api/alerts/sms`** now sends via Twilio REST API when `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` are set; otherwise logs only. No SDK dependency (fetch + Basic auth).

### 6. Worker entrypoint (fixed)

- Worker now uses `process.argv[1]?.includes('monitor-worker')` so it runs when the file is the entry point under both tsx and Node.

---

## Migration Note

- Trigger uses `EXECUTE FUNCTION update_updated_at_column()`. Valid in PostgreSQL 11+ (Supabase is fine). If you ever run on an older Postgres, change to `EXECUTE PROCEDURE` if required.

---

## Recommendation

- **Use it:** Run the migration, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and optionally `ANTHROPIC_API_KEY`, then add sites in Admin and run the worker on a schedule (e.g. cron every 5 min). Command Center is ready for local Windows use.
- **Optional next steps:** Lock down RLS policies if you add auth; add “last checked” timestamp on cards if desired.

---

## Quick Start (after fixes)

```bash
cd monitor
pnpm install
# .env.local: NEXT_PUBLIC_SUPABASE_*, ANTHROPIC_API_KEY, NEXT_PUBLIC_BASE_URL (for worker SMS callback)
# Run migration in Supabase
pnpm dev   # :3010
# Cron: pnpm tsx scripts/monitor-worker.ts every 5 min
```
