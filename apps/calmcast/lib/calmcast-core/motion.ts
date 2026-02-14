export function movementScore(prevFrame: Uint8Array, nextFrame: Uint8Array): number {
  const len = Math.min(prevFrame.length, nextFrame.length);
  if (len === 0) return 0;
  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += Math.abs((nextFrame[i] || 0) - (prevFrame[i] || 0));
  }
  return sum / len;
}
