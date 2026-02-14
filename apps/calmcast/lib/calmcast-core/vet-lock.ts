import type { CalmCastPlan } from './types';

export const VET_LOCKED = Object.freeze({
  maxVolumeDb: -18,
  maxCarrierHz: 550,
  maxBeatHz: 12,
});

export type VetClampResult = {
  plan: CalmCastPlan;
  clamped: boolean;
  changes: Record<string, { from: number; to: number }>;
};

export function clampPlanToVetLocked(plan: CalmCastPlan): VetClampResult {
  const changes: VetClampResult['changes'] = {};

  let carrierHz = plan.audioPlan.carrierHz;
  if (carrierHz > VET_LOCKED.maxCarrierHz) {
    changes.carrierHz = { from: carrierHz, to: VET_LOCKED.maxCarrierHz };
    carrierHz = VET_LOCKED.maxCarrierHz;
  }

  let leftHz = plan.audioPlan.leftHz;
  let rightHz = plan.audioPlan.rightHz;
  let beatHz = Math.abs(rightHz - leftHz);

  if (beatHz > VET_LOCKED.maxBeatHz) {
    const from = beatHz;
    if (rightHz >= leftHz) {
      rightHz = leftHz + VET_LOCKED.maxBeatHz;
    } else {
      leftHz = rightHz + VET_LOCKED.maxBeatHz;
    }
    beatHz = Math.abs(rightHz - leftHz);
    changes.binauralBeatHz = { from, to: beatHz };
    if (leftHz !== plan.audioPlan.leftHz) changes.leftHz = { from: plan.audioPlan.leftHz, to: leftHz };
    if (rightHz !== plan.audioPlan.rightHz) changes.rightHz = { from: plan.audioPlan.rightHz, to: rightHz };
  }

  const clamped = Object.keys(changes).length > 0;

  return {
    clamped,
    changes,
    plan: {
      ...plan,
      audioPlan: {
        ...plan.audioPlan,
        carrierHz,
        leftHz,
        rightHz,
        binauralBeatHz: beatHz,
      },
    },
  };
}

export function clampAmplitudeToVetLocked(amplitude: number): number {
  const maxAmp = Math.pow(10, VET_LOCKED.maxVolumeDb / 20);
  return Math.min(amplitude, maxAmp);
}
