/**
 * Signal: Claude Effect (7-Dimensional)
 * Extracted from the inlined calculate7DimensionalClaudeEffect() in route.ts.
 * Dimensions: SF, NM, IAI, CSI, NIG, TRD, EPD
 */

import type { SignalModule, GameContext, SignalOutput } from '../types'

const WEIGHTS = {
  SF: 0.12, NM: 0.18, IAI: 0.20, CSI: 0.10,
  NIG: 0.12, TRD: 0.10, EPD: 0.18,
}

const SPREAD_TO_WIN_PCT: Record<string, number> = {
  nfl: 0.02, ncaaf: 0.018, nba: 0.015,
  ncaab: 0.016, nhl: 0.025, mlb: 0.02,
}

export class ClaudeEffectSignal implements SignalModule {
  readonly id = 'claude-effect'
  readonly name = '7D Claude Effect'
  readonly async = false

  analyze(ctx: GameContext): SignalOutput {
    try {
      const { homeNoVigProb: hp, awayNoVigProb: ap } = ctx

      // SF: odds-derived sentiment
      const SF = Math.max(-0.2, Math.min(0.2, (hp - 0.5) * 0.3))

      // NM: no real data — neutral
      const NM = 0

      // IAI: spread vs ML implied sharp signal
      const sportKey = ctx.sport.replace(/^basketball_|^americanfootball_|^icehockey_|^baseball_/, '')
      const pctPerPoint = SPREAD_TO_WIN_PCT[sportKey] ?? 0.02
      const spreadImplied = 0.5 - ctx.spreadPoint * pctPerPoint
      const IAI = Math.max(-0.1, Math.min(0.1, (spreadImplied - hp) * 2))

      // CSI: chaos from probability gap
      const probDiff = Math.abs(hp - ap)
      const CSI = probDiff < 0.05 ? 0.22 : probDiff < 0.10 ? 0.18 : probDiff < 0.15 ? 0.14
        : probDiff < 0.20 ? 0.10 : probDiff < 0.25 ? 0.07 : 0.04

      // NIG: no real news — neutral
      const NIG = 0

      // TRD: temporal decay based on hours until game
      const hoursUntil = (new Date(ctx.commenceTime).getTime() - Date.now()) / 3_600_000
      const TRD = hoursUntil < 12 ? 1.0 : hoursUntil < 24 ? 0.97 : hoursUntil < 48 ? 0.93 : 0.88

      // EPD: no real pressure data — neutral
      const EPD = 0

      const totalEffect = (
        WEIGHTS.SF * SF +
        WEIGHTS.NM * NM +
        WEIGHTS.IAI * IAI +
        WEIGHTS.CSI * -CSI +
        WEIGHTS.NIG * NIG +
        WEIGHTS.EPD * EPD
      ) * TRD

      const delta = totalEffect * 100  // scale to confidence points
      const reasoning: string[] = []
      if (Math.abs(SF) > 0.08) reasoning.push(`Sentiment ${SF > 0 ? 'favors home' : 'favors away'} (${(SF * 100).toFixed(0)}%)`)
      if (Math.abs(IAI) > 0.03) reasoning.push(`Sharp signal: ${IAI > 0 ? 'backing home' : 'backing away'}`)
      if (CSI > 0.12) reasoning.push(`⚠️ Upset risk: ${(CSI * 100).toFixed(0)}%`)

      return {
        confidenceDelta: delta,
        favors: Math.abs(delta) < 0.5 ? 'neutral' : totalEffect > 0 ? 'home' : 'away',
        reasoning,
        scores: { SF, NM, IAI, CSI, NIG, TRD, EPD, totalEffect },
      }
    } catch {
      return { confidenceDelta: 0, favors: 'neutral', reasoning: [] }
    }
  }
}
