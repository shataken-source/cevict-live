import type { CalmCastPlan, CalmRequest } from './types';
import { BINAURAL_PRESETS } from './ai-presets';

export function generateCalmCast(req: CalmRequest): CalmCastPlan {
  const profile = BINAURAL_PRESETS[req.target][req.mode];
  const intensity = req.intensity ?? 2;

  return {
    meta: {
      target: req.target,
      mode: req.mode,
      durationMinutes: req.durationMinutes,
      intensity,
      generatedAt: new Date().toISOString(),
    },
    audioPlan: {
      carrierHz: profile.carrierHz,
      binauralBeatHz: Math.abs(profile.rightHz - profile.leftHz),
      leftHz: profile.leftHz * intensity,
      rightHz: profile.rightHz * intensity,
    },
    layers: [
      'pink-noise-low',
      'sub-ocean-swell',
      req.mode === 'storm' ? 'rain-muffle' : 'breath-pad',
      'harmonic-drones',
    ],
    instructions: [
      'Fade in over 60s',
      'Maintain constant phase offset',
      'Low-pass at 2.5kHz',
      'No sharp transients',
      'Loop-safe ending',
    ],
  };
}
