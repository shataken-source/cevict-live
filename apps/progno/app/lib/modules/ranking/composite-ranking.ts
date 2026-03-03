/**
 * Ranking Module: Composite Score (v3 — 20260303)
 * Sorts picks by composite score (confidence 50% + EV 30% + edge 20%).
 * Sort-only — no sport caps, no total caps. Filters handle quality control.
 *
 * Audit finding: filters already produce high-quality picks (+24% ROI, 65% WR).
 * Any ranking cuts destroy value because the composite score can't reliably
 * distinguish winners from losers within the already-filtered set.
 */

import type { RankingModule } from '../types'

const EV_CAP = 80

export class CompositeRankingModule implements RankingModule {
  readonly id = 'composite-ranking'

  rank(picks: any[]): any[] {
    return picks.map(p => {
      const edgeRaw = p.value_bet_edge ?? 0
      const edge = Math.min(Math.max(edgeRaw, 0), 10) / 10
      const ev = Math.min(Math.max(p.expected_value ?? 0, 0), EV_CAP) / EV_CAP
      const conf = (p.confidence ?? 50) / 100
      let score = conf * 50 + ev * 30 + edge * 20
      if (edgeRaw > 10) score -= 3
      return { ...p, composite_score: Math.round(score * 10) / 10 }
    }).sort((a, b) => b.composite_score - a.composite_score)
  }
}
