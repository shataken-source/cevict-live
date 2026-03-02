/**
 * Filter: League Confidence Floor
 * Reads from getTuningConfigSync() when set (admin fine-tune), else env/defaults.
 */

import type { FilterModule, FilterContext } from '../types'
import { getTuningConfigSync } from '@/app/lib/tuning-config'

const FLOORS: Record<string, number> = {
  nfl:   Number(process.env.PROGNO_FLOOR_NFL   ?? 60),
  nba:   Number(process.env.PROGNO_FLOOR_NBA   ?? 58),
  nhl:   Number(process.env.PROGNO_FLOOR_NHL   ?? 57),
  mlb:   Number(process.env.PROGNO_FLOOR_MLB   ?? 57),
  ncaab: Number(process.env.PROGNO_FLOOR_NCAAB ?? 62),
  ncaaf: Number(process.env.PROGNO_FLOOR_NCAAF ?? 62),
  cbb:   Number(process.env.PROGNO_FLOOR_CBB   ?? 66),
}
const DEFAULT_FLOOR = Number(process.env.PROGNO_MIN_CONFIDENCE ?? 56)

function getFloor(key: string): number {
  const config = getTuningConfigSync()
  if (config) {
    const envKey = 'PROGNO_FLOOR_' + key.toUpperCase()
    const v = config[envKey]
    if (typeof v === 'number') return v
    const def = config.PROGNO_MIN_CONFIDENCE
    if (typeof def === 'number') return def
  }
  return FLOORS[key] ?? DEFAULT_FLOOR
}

export class LeagueFloorFilter implements FilterModule {
  readonly id = 'league-floor'
  readonly description = 'Per-league minimum confidence (edge-sim calibrated)'

  passes({ ctx, confidence }: FilterContext): boolean {
    const key = ctx.sport.toLowerCase()
      .replace(/^basketball_|^americanfootball_|^icehockey_|^baseball_/, '')
    const floor = getFloor(key)
    return confidence >= floor
  }
}
