/**
 * Confidence Module: MC-Anchored
 * Extracted from the confidence formula in route.ts (v3).
 * Formula: market base → MC anchor → sum signal deltas → clamp
 *
 * Swap this file to change how all signals combine into a final %.
 */

import type { ConfidenceModule, ConfidenceInput } from '../types'

const EARLY_DECAY: Record<number, number> = {
  2: Number(process.env.PROGNO_EARLY_DECAY_2D    ?? 0.97),
  3: Number(process.env.PROGNO_EARLY_DECAY_3D    ?? 0.93),
  4: Number(process.env.PROGNO_EARLY_DECAY_4D    ?? 0.88),
  5: Number(process.env.PROGNO_EARLY_DECAY_5D    ?? 0.82),
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
  readonly id = 'mc-confidence-v3'

  compute({ ctx, baseConfidence, signals, isHomePick }: ConfidenceInput): number {
    let conf = baseConfidence
    if (ctx.mcResult) {
      const mcWin = isHomePick
        ? ctx.mcResult.homeWinProbability
        : ctx.mcResult.awayWinProbability
      conf = Math.max(conf, mcWin * 100 - 5)
    }
    for (const [, signal] of Object.entries(signals)) {
      const pickFavored =
        signal.favors === 'neutral' ||
        (isHomePick && signal.favors === 'home') ||
        (!isHomePick && signal.favors === 'away')
      conf += pickFavored ? signal.confidenceDelta : -signal.confidenceDelta
    }
    const decay = earlyDecay(ctx.commenceTime)
    if (decay < 1.0) conf = Math.round(conf * decay)
    if (ctx.mcResult) {
      const mcWin = isHomePick
        ? ctx.mcResult.homeWinProbability
        : ctx.mcResult.awayWinProbability
      conf = Math.min(conf, Math.round(mcWin * 100 + 15))
    }
    return Math.max(30, Math.min(95, Math.round(conf)))
  }
}
