/**
 * Confidence Module: MC-Anchored
 * Extracted from the confidence formula in route.ts (v3).
 * Formula: market base → MC anchor → sum signal deltas → clamp
 *
 * Swap this file to change how all signals combine into a final %.
 */

import type { ConfidenceModule, ConfidenceInput } from '../types'

const EARLY_DECAY: Record<number, number> = {
  2: Number(process.env.PROGNO_EARLY_DECAY_2D ?? 0.97),
  3: Number(process.env.PROGNO_EARLY_DECAY_3D ?? 0.93),
  4: Number(process.env.PROGNO_EARLY_DECAY_4D ?? 0.88),
  5: Number(process.env.PROGNO_EARLY_DECAY_5D ?? 0.82),
}
const DECAY_5DPLUS = Number(process.env.PROGNO_EARLY_DECAY_5DPLUS ?? 0.75)

function earlyDecay(commenceTime: string): number {
  const days = (new Date(commenceTime).getTime() - Date.now()) / 86_400_000
  if (days <= 1) return 1.0
  if (days <= 2) return EARLY_DECAY[2]
  if (days <= 3) return EARLY_DECAY[3]
  if (days <= 4) return EARLY_DECAY[4]
  if (days <= 5) return EARLY_DECAY[5]
  return DECAY_5DPLUS
}

export class MCConfidenceModule implements ConfidenceModule {
  readonly id = 'mc-confidence-v4'

  compute({ ctx, baseConfidence, signals, isHomePick }: ConfidenceInput): number {
    // 1. Start from market-derived base
    let conf = baseConfidence

    // 2. Anchor to MC win probability (offset -12)
    if (ctx.mcResult) {
      const mcWin = isHomePick
        ? ctx.mcResult.homeWinProbability
        : ctx.mcResult.awayWinProbability
      conf = Math.max(conf, mcWin * 100 - 12)
    }

    // 3. Sum all signal deltas — dampened to 70%
    for (const [, signal] of Object.entries(signals)) {
      const pickFavored =
        signal.favors === 'neutral' ||
        (isHomePick && signal.favors === 'home') ||
        (!isHomePick && signal.favors === 'away')
      const dampened = signal.confidenceDelta * 0.7
      conf += pickFavored ? dampened : -dampened
    }

    // 4. Early-line decay
    const decay = earlyDecay(ctx.commenceTime)
    if (decay < 1.0) conf = Math.round(conf * decay)

    // 5. MC ceiling: MC prob + 10%
    if (ctx.mcResult) {
      const mcWin = isHomePick
        ? ctx.mcResult.homeWinProbability
        : ctx.mcResult.awayWinProbability
      conf = Math.min(conf, Math.round(mcWin * 100 + 10))
    }

    conf = Math.round(conf)
    // 6. High-confidence compression (v4h — 20260303 iter10):
    //    Bucket analysis: 65-70% is well-calibrated (75% WR vs 68.2% conf = +6.8pp).
    //    70-75% is catastrophically overconfident (53.6% WR vs 70.7% conf = -17pp).
    //    Solution: compress at 67 with factor 0.1, cap 69 to keep everything in the good bucket.
    if (conf > 67) conf = 67 + (conf - 67) * 0.1
    // 7. Hard clamp 30–69
    return Math.max(30, Math.min(69, Math.round(conf)))
  }
}
