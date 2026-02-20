/**
 * PROGNO MODULE SYSTEM
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop a new file into app/lib/modules/ that exports a default implementing
 * one of these interfaces, then register it in module-registry.ts.
 *
 * No changes to route.ts needed — the engine loops over registered modules.
 */

// ── Shared game context passed to every module ────────────────────────────────

export interface GameContext {
  gameId: string
  sport: string               // e.g. 'americanfootball_nfl'
  homeTeam: string
  awayTeam: string
  commenceTime: string        // ISO string
  homeOdds: number            // American moneyline
  awayOdds: number
  spreadPoint: number         // home spread (negative = home favored)
  totalPoint: number
  homeNoVigProb: number       // Shin-devig home win probability
  awayNoVigProb: number
  mcResult?: MonteCarloResult
  rawGame: any                // full Odds API game object
}

export interface MonteCarloResult {
  homeWinProbability: number
  awayWinProbability: number
  predictedScore: { home: number; away: number }
  spreadProbabilities?: { homeCovers: number; awayCovers: number }
  totalProbabilities?: { over: number; under: number; averageTotal: number }
  iterations: number
}

// ── Signal Module ─────────────────────────────────────────────────────────────
// Produces a confidence delta and optional reasoning strings.
// Examples: TrueEdge, ClaudeEffect, InjuryImpact, WeatherImpact, RestAdvantage

export interface SignalOutput {
  /** Additive confidence delta in percentage points (e.g. +3.5 or -2.0) */
  confidenceDelta: number
  /** Which team the delta favors: 'home' | 'away' | 'neutral' */
  favors: 'home' | 'away' | 'neutral'
  /** Short human-readable reasons shown in pick analysis */
  reasoning: string[]
  /** Optional named sub-scores for transparency */
  scores?: Record<string, number>
}

export interface SignalModule {
  /** Unique identifier — used in pick output for traceability */
  readonly id: string
  /** Display name shown in analysis */
  readonly name: string
  /** Whether this module requires external API calls */
  readonly async: boolean
  /** Run the signal analysis. Must not throw — return neutral output on error. */
  analyze(ctx: GameContext): Promise<SignalOutput> | SignalOutput
}

// ── Confidence Module ─────────────────────────────────────────────────────────
// Computes the final confidence % from base probability + all signal outputs.
// Swap this to change how signals are combined (e.g. weighted average vs sum).

export interface ConfidenceInput {
  ctx: GameContext
  baseConfidence: number          // market-derived base (50 + probDiff * 80)
  signals: Record<string, SignalOutput>
  isHomePick: boolean
}

export interface ConfidenceModule {
  readonly id: string
  compute(input: ConfidenceInput): number   // returns 0–100
}

// ── Filter Module ─────────────────────────────────────────────────────────────
// Decides whether a pick passes (return true) or is dropped (return false).
// Chain multiple filters — all must pass.

export interface FilterContext {
  ctx: GameContext
  pick: string
  confidence: number
  odds: number
  isHomePick: boolean
  signals: Record<string, SignalOutput>
}

export interface FilterModule {
  readonly id: string
  readonly description: string
  passes(fc: FilterContext): boolean
}

// ── Data Source Module ────────────────────────────────────────────────────────
// Fetches raw game data for a sport. Primary source tried first; fallbacks next.

export interface RawGame {
  id: string
  sport: string
  homeTeam: string
  awayTeam: string
  commenceTime: string
  bookmakers: any[]
}

export interface DataSourceModule {
  readonly id: string
  readonly priority: number       // lower = tried first
  fetch(sport: string): Promise<RawGame[]>
}

// ── Ranking Module ────────────────────────────────────────────────────────────
// Sorts and caps the final pick list.

export interface RankedPick {
  pick: any                       // full pick object
  score: number
}

export interface RankingModule {
  readonly id: string
  rank(picks: any[]): any[]
}
