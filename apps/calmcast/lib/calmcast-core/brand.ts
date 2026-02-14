import type { CalmCastPlan } from './types';

export interface BrandConfig {
  name: string;
  colors: string[];
  smsSignature: string;
}

export function applyBrand(plan: CalmCastPlan, brand: BrandConfig): CalmCastPlan {
  return {
    ...plan,
    meta: {
      ...plan.meta,
      brandName: brand.name,
    },
  };
}
