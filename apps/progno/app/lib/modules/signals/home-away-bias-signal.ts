/**
 * Signal: Home/Away Bias
 * Backtest-validated: home picks +67% ROI vs away -19% ROI (2024 full season).
 * Applies a configurable boost/penalty based on which team is being picked.
 */

import type { SignalModule, GameContext, SignalOutput } from '../types'

const HOME_BOOST   = Number(process.env.PROGNO_HOME_BIAS_BOOST   ?? 5)
const AWAY_PENALTY = Number(process.env.PROGNO_AWAY_BIAS_PENALTY ?? 5)

export class HomeAwayBiasSignal implements SignalModule {
  readonly id = 'home-away-bias'
  readonly name = 'Home/Away Bias (backtest-validated)'
  readonly async = false

  analyze(ctx: GameContext): SignalOutput {
    const isHomeFavored = ctx.homeNoVigProb > ctx.awayNoVigProb
    if (isHomeFavored) {
      return {
        confidenceDelta: HOME_BOOST,
        favors: 'home',
        reasoning: ['Home-team pick (+67% ROI backtest)'],
        scores: { boost: HOME_BOOST },
      }
    }
    return {
      confidenceDelta: -AWAY_PENALTY,
      favors: 'away',
      reasoning: ['Away-team pick (-19% ROI backtest — penalty applied)'],
      scores: { penalty: -AWAY_PENALTY },
    }
  }
}
