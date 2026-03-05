/**
 * Ranking Module: Composite Score (v4 — 20260305)
 * Sorts picks by composite score (confidence 50% + EV 30% + edge 20%).
 * Caps output at TOP_N (default 15) with max MAX_PER_SPORT per sport (default 4).
 *
 * v3 had NO caps, causing 45+ picks to pass through. Fixed: quality over quantity.
 */

import type { RankingModule } from '../types'

const EV_CAP = 80
const TOP_N = Number(process.env.PROGNO_TOP_N ?? 15)
const MAX_PER_SPORT = Number(process.env.PROGNO_MAX_PER_SPORT ?? 4)

export class CompositeRankingModule implements RankingModule {
  readonly id = 'composite-ranking'

  rank(picks: any[]): any[] {
    const scored = picks.map(p => {
      const edgeRaw = p.value_bet_edge ?? 0
      const edge = Math.min(Math.max(edgeRaw, 0), 10) / 10
      const ev = Math.min(Math.max(p.expected_value ?? 0, 0), EV_CAP) / EV_CAP
      const conf = (p.confidence ?? 50) / 100
      let score = conf * 50 + ev * 30 + edge * 20
      if (edgeRaw > 10) score -= 3
      return { ...p, composite_score: Math.round(score * 10) / 10 }
    }).sort((a, b) => b.composite_score - a.composite_score)

    // Apply per-sport cap + total cap
    const sportCounts: Record<string, number> = {}
    const result: any[] = []
    for (const p of scored) {
      if (result.length >= TOP_N) break
      const sport = (p.sport || p.league || '').toUpperCase()
      const count = sportCounts[sport] || 0
      if (count >= MAX_PER_SPORT) continue
      sportCounts[sport] = count + 1
      result.push(p)
    }
    return result
  }
}
