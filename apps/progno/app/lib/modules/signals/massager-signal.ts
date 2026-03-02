/**
 * Signal: Progno Massager v3
 * ─────────────────────────────────────────────────────────────────────────────
 * Three targeted massager commands that fill GAPS in the existing signal stack:
 *
 *   CMD 1 — Spread-ML Disagreement: When moneyline and spread imply different
 *           winners, the market is uncertain. Penalize confidence (capped -2.5).
 *
 *   CMD 2 — Blowout Spread Confirmation: Large spread (>10 pts) + MC agrees
 *           favorite covers → boost. MC disagrees → slight caution.
 *
 *   CMD 3 — MC-Odds Convergence: MC and market within 3% → boost +1.5.
 *           Divergence > 12% → penalize (model disagrees with market).
 *
 * Enable/disable via env: MASSAGER_SIGNAL=1 (default 1)
 */

import type { SignalModule, GameContext, SignalOutput } from '../types'

// Tunable constants
const SPREAD_ML_DISAGREE_CAP = 2.5    // Max penalty for spread-ML disagreement
const MC_CONVERGENCE_BOOST = 1.5    // Bonus when MC and market agree
const MC_DIVERGENCE_PENALTY = -2.0   // Penalty when MC and market disagree >12%
const MC_DIVERGENCE_THRESHOLD = 0.12   // 12% probability divergence
const BLOWOUT_SPREAD_THRESH = 10     // Spread above which game is a "blowout" line
const BLOWOUT_MC_AGREE_BOOST = 2.0    // Bonus when MC confirms blowout spread

export class MassagerSignal implements SignalModule {
  readonly id = 'massager'
  readonly name = 'Progno Massager v2'
  readonly async = false

  analyze(ctx: GameContext): SignalOutput {
    const enabled = (process.env.MASSAGER_SIGNAL ?? '1') === '1'
    if (!enabled) {
      return { confidenceDelta: 0, favors: 'neutral', reasoning: [], scores: {} }
    }

    let delta = 0
    const reasoning: string[] = []
    const scores: Record<string, number> = {}

    // ── CMD 1: Spread-ML Disagreement ────────────────────────────────────
    // ML says home wins (homeNoVigProb > 0.5) but spread says away covers?
    const mlFavorsHome = ctx.homeNoVigProb > 0.52
    const spreadFavorsHome = ctx.spreadPoint < -0.5  // negative spread = home favored
    const spreadFavorsAway = ctx.spreadPoint > 0.5

    if ((mlFavorsHome && spreadFavorsAway) || (!mlFavorsHome && spreadFavorsHome)) {
      // Disagreement between ML and spread
      const disagreeStrength = Math.abs(ctx.homeNoVigProb - 0.5) * 100
      const penalty = -Math.min(SPREAD_ML_DISAGREE_CAP, disagreeStrength * 0.10)
      delta += penalty
      scores.spreadMLDisagree = penalty
      reasoning.push(`Spread-ML disagree: ML ${mlFavorsHome ? 'home' : 'away'}, spread ${spreadFavorsHome ? 'home' : 'away'} → ${penalty.toFixed(1)}`)
    } else {
      scores.spreadMLDisagree = 0
    }

    // ── CMD 2: Blowout Spread Confirmation ──────────────────────────────
    // When the spread is large (>10 pts) AND MC agrees the favorite covers,
    // boost confidence — these are the highest-confidence plays.
    const absSpread = Math.abs(ctx.spreadPoint)
    const spreadFavIsHome = ctx.spreadPoint < 0

    if (absSpread >= BLOWOUT_SPREAD_THRESH && ctx.mcResult) {
      const mcHomeCovers = ctx.mcResult.spreadProbabilities?.homeCovers ?? 0
      const mcAwayCovers = ctx.mcResult.spreadProbabilities?.awayCovers ?? 0
      const mcFavCovers = spreadFavIsHome ? mcHomeCovers : mcAwayCovers

      if (mcFavCovers > 0.55) {
        delta += BLOWOUT_MC_AGREE_BOOST
        scores.blowoutConfirm = BLOWOUT_MC_AGREE_BOOST
        reasoning.push(`Blowout confirmed: ${absSpread.toFixed(0)}pt spread, MC ${(mcFavCovers * 100).toFixed(0)}% covers → +${BLOWOUT_MC_AGREE_BOOST}`)
      } else {
        // MC says favorite won't cover the big spread — slight caution
        scores.blowoutConfirm = -1
        delta -= 1
        reasoning.push(`Blowout doubt: ${absSpread.toFixed(0)}pt spread but MC only ${(mcFavCovers * 100).toFixed(0)}% covers → -1`)
      }
    } else {
      scores.blowoutConfirm = 0
    }

    // ── CMD 4: MC-Odds Convergence/Divergence ────────────────────────────
    if (ctx.mcResult) {
      const mcHomeProb = ctx.mcResult.homeWinProbability
      const marketHomeProb = ctx.homeNoVigProb
      const divergence = Math.abs(mcHomeProb - marketHomeProb)

      scores.mcDivergence = divergence * 100

      if (divergence < 0.03) {
        // MC and market are very close → line is well-calibrated → boost
        delta += MC_CONVERGENCE_BOOST
        scores.mcConvergence = MC_CONVERGENCE_BOOST
        reasoning.push(`MC-market converge: ${(divergence * 100).toFixed(1)}% gap → +${MC_CONVERGENCE_BOOST}`)
      } else if (divergence > MC_DIVERGENCE_THRESHOLD) {
        // MC strongly disagrees with market → uncertainty → penalize
        const scaledPenalty = MC_DIVERGENCE_PENALTY * Math.min(1.2, divergence / MC_DIVERGENCE_THRESHOLD)
        delta += scaledPenalty
        scores.mcConvergence = scaledPenalty
        reasoning.push(`MC-market diverge: ${(divergence * 100).toFixed(1)}% gap → ${scaledPenalty.toFixed(1)}`)
      } else {
        scores.mcConvergence = 0
      }
    }

    // Determine favored side based on net delta direction
    const favors: 'home' | 'away' | 'neutral' =
      delta > 1 ? 'home' : delta < -1 ? 'away' : 'neutral'

    return {
      confidenceDelta: Math.round(delta * 10) / 10,
      favors,
      reasoning,
      scores,
    }
  }
}
