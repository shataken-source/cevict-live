export type CalmTarget =
  | 'dogs'
  | 'cats'
  | 'horses'
  | 'wildlife'
  | 'babies'
  | 'humans';

export type CalmMode = 'sleep' | 'anxiety' | 'storm' | 'travel' | 'focus';

export interface CalmRequest {
  target: CalmTarget;
  mode: CalmMode;
  durationMinutes: number;
  intensity?: 1 | 2 | 3;
}

export interface BinauralProfile {
  leftHz: number;
  rightHz: number;
  carrierHz: number;
}

export type CalmCastPlan = {
  meta: {
    target: CalmTarget;
    mode: CalmMode;
    durationMinutes: number;
    intensity: 1 | 2 | 3;
    generatedAt: string;
    brandName?: string;
  };
  audioPlan: {
    carrierHz: number;
    binauralBeatHz: number;
    leftHz: number;
    rightHz: number;
  };
  layers: string[];
  instructions: string[];
};
