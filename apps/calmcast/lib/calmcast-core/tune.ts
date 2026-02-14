import type { CalmCastPlan } from './types';

export type StressTrend = 'improving' | 'steady' | 'worsening';

export function tunePlan(plan: CalmCastPlan, stressTrend: StressTrend): CalmCastPlan {
  if (stressTrend !== 'worsening') return plan;

  const leftHz = plan.audioPlan.leftHz - 0.25;
  const rightHz = plan.audioPlan.rightHz + 0.25;
  const binauralBeatHz = Math.abs(rightHz - leftHz);

  return {
    ...plan,
    audioPlan: {
      ...plan.audioPlan,
      leftHz,
      rightHz,
      binauralBeatHz,
    },
  };
}
