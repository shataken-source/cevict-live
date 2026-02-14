import type { CalmCastPlan } from './types';

type RenderOptions = {
  sampleRate?: number;
  maxDurationSeconds?: number;
  amplitude?: number;
};

function clamp16(x: number) {
  if (x > 32767) return 32767;
  if (x < -32768) return -32768;
  return x;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function floatToPcm16(sample: number) {
  const s = Math.max(-1, Math.min(1, sample));
  return clamp16(Math.round(s < 0 ? s * 32768 : s * 32767));
}

export function renderWav(plan: CalmCastPlan, options: RenderOptions = {}): Uint8Array {
  const sampleRate = options.sampleRate ?? 44100;
  const maxDurationSeconds = options.maxDurationSeconds ?? 10 * 60;
  const amplitude = options.amplitude ?? 0.15;

  const durationSeconds = Math.floor(plan.meta.durationMinutes * 60);
  if (durationSeconds <= 0) {
    throw new Error('durationMinutes must be > 0');
  }
  if (durationSeconds > maxDurationSeconds) {
    throw new Error(`Requested duration too long (${durationSeconds}s). Max is ${maxDurationSeconds}s.`);
  }

  const length = sampleRate * durationSeconds;

  const numChannels = 2;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);

  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const leftFreq = plan.audioPlan.carrierHz + plan.audioPlan.leftHz;
  const rightFreq = plan.audioPlan.carrierHz + plan.audioPlan.rightHz;

  let offset = 44;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const left = Math.sin(2 * Math.PI * leftFreq * t) * amplitude;
    const right = Math.sin(2 * Math.PI * rightFreq * t) * amplitude;

    view.setInt16(offset, floatToPcm16(left), true);
    offset += 2;
    view.setInt16(offset, floatToPcm16(right), true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}
