/**
 * Signal: NFL Elo Rating System
 * ─────────────────────────────────────────────────────────────────────────────
 * Ported from tools/nfl_elo_notebook.py (Python Elo model with MOV scaling).
 *
 * Maintains Elo ratings for NFL (and optionally NCAAF) teams, updated after
 * each game result. On analyze(), computes Elo-derived win probability for the
 * home team and returns a confidence delta when it disagrees with the market.
 *
 * The Elo model is a proven, calibrated approach used by FiveThirtyEight and
 * other forecasters. It captures team strength momentum that pure market odds
 * may lag — especially early-season and after bye weeks.
 *
 * Hyperparameters (tuned via grid search on 2024 PFR data):
 *   K = 20, HOME_FIELD = 55, MOV_K = 0.5, INIT_ELO = 1500
 *   Season regression: 1/3 toward mean (standard Elo practice)
 *
 * Supports:
 *   - americanfootball_nfl
 *   - americanfootball_ncaaf (with reduced home-field)
 */

import type { SignalModule, GameContext, SignalOutput } from '../types'

// ── Elo Parameters ───────────────────────────────────────────────────────────

const INIT_ELO = 1500
const K_FACTOR = 20
const HOME_FIELD_NFL = 55     // ~55 Elo points ≈ 57% home win rate
const HOME_FIELD_NCAAF = 65   // College home-field is stronger
const MOV_K = 0.5             // Margin-of-victory multiplier
const SEASON_REGRESSION = 1 / 3 // Regress 1/3 toward mean each season

// Minimum Elo difference to produce a signal (avoids noise on close games)
const MIN_ELO_DIFF = 30
// Maximum confidence delta (cap the signal)
const MAX_DELTA = 6
// How much weight the Elo signal gets (0-1)
const ELO_SIGNAL_WEIGHT = 0.7

// ── Supported Sports ─────────────────────────────────────────────────────────

const SUPPORTED_SPORTS = new Set([
  'americanfootball_nfl',
  'americanfootball_ncaaf',
])

// ── Elo Math ─────────────────────────────────────────────────────────────────

function eloExpected(homeElo: number, awayElo: number, homeField: number): number {
  const diff = (homeElo + homeField) - awayElo
  return 1.0 / (1.0 + Math.pow(10, -diff / 400.0))
}

function eloUpdate(
  homeElo: number,
  awayElo: number,
  homeScore: number,
  awayScore: number,
  k: number,
  homeField: number,
  movK: number,
): [number, number] {
  const expected = eloExpected(homeElo, awayElo, homeField)
  const outcome = homeScore > awayScore ? 1.0 : homeScore < awayScore ? 0.0 : 0.5
  const margin = homeScore - awayScore

  // Margin-of-victory scaling: log(1 + |margin|) * movK
  const movFactor = movK > 0 && margin !== 0
    ? Math.log(1 + Math.abs(margin)) * movK
    : 1.0

  const adjust = k * movFactor * (outcome - expected)
  return [homeElo + adjust, awayElo - adjust]
}

// ── Team Name Normalization ──────────────────────────────────────────────────

// Maps common team name variants to a canonical key for Elo lookup.
// NFL teams have stable names; we match on the last word (mascot) as fallback.
const TEAM_ALIASES: Record<string, string> = {
  // NFL
  'arizona cardinals': 'cardinals', 'atlanta falcons': 'falcons', 'baltimore ravens': 'ravens',
  'buffalo bills': 'bills', 'carolina panthers': 'panthers', 'chicago bears': 'bears',
  'cincinnati bengals': 'bengals', 'cleveland browns': 'browns', 'dallas cowboys': 'cowboys',
  'denver broncos': 'broncos', 'detroit lions': 'lions', 'green bay packers': 'packers',
  'houston texans': 'texans', 'indianapolis colts': 'colts', 'jacksonville jaguars': 'jaguars',
  'kansas city chiefs': 'chiefs', 'las vegas raiders': 'raiders', 'los angeles chargers': 'chargers',
  'los angeles rams': 'rams', 'miami dolphins': 'dolphins', 'minnesota vikings': 'vikings',
  'new england patriots': 'patriots', 'new orleans saints': 'saints', 'new york giants': 'giants',
  'new york jets': 'jets', 'philadelphia eagles': 'eagles', 'pittsburgh steelers': 'steelers',
  'san francisco 49ers': '49ers', 'seattle seahawks': 'seahawks', 'tampa bay buccaneers': 'buccaneers',
  'tennessee titans': 'titans', 'washington commanders': 'commanders',
}

function normalizeTeam(name: string): string {
  const lower = name.toLowerCase().trim()
  // Direct alias match
  if (TEAM_ALIASES[lower]) return TEAM_ALIASES[lower]
  // Try mascot (last word)
  const words = lower.split(/\s+/)
  const mascot = words[words.length - 1]
  if (mascot.length >= 4) {
    for (const alias of Object.values(TEAM_ALIASES)) {
      if (alias === mascot) return alias
    }
  }
  // Fallback: use full lowercase name
  return lower.replace(/[^a-z0-9]/g, '')
}

// ── Elo Rating Store (Supabase-backed) ───────────────────────────────────────
// In-memory cache, hydrated from Supabase `elo_ratings` table on first use.
// Saved back after batch updates (daily-results cron).

const ratings: Map<string, number> = new Map()
let _loaded = false

function getRating(team: string): number {
  const key = normalizeTeam(team)
  return ratings.get(key) ?? INIT_ELO
}

function setRating(team: string, elo: number): void {
  ratings.set(normalizeTeam(team), elo)
}

/**
 * Load all Elo ratings from Supabase into memory.
 * Call once per request/cron invocation before using ratings.
 * Safe to call multiple times (no-ops after first load).
 */
export async function loadRatingsFromSupabase(sbClient: any, sport: string = 'americanfootball_nfl'): Promise<number> {
  if (_loaded) return ratings.size
  try {
    const { data, error } = await sbClient
      .from('elo_ratings')
      .select('team, elo')
      .eq('sport', sport)
    if (error) {
      console.warn(`[elo] Failed to load ratings: ${error.message}`)
      return 0
    }
    if (data && data.length > 0) {
      for (const row of data) {
        ratings.set(row.team, row.elo)
      }
      _loaded = true
      console.log(`[elo] Loaded ${data.length} ratings from Supabase`)
      return data.length
    }
  } catch (e) {
    console.warn(`[elo] loadRatingsFromSupabase error:`, (e as Error).message)
  }
  _loaded = true // Don't retry on same invocation
  return 0
}

/**
 * Save all in-memory ratings to Supabase.
 * Call after processing a batch of game results.
 */
export async function saveRatingsToSupabase(sbClient: any, sport: string = 'americanfootball_nfl'): Promise<void> {
  if (ratings.size === 0) return
  try {
    const rows = Array.from(ratings.entries()).map(([team, elo]) => ({
      team,
      sport,
      elo: Math.round(elo * 10) / 10,
      last_updated: new Date().toISOString(),
    }))
    const { error } = await sbClient
      .from('elo_ratings')
      .upsert(rows, { onConflict: 'team,sport' })
    if (error) {
      console.warn(`[elo] Failed to save ratings: ${error.message}`)
    } else {
      console.log(`[elo] Saved ${rows.length} ratings to Supabase`)
    }
  } catch (e) {
    console.warn(`[elo] saveRatingsToSupabase error:`, (e as Error).message)
  }
}

/**
 * Update ratings after a completed game.
 * Call this from the daily-results cron to keep ratings current.
 */
export function updateEloFromResult(
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  sport: string = 'americanfootball_nfl',
): void {
  const homeField = sport.includes('ncaaf') ? HOME_FIELD_NCAAF : HOME_FIELD_NFL
  const hElo = getRating(homeTeam)
  const aElo = getRating(awayTeam)
  const [hNew, aNew] = eloUpdate(hElo, aElo, homeScore, awayScore, K_FACTOR, homeField, MOV_K)
  setRating(homeTeam, hNew)
  setRating(awayTeam, aNew)
}

/**
 * Apply season regression (call once at start of new season).
 * Regresses all ratings 1/3 toward the mean (1500).
 */
export function applySeasonRegression(): void {
  for (const [team, elo] of ratings.entries()) {
    ratings.set(team, elo + (INIT_ELO - elo) * SEASON_REGRESSION)
  }
}

/**
 * Bulk-load ratings (e.g. from a JSON file). Also marks as loaded.
 */
export function loadRatings(data: Record<string, number>): void {
  for (const [team, elo] of Object.entries(data)) {
    ratings.set(normalizeTeam(team), elo)
  }
  _loaded = true
}

/** Get current ratings snapshot for persistence/debugging. */
export function getRatingsSnapshot(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of ratings.entries()) out[k] = Math.round(v)
  return out
}

/** Reset loaded flag (for testing). */
export function resetEloState(): void {
  ratings.clear()
  _loaded = false
}

// ── Signal Module ────────────────────────────────────────────────────────────

export class EloSignal implements SignalModule {
  readonly id = 'elo'
  readonly name = 'Elo Rating System'
  readonly async = false

  analyze(ctx: GameContext): SignalOutput {
    // Only run for football
    if (!SUPPORTED_SPORTS.has(ctx.sport)) {
      return { confidenceDelta: 0, favors: 'neutral', reasoning: [] }
    }

    const homeField = ctx.sport.includes('ncaaf') ? HOME_FIELD_NCAAF : HOME_FIELD_NFL
    const hElo = getRating(ctx.homeTeam)
    const aElo = getRating(ctx.awayTeam)

    // Elo-derived home win probability
    const eloHomeProb = eloExpected(hElo, aElo, homeField)
    const eloHomePct = eloHomeProb * 100

    // Market-derived home probability (from Shin devig)
    const marketHomePct = ctx.homeNoVigProb * 100

    // Disagreement: how much Elo differs from the market
    const disagreement = eloHomePct - marketHomePct

    // Only signal when Elo meaningfully disagrees
    const eloDiff = Math.abs((hElo + homeField) - aElo)
    if (eloDiff < MIN_ELO_DIFF && Math.abs(disagreement) < 3) {
      return { confidenceDelta: 0, favors: 'neutral', reasoning: [] }
    }

    // Scale delta: larger disagreement → stronger signal, capped
    const rawDelta = disagreement * ELO_SIGNAL_WEIGHT * 0.1
    const delta = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, rawDelta))

    if (Math.abs(delta) < 0.5) {
      return { confidenceDelta: 0, favors: 'neutral', reasoning: [] }
    }

    const favors: 'home' | 'away' = delta > 0 ? 'home' : 'away'
    const reasoning: string[] = []

    const favoredTeam = favors === 'home' ? ctx.homeTeam : ctx.awayTeam
    reasoning.push(
      `Elo: ${ctx.homeTeam} ${Math.round(hElo)} vs ${ctx.awayTeam} ${Math.round(aElo)} → ${(eloHomePct).toFixed(0)}% home (market ${marketHomePct.toFixed(0)}%) — ${favoredTeam} edge ${Math.abs(delta).toFixed(1)}pp`
    )

    return {
      confidenceDelta: Math.round(delta * 10) / 10,
      favors,
      reasoning,
      scores: {
        homeElo: Math.round(hElo),
        awayElo: Math.round(aElo),
        eloHomeProb: Math.round(eloHomePct),
        marketHomeProb: Math.round(marketHomePct),
        disagreement: Math.round(disagreement * 10) / 10,
      },
    }
  }
}
