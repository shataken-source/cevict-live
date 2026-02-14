# Accu Solar

Solar monitoring dashboard with real-time telemetry (Victron, EcoFlow, etc.), weather integration, AI chat for solar insights, and datasource management. Built for off-grid and hybrid solar setups.

## What it does

- **Telemetry** — Ingest and display battery, inverter, and solar production data (Victron ESS, EcoFlow, BLE devices)
- **Weather** — NOAA integration for solar-impact forecasting
- **AI chat** — Ask questions about your system; get summaries and recommendations
- **Datasources** — Manage multiple solar systems; geocode for location-aware insights
- **Profile** — User/site configuration

## Quick start

```bash
cd apps/accu-solar
pnpm install
pnpm dev
```

Runs at **http://localhost:3122**

## Environment variables

Create `.env.local` (or use KeyVault `sync-env.ps1`):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side operations |
| `ANTHROPIC_API_KEY` | AI chat (optional) |

See `env.manifest.json` for the full manifest.

## API routes

| Route | Description |
|-------|-------------|
| `POST /api/telemetry/ingest` | Ingest telemetry from Victron/datasources |
| `GET /api/weather/noaa` | NOAA weather data |
| `GET /api/datasource` | List datasources |
| `POST /api/ai-chat` | AI chat for solar insights |
| `GET /api/profile` | User profile |

## Database

Run migrations in Supabase SQL Editor:
- `supabase/migrations/20260212000000_accu_solar_tiers_and_knowledge.sql`

## Tech stack

- Next.js 16, React 19
- Supabase (auth, DB)
- Tailwind CSS
- Anthropic (AI chat)

---

Part of the CEVICT monorepo.
