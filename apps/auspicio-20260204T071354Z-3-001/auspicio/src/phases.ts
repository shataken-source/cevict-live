import type { BuildPhaseId } from './types';

export const BUILD_PHASE_ORDER: BuildPhaseId[] = [
  'planning',
  'scaffolding',
  'implementing',
  'validating',
  'packaging',
  'completed',
];

export function getPhaseProgress(phase: BuildPhaseId): number {
  const idx = BUILD_PHASE_ORDER.indexOf(phase);
  if (idx === -1) return 0;
  const perPhase = Math.floor(100 / BUILD_PHASE_ORDER.length);
  return (idx + 1) * perPhase;
}
