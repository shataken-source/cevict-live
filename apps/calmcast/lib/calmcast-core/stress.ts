export type StressLevel = 'low' | 'medium' | 'high';

export function detectStress(samples: Float32Array): StressLevel {
  let energy = 0;
  for (let i = 0; i < samples.length; i++) {
    energy += Math.abs(samples[i] || 0);
  }
  const avg = samples.length > 0 ? energy / samples.length : 0;
  if (avg > 0.18) return 'high';
  if (avg > 0.1) return 'medium';
  return 'low';
}
