# Env keys quick reference

**Full list (key names + which files have them):** `env-keys-sorted.txt` at repo root.  
**Regenerate it:** `.\scripts\collect-env-keys.ps1`  
**Show masked values:** `.\scripts\collect-env-keys.ps1 -IncludeValues` (sensitive keys show as `***` — you still copy the real value from the file).

**Sync keys into all apps (one shot):**  
`.\scripts\sync-env-keys-to-apps.ps1`  
Reads OPENAI_API_KEY and ANTHROPIC_API_KEY from root or progno/petreunion/gcc/wtv (first non-empty wins) and adds any *missing* keys to .env.local in progno, petreunion, gulfcoastcharters, wheretovacation, prognostication, moltbook-viewer. Run `-WhatIf` first to see what would be added.

---

## OPENAI_API_KEY — where it already lives

Your OpenAI key is already in at least one of these (see `env-keys-sorted.txt` line ~272 for the full list):

| App / location | Path |
|----------------|------|
| Root | `.env.local` or `.env.local.backup` |
| Progno | `apps\progno\.env.local` |
| PetReunion | `apps\petreunion\.env.local` |
| Gulf Coast Charters | `apps\gulfcoastcharters\.env.local` |
| WhereToVacation | `apps\wheretovacation\.env.local` |
| Prognostication (progno-massager) | `apps\prognostication\progno-massager\.env.local` |
| GCC (alias) | `apps\gcc\.env.local` |

**To use it somewhere else (e.g. Moltbook Viewer):** Open any of the above, copy the line `OPENAI_API_KEY=sk-...`, and add it to that app’s `.env.local` (e.g. `apps\moltbook-viewer\.env.local`). Same key is fine in every app.

---

## CFBD (College Football / Basketball Data)

**Env vars:** `CFBD_API_KEY` or `CFBD_KEY` (see `env-keys-sorted.txt`). Store the key in `.env.local` or vault only — never commit it.

| Item | Details |
|------|---------|
| **Tier** | Free (confirmed by CFBD Admin Feb 2026) |
| **Limit** | 1,000 requests per calendar month |
| **Basketball** | **Same key** for football and basketball. Use for both [CollegeFootballData.com](https://collegefootballdata.com) and [CollegeBasketballData.com](https://collegebasketballdata.com). |
| **Validate tier / usage** | Query the `/info` endpoint, or register a password on CollegeFootballData.com or CollegeBasketballData.com, log in, and view your profile. |
| **Used in repo** | `auditTest.js` (NCAAF games: `api.collegefootballdata.com`). Same key can be used for NCAAB if you add CollegeBasketballData API calls. |

**Terms (summary):** Free-tier keys only; no multiple keys via alias/disposable emails; abusive use can get key revoked. Server-side only for web apps.

---

## Apps you’re working on / want filled

| App | .env.local | Needs OPENAI for |
|-----|------------|------------------|
| **progno** | `apps\progno\.env.local` | (already has it per list) |
| **petreunion** | `apps\petreunion\.env.local` | (already has it) |
| **prognostication** | `apps\prognostication\.env.local` or progno-massager path | Picks/API if used |
| **gcc** (Gulf Coast Charters) | `apps\gulfcoastcharters\.env.local` | (already has it) |
| **wheretovacation** (wtv) | `apps\wheretovacation\.env.local` | (already has it) |
| **moltbook-viewer** | `apps\moltbook-viewer\.env.local` | Help chat (?) — copy `OPENAI_API_KEY` from any row above |

Fill any missing app by copying the needed keys from another app’s `.env.local` or from root `.env.local` / `.env.local.backup`. The collect script only lists key names and files; it doesn’t print secret values (use the actual file to copy).

---

## Prognostication - APIs / env keys

Use **`apps\prognostication\.env.local`**. Key names (add any you need):

| Key | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only (Kalshi picks, trades, admin) |
| `PROGNO_BASE_URL` | Progno app URL for picks (e.g. http://localhost:3008) |
| `STRIPE_SECRET_KEY` | Checkout + tier checks (Pro/Elite) |
| `NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID` | Stripe price ID Pro weekly |
| `NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID` | Stripe price ID Pro monthly |
| `NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID` | Stripe price ID Elite weekly |
| `NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID` | Stripe price ID Elite monthly |
| `DISCORD_WEBHOOK_URL` | Post picks/alerts to Discord (see apps/prognostication/DISCORD_SETUP.md) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Google Search Console (optional) |
| `NEXT_PUBLIC_ADSENSE_*` | Ad slots if using AdSense (optional) |

Full list and where each is used: **`apps\prognostication\ENV-KEYS-REFERENCE.md`**.

---

## CRON_SECRET — where to set and find it

**CRON_SECRET is not stored in the repo.** You set it yourself in env (or KeyVault) and use it to protect cron endpoints.

| Where to set it | Notes |
|-----------------|--------|
| **Progno** | `apps\progno\.env.local` → `CRON_SECRET=your-random-secret` |
| **Prognostication** | `apps\prognostication\.env.local` (if progno crons are triggered from there) |
| **PetReunion** | `apps\petreunion\.env.local` → used by `/api/cron/pet-of-the-day?secret=YOUR_SECRET` |
| **GCC** | `apps\gulfcoastcharters\.env.local` → review-requests, booking-alerts, email-reports |
| **PopThePopcorn** | `apps\popthepopcorn\.env.local` → cron scrape, trends, news-drop |
| **KeyVault** | Add to env-store and sync into the app’s `.env.local` (see `scripts/KEYVAULT_USAGE.md`) |
| **Vercel** | Project → Settings → Environment Variables → `CRON_SECRET` (Vercel Cron sends it as `Authorization: Bearer <value>`) |

**How it’s used:**  
- **Progno:** `Authorization: Bearer CRON_SECRET` on daily-predictions, daily-results, generate-picks, sync-injuries, track-odds, sentiment, news-scraper, run-cron, keys, early-vs-regular.  
- **PetReunion:** `?secret=CRON_SECRET` on `/api/cron/pet-of-the-day`.  
- **GCC:** Bearer or `?secret=` on review-requests, booking-alerts, email-reports.  
- **PopThePopcorn:** Bearer on cron scrape/trends/news-drop.

**To find your current value:** Check the app’s `.env.local` (or the env store file if you use KeyVault). If you never set it, there is no value — set a random string and add it to env + Vercel for that app.

**Generate a strong value (PowerShell, 48 hex chars):**
```powershell
$bytes = [byte[]]::new(24); [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes); [System.Convert]::ToHexString($bytes)
```

**Set one secret for all apps (KeyVault):**
```powershell
cd c:\cevict-live\scripts\keyvault
.\set-secret.ps1 -Name CRON_SECRET -Value "PASTE_YOUR_HEX_STRING_HERE"
.\sync-env.ps1 -All
```
Use **`CRON_SECRET`** (uppercase) as the name — that’s what app manifests expect. If you saved as `cron_secret`, run set-secret again with `-Name CRON_SECRET` and the same value, then `sync-env.ps1 -All`.
Then add the same value in Vercel → each project that has crons → Environment Variables → `CRON_SECRET` (Production + Preview if you use cron there).

**Per-app secret (optional):** Generate a new hex string, then set in the store under a key like `CRON_SECRET_PROGNO`, add that key to that app’s `env.manifest.json`, and sync. Or set `CRON_SECRET` in only one app’s `.env.local` and leave others without it if they don’t use crons.
