# Sportsbook Terminal

**Institutional Probability Trading Terminal — Prognostication Capital**

A local dashboard and data pipeline that pulls Kalshi picks from the Prognostication API, stores them in Supabase, and serves them through a web UI. It sits between the prediction engines (Progno) and the execution layer (Alpha-Hunter).

---

## What It Does

```
Progno (port 3008)
  └─ generates predictions-YYYY-MM-DD.json
       └─ stored in Supabase Storage

Prognostication (prognostication.com)
  └─ /api/kalshi/picks  ←── scheduler fetches from here
       │
       ▼
Sportsbook Terminal (port 3433)
  ├─ imports picks → Supabase kalshi_bets table
  ├─ caches to data/kalshi-picks.json
  └─ serves dashboard at http://localhost:3433
       └─ tiered picks: Elite / Pro / Free
```

**In plain English:** Run `node server.js`, open `http://localhost:3433`, and you get a live dashboard of today's Kalshi picks with confidence scores, edge %, and tier labels. The scheduler auto-imports from Prognostication every morning at 7:30 AM.

---

## Quick Start

```powershell
cd C:\cevict-live\apps\sportsbook-terminal
node server.js
# Open http://localhost:3433
```

To manually trigger a data import:
```powershell
npx tsx scripts/scheduler.ts
```

---

## Architecture

```
sportsbook-terminal/
├── server.js                    # Express server — port 3433
├── public/
│   └── index.html               # Dashboard UI (served at /)
├── scripts/
│   ├── scheduler.ts             # Import + archive pipeline
│   ├── convert-to-kalshi.ts     # Format converter for pick data
│   └── run-scheduler.ps1        # Windows Task Scheduler runner
├── cron/
│   └── daily-import.ts          # 7:30 AM daily cron
├── src/
│   ├── polymarket-integration.ts  # Polymarket stub (not active)
│   ├── capital-allocator/         # Kelly criterion sizing
│   ├── risk-engine/               # Risk management
│   └── strategy-engine/           # Strategy logic
├── data/
│   └── kalshi-picks.json          # Local cache (fallback)
├── database/
│   └── schema.sql                 # Supabase table definitions
├── docs/
│   ├── TECHNICAL_OVERVIEW.md
│   ├── USER_GUIDE.md
│   └── AI_AGENT_GUIDE.md
├── API_DOCUMENTATION.md           # Full REST API reference
└── SCHEDULER_README.md            # Scheduler setup guide
```

---

## Two entrypoints

| Entrypoint | Use case | Auth / limits |
|------------|----------|----------------|
| **`node server.js`** | Dashboard + pipeline (recommended for daily use). Serves UI at `http://localhost:3433`, runs scheduler/archive/export. | Rate-limited; admin endpoints require localhost or `SPORTSBOOK_API_KEY`. |
| **`npm run dev`** → `api/server.ts` | Full API with Supabase auth, capital allocation, Monte Carlo, parlays, Stripe. | Token auth on most routes; rate-limited. |

Use **server.js** for the dashboard and manual imports. Use **api/server.ts** when you need the allocation/simulation or Stripe flows.

---

## Environment Variables

Set in `.env.local`:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL (`https://rdbuwyefbgnbuhmjrizo.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | Service role key (bypasses RLS for imports) |
| `PROGNO_URL` | Prognostication API base (`http://localhost:3005` or Vercel URL) |
| `PROGNO_API_KEY` | API key for Prognostication webhook |
| `FRONTEND_URL` | This server's URL (`http://localhost:3433`). Also used as default CORS allowed origin. |
| `CORS_ORIGINS` | Comma-separated allowed origins (overrides FRONTEND_URL for CORS). Use `*` to allow all (not recommended). |
| `SPORTSBOOK_API_KEY` | Optional. If set in env, admin endpoints require this as `X-API-Key` or `Authorization: Bearer <key>`. If unset, admin accepts localhost only. (Not in keyvault by default; add to store only if you need remote admin auth.) |

The server also accepts `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as aliases (auto-bridged).

---

## API Endpoints

### Public

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Dashboard HTML |
| `/api/health` | GET | Health check |
| `/api/kalshi-sports` | GET | Picks from Supabase (`kalshi_bets`) |
| `/api/v1/predictions` | GET | All predictions with market data |
| `/api/v1/markets` | GET | Active markets with predictions |
| `/api/v1/signals` | GET | Active trading signals |
| `/api/v1/stats` | GET | DB counts + archive stats |
| `/api/v1/archive/predictions` | GET | List archived prediction files |
| `/api/v1/archive/results` | GET | List archived results files |

### Admin (rate-limited; require localhost or `X-API-Key` / `SPORTSBOOK_API_KEY`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/run-scheduler` | POST | Run the import scheduler |
| `/api/archive` | POST | Trigger file archiving |
| `/api/export-picks` | POST | Push picks from frontend → Supabase |
| `/api/export-supabase` | POST | Run scheduler (alias) |
| `/api/import-kalshi-sports` | GET | Import from cache file into Supabase |

When `SPORTSBOOK_API_KEY` is not set, only requests from localhost are allowed. Set the key in `.env.local` and send it as `X-API-Key` or `Authorization: Bearer <key>` when calling from another machine.

Full request/response examples: see `API_DOCUMENTATION.md`.

---

## Data Pipeline

### Daily Import (Automated)

The scheduler runs at **7:30 AM** via Windows Task Scheduler or cron:

1. Fetches picks from `PROGNO_URL/api/kalshi/picks?tier=all&limit=50`
2. Falls back to `data/kalshi-picks.json` if API is unreachable (5s timeout)
3. Transforms picks into `kalshi_bets` schema
4. Upserts to Supabase
5. Archives processed files to `C:\cevict-archive\Probabilityanalyzer\`
6. Logs to `logs/scheduler-YYYY-MM-DD.log`

### Manual Import

```powershell
# Via API
curl -X POST http://localhost:3433/api/run-scheduler

# Via script directly
npx tsx scripts/scheduler.ts
```

---

## Supabase Tables

### `kalshi_bets`
Kalshi picks imported from Prognostication.

| Column | Type | Description |
|---|---|---|
| `market_id` | text | Kalshi market ticker |
| `market_title` | text | Human-readable title |
| `category` | text | Sport/category |
| `pick` | text | YES or NO |
| `probability` | integer | Model probability (0–100) |
| `edge` | decimal | Edge over market price |
| `market_price` | integer | Current Kalshi price in cents |
| `expires_at` | timestamp | Market close time |
| `confidence` | integer | Confidence score |
| `tier` | text | `elite` / `premium` / `free` |
| `status` | text | `open` / `closed` / `settled` |

### `markets` / `predictions` / `signals`
Used by the v1 REST API. Created via `database/schema.sql`.

---

## Dashboard

The web UI at `http://localhost:3433` shows:
- **Elite picks** — confidence ≥ 80%, highest edge
- **Pro picks** — confidence 65–79%
- **Free picks** — confidence < 65%
- Search and filter by sport/league
- Auto-refreshes every 5 minutes
- Mobile-responsive

---

## Relationship to Other Apps

| App | Relationship |
|---|---|
| `apps/progno` | **Upstream** — generates predictions, stores in Supabase Storage |
| `apps/alpha-hunter` | **Parallel** — also consumes picks, executes trades on Kalshi |
| `prognostication.com` | **Upstream** — webhook target; sportsbook-terminal reads from its `/api/kalshi/picks` |

> **Note:** `PROGNO_URL` points to `https://prognostication.com` (Vercel). `PROGNO_API_KEY` is set via KeyVault.

---

## Scheduler Setup (Windows Task Scheduler)

Requires admin to register. See `SCHEDULER_README.md` for full instructions.

```powershell
# Quick setup (run as Administrator)
cd C:\cevict-live\apps\sportsbook-terminal\scripts
.\run-scheduler.ps1 -SetupTask

# Run manually
.\run-scheduler.ps1 -RunNow

# Check status
Get-ScheduledTask -TaskName "ProbabilityAnalyzer-Scheduler"
```

---

## Troubleshooting

**Dashboard shows "No picks"**
```powershell
npx tsx scripts/scheduler.ts   # run import manually
# then check: data/kalshi-picks.json has content
```

**Port 3433 in use**
```powershell
netstat -ano | findstr :3433
taskkill /PID <PID> /F
```

**Supabase errors**
- Verify `SUPABASE_SERVICE_KEY` is the service role key (not anon key)
- Check `kalshi_bets` table exists — run `database/schema.sql` if not

**Prognostication API unreachable**
- Server falls back to `data/kalshi-picks.json` automatically
- Update `PROGNO_URL` to `https://prognostication.com` if running against Vercel deployment

---

## Logs

```
logs/scheduler-YYYY-MM-DD.log          # scheduler run logs
C:\cevict-archive\Probabilityanalyzer\ # archived prediction + results files
```
