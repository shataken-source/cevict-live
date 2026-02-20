/**
 * Ranking Module: Composite Score
 * Sorts picks by composite score (edge 40% + EV 40% + confidence 20%).
 * Caps at 25 picks, max 3 per sport.
 */

import type { RankingModule } from '../types'

const MAX_PICKS      = 25
const MAX_PER_SPORT  = 3
const EV_CAP         = 80

export class CompositeRankingModule implements RankingModule {
  readonly id = 'composite-ranking'

  rank(picks: any[]): any[] {
    // Score each pick
    const scored = picks.map(p => {
      const edge = Math.min(Math.max(p.value_bet_edge ?? 0, 0), 30) / 30
      const ev   = Math.min(Math.max(p.expected_value ?? 0, 0), EV_CAP) / EV_CAP
      const conf = (p.confidence ?? 50) / 100
      let score  = edge * 40 + ev * 40 + conf * 20
      if ((p.value_bet_edge ?? 0) < 2 && !p.triple_align) score -= 8
      return { ...p, composite_score: Math.round(score * 10) / 10 }
    })

    // Sort descending
    scored.sort((a, b) => b.composite_score - a.composite_score)

    // Cap at MAX_PER_SPORT per sport, MAX_PICKS total
    const sportCounts: Record<string, number> = {}
    const result: any[] = []
    for (const pick of scored) {
      if (result.length >= MAX_PICKS) break
      const sport = (pick.sport || pick.league || 'unknown').toLowerCase()
      sportCounts[sport] = (sportCounts[sport] ?? 0)
      if (sportCounts[sport] >= MAX_PER_SPORT) continue
      sportCounts[sport]++
      result.push(pick)
    }
    return result
  }
}
