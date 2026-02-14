# Launchpad / Command Center – audit and suggestions for cevict.ai

**Audit date:** 2026-02-09

## Fixes applied

1. **Auth (Clerk)** – Added `@clerk/nextjs`. Dashboard (`/`), Command Center (`/command-center`), and Affiliates (`/affiliates`) require sign-in. Unauthenticated `/` redirects to `/landing`.

2. **Landing page** – Added `/landing` with “Sign in to open dashboard” for cevict.ai user-facing entry. Sign-in and sign-up routes at `/sign-in` and `/sign-up`.

3. **Command Center health proxy (SSRF)** – `GET /api/command-center/health?url=...` now allows only localhost (3001, 3010) and cevict.ai. Other URLs return 403.

4. **Sensitive APIs require auth** – `POST /api/start-project`, `POST /api/kill-port`, `POST /api/clear-cache` now require Clerk auth; unauthenticated calls return 401.

5. **Configurable apps path** – `start-project` and `clear-cache` no longer use a hardcoded path. They use `LAUNCHPAD_APPS_PATH` or `PROJECTS_BASE_PATH` or default to `process.cwd()/apps`. Set env in production to match your monorepo (e.g. `C:\cevict-live\apps` or `C:\gcc\cevict-app\cevict-monorepo\apps`).

6. **env.manifest.json** – Documented Clerk vars and `LAUNCHPAD_APPS_PATH` / `PROJECTS_BASE_PATH` for KeyVault/setup.

7. **Header** – Dashboard header now has “About” (→ `/landing`) and `UserButton` (sign out → `/landing`).

---

## Suggestions

- **README** – Update to describe Next.js app (not Electron), `pnpm dev` / `pnpm build`, Clerk setup, and optional `LAUNCHPAD_APPS_PATH` for start-project/clear-cache.

- **Protect more APIs** – Consider requiring auth for `/api/keys/distribute`, `/api/command-center/*` (control, ai-message, metrics, risk-factors), `/api/vercel/*`, and `/api/brain/*` if they are user-facing.

- **projects.json path** – Currently read from `process.cwd()/projects.json`. If deploy runs from a different cwd, set a dedicated env var (e.g. `LAUNCHPAD_PROJECTS_JSON_PATH`) or load from a database.

- **Vercel / cron** – If `/api/cron/*` or `/api/health` are called by Vercel or external health checks, keep them public; avoid protecting them with Clerk.

---

**Build:** Launchpad build requires `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `.env.local` (or env). If missing, Next.js prerender will fail. Use the same Clerk app as Monitor or create one at dashboard.clerk.com.

## Quick reference

| Item              | Status |
|-------------------|--------|
| Clerk auth        | ✅ Added; /, /command-center, /affiliates protected |
| Landing           | ✅ /landing with sign-in CTA |
| Health allowlist  | ✅ localhost + cevict.ai only |
| start-project     | ✅ Auth + env base path |
| kill-port         | ✅ Auth required |
| clear-cache       | ✅ Auth + env base path |
| env.manifest      | ✅ Clerk + path vars |
