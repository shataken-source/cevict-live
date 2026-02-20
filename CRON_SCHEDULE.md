# CEVICT Data Pipeline - Master Cron Schedule

## Pipeline Flow Diagram

```
06:00 ┌─────────────────────────────────────────────────────────────┐
      │  PROGNO: Generate daily predictions (all leagues)         │
      │  → Saves to: C:\cevict-archive\Probabilityanalyzer\predictions\
      └──────────────────────┬────────────────────────────────────┘
                             │
06:30 ┌──────────────────────▼────────────────────────────────────┐
      │  PROGNOSTICATION: Process & tier predictions              │
      │  → Reads predictions file                                  │
      │  → Saves to: syndicated_picks, markets tables               │
      └──────────────────────┬────────────────────────────────────┘
                             │
07:00 ┌──────────────────────▼────────────────────────────────────┐
      │  ALPHA-HUNTER: Fetch Kalshi markets                     │
      │  → Fetches from Kalshi API (demo/production)            │
      │  → Saves to: bot_predictions table                       │
      │  → Syncs to Prognostication API                           │
      └──────────────────────┬────────────────────────────────────┘
                             │
07:30 ┌──────────────────────▼────────────────────────────────────┐
      │  SPORTSBOOK-TERMINAL: Import all picks                    │
      │  → Imports Kalshi picks from Prognostication API          │
      │  → Imports sports picks from archive                      │
      │  → Saves to: kalshi_bets, polymarket_bets tables          │
      └──────────────────────────────────────────────────────────┘
```

## Detailed Schedule

### PROGNO (Prediction Generation)
| Time | Schedule | Task | Output |
|------|----------|------|--------|
| 06:00 | Daily | `npm run simulate` | predictions-YYYY-MM-DD.json |
| 12:00 | Daily | `npm run simulate` (midday update) | predictions-YYYY-MM-DD-afternoon.json |
| 18:00 | Daily | `npm run simulate` (evening update) | predictions-YYYY-MM-DD-evening.json |

### PROGNOSTICATION (API Layer)
| Time | Schedule | Task | Description |
|------|----------|------|-------------|
| 06:15 | Daily | Process Progno output | Reads predictions, saves to Supabase |
| 06:30 | Daily | Generate tiered picks | Elite/Pro/Free tier assignment |
| Every 5 min | Continuous | Health check | Verify API availability |

### ALPHA-HUNTER (Kalshi/Polymarket)
| Time | Schedule | Task | Output |
|------|----------|------|--------|
| 07:00 | Daily | `npm run kalshi` | Fetch Kalshi markets |
| 07:15 | Daily | `npm run live` (short run) | Generate predictions, save to bot_predictions |
| Every 15 min | Continuous | `fetchAndSaveKalshiPredictions()` | Update market prices |
| 00:00 | Daily | Settlement check | Resolve closed markets |

### SPORTSBOOK-TERMINAL (Data Consumer)
| Time | Schedule | Task | Description |
|------|----------|------|-------------|
| 07:30 | Daily | Run scheduler.ts | Import all picks to kalshi_bets |
| 07:45 | Daily | `/api/import-kalshi-sports` | Import from prognostication API |
| Every 10 min | Continuous | Cache refresh | Update kalshi-picks.json cache |
| 03:00 | Daily | Results processing | Grade previous day's picks |

## Cron Expression Reference

```bash
# PROGNO - Daily predictions at 6:00 AM, 12:00 PM, 6:00 PM
0 6,12,18 * * * cd /c/cevict-live/apps/progno && npm run simulate

# PROGNOSTICATION - Process predictions at 6:15 AM
15 6 * * * curl -s http://localhost:3005/api/cron/process-predictions

# ALPHA-HUNTER - Kalshi fetch at 7:00 AM
0 7 * * * cd /c/cevict-live/apps/alpha-hunter && npm run kalshi

# ALPHA-HUNTER - Live trader at 7:15 AM (5 min run)
15 7 * * * cd /c/cevict-live/apps/alpha-hunter && timeout 300 npm run live

# SPORTSBOOK-TERMINAL - Import at 7:30 AM
30 7 * * * cd /c/cevict-live/apps/sportsbook-terminal && npm run scheduler

# SPORTSBOOK-TERMINAL - Cache refresh every 10 minutes
*/10 * * * * cd /c/cevict-live/apps/sportsbook-terminal && npm run cache:refresh
```

## Windows Task Scheduler Alternative (PowerShell)

```powershell
# For Windows systems, use these PowerShell commands to schedule tasks:

# PROGNO - Daily at 6:00 AM
schtasks /create /tn "Progno-Daily-Predictions" /tr "powershell -Command 'cd C:\cevict-live\apps\progno; npm run simulate'" /sc daily /st 06:00

# ALPHA-HUNTER - Daily at 7:00 AM
schtasks /create /tn "AlphaHunter-Kalshi-Fetch" /tr "powershell -Command 'cd C:\cevict-live\apps\alpha-hunter; npm run kalshi'" /sc daily /st 07:00

# SPORTSBOOK-TERMINAL - Daily at 7:30 AM
schtasks /create /tn "Sportsbook-Import" /tr "powershell -Command 'cd C:\cevict-live\apps\sportsbook-terminal; node scripts/scheduler.ts'" /sc daily /st 07:30
```

## Data Dependencies

```
1. PROGNO generates predictions (prerequisite for all)
   ↓
2. PROGNOSTICATION processes and tiers picks
   ↓
3. ALPHA-HUNTER fetches Kalshi markets (can run parallel to step 2)
   ↓
4. SPORTSBOOK-TERMINAL imports all data (must wait for steps 2 & 3)
```

## Error Handling & Retries

| Step | Retry Logic | Max Retries | Fallback |
|------|-------------|-------------|----------|
| PROGNO | Wait 10 min, retry | 3 | Use previous day's predictions |
| PROGNOSTICATION | Wait 5 min, retry | 3 | Serve from cache |
| ALPHA-HUNTER | Wait 5 min, retry | 2 | Use cached kalshi-picks.json |
| SPORTSBOOK-TERMINAL | Wait 2 min, retry | 5 | Use local cache file |

## Monitoring

All cron jobs should log to:
- `C:\cevict-archive\{app-name}\logs\cron-{YYYY-MM-DD}.log`

Success/failure notifications via:
- Discord webhook (configured in .env.local)
- Email (if RESEND_API_KEY configured)

## Last Updated
2026-02-19
