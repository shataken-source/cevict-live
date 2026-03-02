/**
 * Signal: Injury Impact
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads injury data from the Supabase `injuries` table (populated by
 * injury-sync.ts via API-Sports) and adjusts confidence based on each
 * team's injury burden.
 *
 * Logic:
 *   - Fetch injury impact scores for both home and away teams.
 *   - If the picked team has significantly MORE injuries than the opponent,
 *     penalize confidence (they're weakened).
 *   - If the opponent has significantly MORE injuries, boost confidence
 *     (we're picking against a weakened team).
 *   - Cluster injuries (3+ at same position group) trigger extra penalty.
 *   - Starter injuries weighted heavier than bench players.
 *
 * Data source: `injuries` table via calculateInjuryImpact() from
 *              lib/api-sports/services/injury-sync.ts
 *
 * Enable/disable via env: INJURY_SIGNAL=1 (default 1)
 */

import type { SignalModule, GameContext, SignalOutput } from '../types'

// Sport key mapping: GameContext.sport → injury table sport key
const SPORT_MAP: Record<string, string> = {
  'basketball_nba': 'nba',
  'icehockey_nhl': 'nhl',
  'americanfootball_nfl': 'nfl',
  'americanfootball_ncaaf': 'ncaaf',
  'basketball_ncaab': 'ncaab',
  'baseball_mlb': 'mlb',
}

// Confidence delta scaling
const MAX_BOOST = 4.0       // Max confidence boost when opponent is badly injured
const MAX_PENALTY = -4.0    // Max confidence penalty when our pick is badly injured
const IMPACT_THRESHOLD = 0.15  // Min impact difference to trigger a delta

let _getImpactFn: ((sport: string, team: string) => Promise<number>) | null = null

async function getImpactFn(): Promise<(sport: string, team: string) => Promise<number>> {
  if (_getImpactFn) return _getImpactFn
  try {
    const mod = await import('../../../../lib/api-sports/services/injury-sync')
    _getImpactFn = mod.calculateInjuryImpact
    return _getImpactFn
  } catch {
    // If import fails (missing deps, etc.), return a no-op
    _getImpactFn = async () => 0
    return _getImpactFn
  }
}

export class InjurySignal implements SignalModule {
  readonly id = 'injury'
  readonly name = 'Injury Impact'
  readonly async = true

  async analyze(ctx: GameContext): Promise<SignalOutput> {
    const enabled = (process.env.INJURY_SIGNAL ?? '1') === '1'
    if (!enabled) {
      return { confidenceDelta: 0, favors: 'neutral', reasoning: [], scores: {} }
    }

    const sportKey = SPORT_MAP[ctx.sport]
    if (!sportKey) {
      return { confidenceDelta: 0, favors: 'neutral', reasoning: [], scores: {} }
    }

    try {
      const calcImpact = await getImpactFn()

      const [homeImpact, awayImpact] = await Promise.all([
        calcImpact(sportKey, ctx.homeTeam),
        calcImpact(sportKey, ctx.awayTeam),
      ])

      const scores: Record<string, number> = {
        homeInjuryImpact: homeImpact,
        awayInjuryImpact: awayImpact,
      }

      // No meaningful injury data
      if (homeImpact === 0 && awayImpact === 0) {
        return { confidenceDelta: 0, favors: 'neutral', reasoning: [], scores }
      }

      const diff = awayImpact - homeImpact // positive = away more injured = good for home
      scores.impactDiff = diff

      if (Math.abs(diff) < IMPACT_THRESHOLD) {
        return {
          confidenceDelta: 0,
          favors: 'neutral',
          reasoning: [`Injuries balanced: home ${(homeImpact * 100).toFixed(0)}%, away ${(awayImpact * 100).toFixed(0)}%`],
          scores,
        }
      }

      // Scale delta proportionally to the injury gap
      // diff > 0 means away team more injured → home advantage
      // diff < 0 means home team more injured → away advantage
      const rawDelta = diff > 0
        ? Math.min(MAX_BOOST, diff * MAX_BOOST / 0.5)
        : Math.max(MAX_PENALTY, diff * Math.abs(MAX_PENALTY) / 0.5)

      const delta = Math.round(rawDelta * 10) / 10

      const favors: 'home' | 'away' | 'neutral' =
        delta > 0.5 ? 'home' : delta < -0.5 ? 'away' : 'neutral'

      const moreInjured = diff > 0 ? ctx.awayTeam : ctx.homeTeam
      const reasoning = [
        `${moreInjured} injury burden ${(Math.max(homeImpact, awayImpact) * 100).toFixed(0)}% → ${delta > 0 ? '+' : ''}${delta.toFixed(1)} conf`
      ]

      return { confidenceDelta: delta, favors, reasoning, scores }

    } catch (err: any) {
      console.error(`[injury-signal] Error: ${err.message}`)
      return { confidenceDelta: 0, favors: 'neutral', reasoning: [], scores: {} }
    }
  }
}
