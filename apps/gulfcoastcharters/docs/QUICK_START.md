# Quick Start (No-BS)

Short path to running the app. For full setup and “what’s actually built,” see `START_HERE.md` and `COMPREHENSIVE_PLATFORM_GUIDE.md`.

---

## 1. Repo and app root

- **Monorepo:** App lives under `apps/gulfcoastcharters/` (or your clone path).
- **From app root:** All commands below are from that directory.

---

## 2. Environment

```bash
cp .env.local.example .env.local
```

Fill in Supabase URL and anon key (and service role only if needed). Add Stripe and other keys the app uses.

---

## 3. Database

- Ensure your Supabase project has the schema (tables, RLS, functions).
- Use `COMPLETE_DATABASE_SETUP.sql` at app root and/or scripts in `supabase/migrations/` as appropriate for a fresh vs existing project.

---

## 4. Run

```bash
npm install
npm run dev
```

Open the URL shown (e.g. `http://localhost:3000`).

---

## 5. Next

- **Admin:** Create an admin user and assign role/RLS; then try `/admin` and sub-routes (see `App.tsx`).
- **What’s implemented:** `FEATURE_IMPLEMENTATION_STATUS.md`, `COMPREHENSIVE_PLATFORM_GUIDE.md` (no-BS).
- **API:** `API_REFERENCE.md` or `API_QUICK_REFERENCE.md` if present.

---

**Note:** Older versions of this doc referred to `/mnt/user-data/outputs/` and `computer://` links from another environment. Those paths are not in this repo; use the paths and files listed above.
