# Session Handover

**Last updated:** 2026-03-03 13:20 CST
**Status:** Idle

## Completed
- Progno pick engine tuning: 10-iteration calibration (MC confidence, ranking, floors, analyzer multipliers)
- Auto-calibration engine: `/api/cron/auto-calibrate` route + weekly cron (Mon 3:30 AM UTC)
- Admin FINE-TUNE tab: manual calibration button with days selector + results UI
- Live Odds tab: click-to-sort any column, league filter dropdown, Shin devig upgrade
- Live Odds API: upgraded no-vig from simple overround to Shin devig (matches pick engine)
- Pipeline audit script: `scripts/run-pipeline-audit.ts`
- Supabase migration: `20260303_calibration_history.sql` (file created, NOT yet run against Supabase)
- Tuning config defaults updated (NHL floor 62, NCAA floor 66, min conf 58, NCAA/CBB analyzer off)
- Reran today's predictions (59 picks), Kalshi execute (5 matched, all rejected — heavy favorites below 50¢ win threshold)
- Session continuity protocol added to `.windsurfrules`
- Committed and pushed: `67b87dde` on `gcc-vessels`

## Pending
- Run `20260303_calibration_history.sql` migration against production Supabase
- Progno needs Vercel deploy to pick up all changes (dashboard-level build ignore must be cleared first)
- Alpha Hunter still needs deploy for trade sizing fix (commit `25dcbd3e`)

## Blockers / Warnings
- Progno has dashboard-level build ignore on Vercel — must clear ignore → deploy → restore ignore
- Each git push triggers ALL Vercel project builds (~$10+ per push)

## Next step
In the next run, I must immediately: check if the user wants to deploy Progno/Alpha Hunter, and run the calibration_history migration.
