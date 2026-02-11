# Dev server ports (local)

One port per app so they don’t conflict when running multiple at once.

| Port | App |
|------|-----|
| 3000 | cevict-ai |
| 3002 | praxis (Praxis) |
| 3005 | prognostication |
| 3006 | popthepopcorn |
| 3007 | petreunion |
| 3008 | progno |
| 3009 | gulfcoastcharters (gcc) |
| 3010 | smokersrights |
| 3011 | wheretovacation |
| 3122 | accu-solar |
| 3847 | local-agent (Cochran) |

**Note:** `.\sync-env.ps1 -All` syncs every app under `apps/` that has an `env.manifest.json` (including praxis). No per-app whitelist.

**Supabase:** If you use the `runtime_ports` table (e.g. WTV migration), keep it in sync with this list. See `apps/wheretovacation/referene/newer/supabase/migrations/20251212_runtime_ports.sql` for the table definition.
