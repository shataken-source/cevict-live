export type BuildPhaseId =
  | 'planning'
  | 'scaffolding'
  | 'implementing'
  | 'validating'
  | 'packaging'
  | 'completed';

export type BuildStatus = {
  currentPhase: BuildPhaseId;
  progressPercent: number;
  logs: string[];
};
