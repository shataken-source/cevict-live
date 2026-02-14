# Monitor app – audit and suggestions for cevict.ai

**Audit date:** 2026-02-09

## Fixes applied

1. **`/docs` 404** – Added `app/docs/page.tsx` with API overview and plan/worker notes. Dashboard "Docs" link now works.

2. **Auth on APIs** – Enforced sign-in and ownership where needed:
   - `POST /api/monitor/check` – requires Clerk auth; checks `owner_id` so users can only check their own sites.
   - `GET /api/monitor/stats` – same: auth + ownership check.
   - `GET/POST /api/admin/config` – require sign-in (config remains global; can be scoped per-user later).
   - `POST /api/ai/chat` – require sign-in.

3. **Free plan limit** – README and landing say "3 sites free"; code had 2. Updated `lib/subscription-store.ts` so free = 3.

4. **env.manifest.json** – Documented optional vars for KeyVault/setup: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_BASE_URL`, `SINCH_*`, `RESEND_API_KEY`.

---

## Suggestions to make it better (cevict.ai)

### Product / UX

- **Landing as default for signed-out users** – Today `/` is protected and sends users to sign-in. For cevict.ai, consider redirecting unauthenticated `/` to `/landing` so the first thing they see is marketing, then "Open dashboard" → sign-in.

- **Status page slug** – Migration has `monitor_accounts.status_page_slug` for custom URLs (e.g. `cevict.ai/status/your-slug`). Not wired in the app yet; add a settings screen and a public route like `/status/[slug]` that shows only that account’s sites.

- **Alert config per user** – `alert_config` is a single global row. For multi-tenant cevict.ai, add `user_id` and scope GET/POST by Clerk `userId`.

### Security / ops

- **RLS policies** – Migrations use `USING (true) WITH CHECK (true)` on all tables. For production, replace with real RLS (e.g. `monitored_websites`: `owner_id = auth.uid()` or Clerk JWT claim) and use service role only in API routes that need to act on behalf of users.

- **Command Center health proxy** – `GET /api/command-center/health?url=...` fetches an arbitrary URL. Restrict to same-origin or an allowlist to avoid SSRF (e.g. only allow URLs for known Launchpad/command-center hosts).

- **Visitor tracking auth** – `POST /api/visitors/track` is not checked for auth; any caller can upsert visitor stats for any `websiteId`. Add auth and ownership check so only the site owner (or a server with a shared secret) can post.

### Reliability

- **Worker Supabase client** – `scripts/monitor-worker.ts` uses `createSupabaseClient()` (anon). With strict RLS, the worker won’t see rows. Use service role in the worker (e.g. `SUPABASE_SERVICE_ROLE_KEY` and create a service client in the script or a small helper).

- **Stripe API version** – Webhook uses `apiVersion: '2026-01-28.clover'`. Confirm this matches your Stripe dashboard and that webhook events still parse correctly.

### Docs / config

- **`.env.example`** – Add optional vars: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_BASE_URL`, `SINCH_*`, `RESEND_API_KEY` so new devs know what’s needed for alerts and AI.

- **README** – Update "3 sites free" if you change limits again; it’s now aligned with the code.

---

## Quick reference

| Item              | Status / note |
|-------------------|----------------|
| Build             | ✅ `pnpm run build` passes |
| Lint              | ✅ No errors |
| `/docs`           | ✅ Implemented |
| Auth on monitor/check, stats, admin/config, ai/chat | ✅ Added |
| Free plan limit   | ✅ 3 sites |
| env.manifest      | ✅ Optional vars added |
| RLS               | ⚠️ Still permissive; tighten for production |
| Visitor track auth | ⚠️ Not yet; add for multi-tenant |
| Worker client     | ⚠️ Use service role if RLS is tightened |
