/**
 * Filter: League Confidence Floor
 * Per-league minimum confidence thresholds from edge simulation findings.
 * 5000-run sim (Mar 2026): NCAAB/NCAA overconfident — raised college floors to drop marginal picks.
 * CBB (College Baseball): 44% win rate vs 73% avg conf in perf report — raised CBB floor to 68% to take only higher-conviction picks.
 */

import type { FilterModule, FilterContext } from '../types'

const FLOORS: Record<string, number> = {
  nfl:   Number(process.env.PROGNO_FLOOR_NFL   ?? 62),
  nba:   Number(process.env.PROGNO_FLOOR_NBA   ?? 60),
  nhl:   Number(process.env.PROGNO_FLOOR_NHL   ?? 59),
  mlb:   Number(process.env.PROGNO_FLOOR_MLB   ?? 59),
  ncaab: Number(process.env.PROGNO_FLOOR_NCAAB ?? 64),
  ncaaf: Number(process.env.PROGNO_FLOOR_NCAAF ?? 64),
  cbb:   Number(process.env.PROGNO_FLOOR_CBB   ?? 68),  // College Baseball: stricter to improve WR (was losing at 57–64%)
}
const DEFAULT_FLOOR = Number(process.env.PROGNO_MIN_CONFIDENCE ?? 58)

export class LeagueFloorFilter implements FilterModule {
  readonly id = 'league-floor'
  readonly description = 'Per-league minimum confidence (edge-sim calibrated)'

  passes({ ctx, confidence }: FilterContext): boolean {
    const key = ctx.sport.toLowerCase()
      .replace(/^basketball_|^americanfootball_|^icehockey_|^baseball_/, '')
    const floor = FLOORS[key] ?? DEFAULT_FLOOR
    return confidence >= floor
  }
}
