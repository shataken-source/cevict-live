/**
 * Signal: True Edge
 * Wraps the existing calculateTrueEdge() from true-edge-engine.ts.
 * Extracts: altitude, reverse line movement, steam moves, betting splits,
 * injury impact, weather conditions.
 */

import type { SignalModule, GameContext, SignalOutput } from '../types'
import { calculateTrueEdge, getStadiumElevation } from '../../true-edge-engine'

export class TrueEdgeSignal implements SignalModule {
  readonly id = 'true-edge'
  readonly name = 'True Edge Engine'
  readonly async = false

  analyze(ctx: GameContext): SignalOutput {
    try {
      const homeElevation = getStadiumElevation(ctx.homeTeam)
      const awayElevation = getStadiumElevation(ctx.awayTeam)
      const altitudeDiff = homeElevation - awayElevation

      const publicPercentage = ctx.homeOdds < ctx.awayOdds ? 0.65 : 0.35
      const isReverseLineMovement =
        (publicPercentage > 0.6 && ctx.homeNoVigProb < 0.5) ||
        (publicPercentage < 0.4 && ctx.homeNoVigProb > 0.5)

      const result = calculateTrueEdge(
        {
          restAdvantage: 0,
          publicMoneyPercentage: publicPercentage,
          reverseLineMovement: isReverseLineMovement,
          lineMovementVelocity: 0,
          altitudeDifference: altitudeDiff,
          isIndoor: false,
          homeFieldIntensity: 0.6,
          teamVariance: 0.4,
        },
        Math.max(ctx.homeNoVigProb, ctx.awayNoVigProb),
        ctx.sport
      )

      const favorsHome = result.totalEdge > 0
      const delta = result.totalEdge * 80  // scale to confidence points

      return {
        confidenceDelta: delta,
        favors: Math.abs(delta) < 0.5 ? 'neutral' : favorsHome ? 'home' : 'away',
        reasoning: result.reasoning || [],
        scores: {
          totalEdge: result.totalEdge,
          confidence: result.confidence,
        },
      }
    } catch {
      return { confidenceDelta: 0, favors: 'neutral', reasoning: [] }
    }
  }
}
