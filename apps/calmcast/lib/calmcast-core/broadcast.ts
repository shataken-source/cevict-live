export function broadcastTargets(sessionId: string, zones: string[]) {
  return zones.map((zone) => ({ zone, uri: `calmcast://${sessionId}` }));
}
