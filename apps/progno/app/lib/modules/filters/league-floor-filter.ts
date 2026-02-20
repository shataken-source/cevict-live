/**
 * Filter: League Confidence Floor
 * Per-league minimum confidence thresholds from edge simulation findings.
 * Edge sim 2024: NBA/NHL/MLB need ≥8-10% edge to be profitable.
 */

import type { FilterModule, FilterContext } from '../types'

const FLOORS: Record<string, number> = {
  nfl:   Number(process.env.PROGNO_FLOOR_NFL   ?? 62),
  nba:   Number(process.env.PROGNO_FLOOR_NBA   ?? 60),
  nhl:   Number(process.env.PROGNO_FLOOR_NHL   ?? 59),
  mlb:   Number(process.env.PROGNO_FLOOR_MLB   ?? 59),
  ncaab: Number(process.env.PROGNO_FLOOR_NCAAB ?? 60),
  ncaaf: Number(process.env.PROGNO_FLOOR_NCAAF ?? 62),
  cbb:   Number(process.env.PROGNO_FLOOR_NCAAB ?? 60),
}
const DEFAULT_FLOOR = Number(process.env.PROGNO_MIN_CONFIDENCE ?? 57)

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
