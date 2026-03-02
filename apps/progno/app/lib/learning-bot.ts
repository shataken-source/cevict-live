/**
 * Learning bot (experimental): analyze graded prediction_results and suggest
 * floor/min-confidence tuning changes. Optionally merge and save to tuning_config.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getTuningConfigForAdmin, saveTuningConfig } from './tuning-config'

const FLOOR_KEYS = ['NBA', 'NHL', 'NFL', 'MLB', 'NCAAB', 'NCAAF', 'CBB'] as const
const MIN_CONF_KEY = 'PROGNO_MIN_CONFIDENCE'

// Leagues we can suggest floors for (from prediction_results.league)
const LEAGUE_TO_FLOOR_KEY: Record<string, string> = {
  NBA: 'PROGNO_FLOOR_NBA',
  NHL: 'PROGNO_FLOOR_NHL',
  NFL: 'PROGNO_FLOOR_NFL',
  MLB: 'PROGNO_FLOOR_MLB',
  NCAAB: 'PROGNO_FLOOR_NCAAB',
  NCAAF: 'PROGNO_FLOOR_NCAAF',
  CBB: 'PROGNO_FLOOR_CBB',
  basketball_nba: 'PROGNO_FLOOR_NBA',
  icehockey_nhl: 'PROGNO_FLOOR_NHL',
  americanfootball_nfl: 'PROGNO_FLOOR_NFL',
  baseball_mlb: 'PROGNO_FLOOR_MLB',
  basketball_ncaab: 'PROGNO_FLOOR_NCAAB',
  americanfootball_ncaaf: 'PROGNO_FLOOR_NCAAF',
  baseball_ncaa: 'PROGNO_FLOOR_CBB',
}

export type LearningBotResult = {
  success: boolean
  suggested: Record<string, number>
  summary: string
  applied?: boolean
  error?: string
}

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

/**
 * Analyze last N days of prediction_results; suggest floor / min-confidence changes.
 * Uses win rate at different confidence bands: if raising the floor would have
 * improved win rate (with enough sample), suggest that floor.
 */
export async function analyzeRecentResults(options?: {
  days?: number
}): Promise<{ suggested: Record<string, number>; summary: string; byLeague: Record<string, { wins: number; total: number; winRate: number; suggestedFloor?: number }> }> {
  const days = options?.days ?? 7
  const sb = getSupabase()
  if (!sb) {
    return { suggested: {}, summary: 'Supabase not configured.', byLeague: {} }
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const start = startDate.toISOString().split('T')[0]

  const { data: rows, error } = await sb
    .from('prediction_results')
    .select('game_date, league, sport, confidence, status')
    .in('status', ['win', 'lose'])
    .gte('game_date', start)

  if (error) {
    return { suggested: {}, summary: `DB error: ${error.message}`, byLeague: {} }
  }
  if (!rows?.length) {
    return { suggested: {}, summary: `No graded results in last ${days} days.`, byLeague: {} }
  }

  type Row = { league?: string; sport?: string; confidence?: number; status: string }
  const normalized = (rows as Row[]).map((r) => ({
    league: normalizeLeague(r.league ?? r.sport),
    confidence: typeof r.confidence === 'number' ? r.confidence : Number(r.confidence) || 0,
    win: r.status === 'win',
  })).filter((r) => r.league && FLOOR_KEYS.includes(r.league as any))

  const byLeague: Record<string, { wins: number; total: number; winRate: number; suggestedFloor?: number }> = {}
  const suggested: Record<string, number> = {}

  // Current floors from tuning config (we'll get them from getTuningConfigForAdmin in runLearningBot)
  // For analyze we only need to suggest relative to data; we'll merge with current in the route.
  const bands = [52, 54, 56, 58, 60, 62, 64, 66, 68]
  for (const league of FLOOR_KEYS) {
    const leagueRows = normalized.filter((r) => r.league === league)
    if (leagueRows.length < 5) continue

    const wins = leagueRows.filter((r) => r.win).length
    const total = leagueRows.length
    const winRate = total > 0 ? (wins / total) * 100 : 0
    byLeague[league] = { wins, total, winRate }

    // Suggest highest floor that still has >= 5 picks and win rate >= 55% (raise bar without dropping sample)
    let bestFloor: number | undefined
    for (const floor of [...bands].reverse()) {
      const slice = leagueRows.filter((r) => r.confidence >= floor)
      if (slice.length < 5) continue
      const w = slice.filter((r) => r.win).length
      const wr = (w / slice.length) * 100
      if (wr >= 55) {
        bestFloor = floor
        break
      }
    }
    if (bestFloor !== undefined) {
      const floorKey = LEAGUE_TO_FLOOR_KEY[league]
      if (floorKey) suggested[floorKey] = bestFloor
      byLeague[league].suggestedFloor = bestFloor
    }
  }

  // Global min confidence: same idea across all leagues
  const allRows = normalized
  if (allRows.length >= 10) {
    let bestMin = undefined
    for (const floor of [52, 54, 56, 58]) {
      const slice = allRows.filter((r) => r.confidence >= floor)
      if (slice.length < 10) continue
      const w = slice.filter((r) => r.win).length
      if ((w / slice.length) * 100 >= 54) bestMin = floor
    }
    if (bestMin !== undefined) suggested[MIN_CONF_KEY] = bestMin
  }

  const parts: string[] = []
  for (const [k, v] of Object.entries(byLeague)) {
    parts.push(`${k}: ${v.wins}W/${v.total} (${v.winRate.toFixed(1)}%${v.suggestedFloor != null ? `, suggest floor ${v.suggestedFloor}` : ''})`)
  }
  const summary = parts.length
    ? `Last ${days}d: ${parts.join('; ')}. Suggested: ${Object.keys(suggested).length} change(s).`
    : `No league data with enough picks in last ${days} days.`

  return { suggested, summary, byLeague }
}

function normalizeLeague(league?: string): string | null {
  if (!league) return null
  const u = league.toUpperCase().replace(/\s+/g, '')
  if (FLOOR_KEYS.includes(u as any)) return u
  const lower = league.toLowerCase()
  const map: Record<string, string> = {
    basketball_nba: 'NBA',
    icehockey_nhl: 'NHL',
    americanfootball_nfl: 'NFL',
    baseball_mlb: 'MLB',
    basketball_ncaab: 'NCAAB',
    americanfootball_ncaaf: 'NCAAF',
    baseball_ncaa: 'CBB',
  }
  return map[lower] ?? null
}

/**
 * Run the learning bot: analyze, optionally merge suggestions into tuning_config and save.
 * Auto-apply only when EXPERIMENTAL_LEARNING_BOT_AUTO_APPLY=1.
 */
export async function runLearningBot(options?: {
  days?: number
  autoApply?: boolean
}): Promise<LearningBotResult> {
  const { suggested, summary, byLeague } = await analyzeRecentResults({ days: options?.days ?? 7 })
  const allowApply = options?.autoApply === true && process.env.EXPERIMENTAL_LEARNING_BOT_AUTO_APPLY === '1'

  if (Object.keys(suggested).length === 0) {
    return { success: true, suggested: {}, summary, applied: false }
  }

  if (!allowApply) {
    return {
      success: true,
      suggested,
      summary: summary + ' (not applied; set EXPERIMENTAL_LEARNING_BOT_AUTO_APPLY=1 and pass autoApply to apply).',
      applied: false,
    }
  }

  try {
    const current = await getTuningConfigForAdmin()
    const merged = { ...current, ...suggested } as Record<string, unknown>
    const { ok, error } = await saveTuningConfig(merged)
    if (!ok) {
      return { success: false, suggested, summary, applied: false, error }
    }
    return {
      success: true,
      suggested,
      summary: summary + ' Applied and saved.',
      applied: true,
    }
  } catch (e: any) {
    return {
      success: false,
      suggested,
      summary,
      applied: false,
      error: e?.message ?? 'Save failed',
    }
  }
}
