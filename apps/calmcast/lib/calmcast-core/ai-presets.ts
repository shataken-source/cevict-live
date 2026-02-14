import type { BinauralProfile, CalmMode, CalmTarget } from './types';

export const BINAURAL_PRESETS: Record<CalmTarget, Record<CalmMode, BinauralProfile>> = {
  dogs: {
    sleep: { carrierHz: 432, leftHz: 2, rightHz: 6 },
    anxiety: { carrierHz: 432, leftHz: 4, rightHz: 10 },
    storm: { carrierHz: 528, leftHz: 3, rightHz: 10 },
    travel: { carrierHz: 396, leftHz: 4, rightHz: 8 },
    focus: { carrierHz: 528, leftHz: 6, rightHz: 14 },
  },
  cats: {
    sleep: { carrierHz: 396, leftHz: 3, rightHz: 7 },
    anxiety: { carrierHz: 396, leftHz: 5, rightHz: 9 },
    storm: { carrierHz: 432, leftHz: 2, rightHz: 6 },
    travel: { carrierHz: 417, leftHz: 4, rightHz: 8 },
    focus: { carrierHz: 528, leftHz: 7, rightHz: 11 },
  },
  horses: {
    sleep: { carrierHz: 432, leftHz: 4, rightHz: 8 },
    anxiety: { carrierHz: 432, leftHz: 6, rightHz: 10 },
    storm: { carrierHz: 528, leftHz: 2, rightHz: 6 },
    travel: { carrierHz: 396, leftHz: 5, rightHz: 9 },
    focus: { carrierHz: 528, leftHz: 8, rightHz: 12 },
  },
  wildlife: {
    sleep: { carrierHz: 174, leftHz: 3, rightHz: 7 },
    anxiety: { carrierHz: 432, leftHz: 5, rightHz: 9 },
    storm: { carrierHz: 396, leftHz: 2, rightHz: 5 },
    travel: { carrierHz: 417, leftHz: 4, rightHz: 8 },
    focus: { carrierHz: 528, leftHz: 7, rightHz: 11 },
  },
  babies: {
    sleep: { carrierHz: 174, leftHz: 2, rightHz: 6 },
    anxiety: { carrierHz: 285, leftHz: 4, rightHz: 8 },
    storm: { carrierHz: 174, leftHz: 1, rightHz: 4 },
    travel: { carrierHz: 396, leftHz: 3, rightHz: 6 },
    focus: { carrierHz: 417, leftHz: 6, rightHz: 10 },
  },
  humans: {
    sleep: { carrierHz: 174, leftHz: 2.5, rightHz: 5 },
    anxiety: { carrierHz: 396, leftHz: 6, rightHz: 12 },
    storm: { carrierHz: 528, leftHz: 3, rightHz: 10 },
    travel: { carrierHz: 417, leftHz: 5, rightHz: 9 },
    focus: { carrierHz: 528, leftHz: 8, rightHz: 20 },
  },
};
