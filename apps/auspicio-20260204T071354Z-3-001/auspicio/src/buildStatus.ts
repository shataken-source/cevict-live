import type { BuildStatus, BuildPhaseId } from './types';
import { getPhaseProgress } from './phases';

export function updateBuildPhase(
  status: BuildStatus,
  newPhase: BuildPhaseId,
  logMessage?: string,
): BuildStatus {
  const progressPercent = getPhaseProgress(newPhase);

  return {
    ...status,
    currentPhase: newPhase,
    progressPercent,
    logs: logMessage
      ? [...status.logs, '[PHASE] ' + logMessage]
      : status.logs,
  };
}
