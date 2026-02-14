import { CalmCastPresetMapSchema, type CalmCastPresetMap } from './schema';

const PRESETS: CalmCastPresetMap = {
  DEEP_SLEEP_DELTA: {
    id: 'DEEP_SLEEP_DELTA',
    label: 'Deep Sleep Delta',
    tags: ['sleep', 'delta', 'deep', 'restoration', 'human'],
    target: 'HUMAN',
    carrierHz: 174,
    beatHz: 2.5,
    volumeDb: -25,
    fadeInMs: 1800,
    fadeOutMs: 2000,
    recommendedMinutes: 90,
    notes: 'Delta waves (1-4 Hz) for deepest sleep stages. Use 174 Hz carrier for physical restoration and pain relief.'
  },
  FOCUS_GAMMA: {
    id: 'FOCUS_GAMMA',
    label: 'Focus Gamma',
    tags: ['focus', 'gamma', 'concentration', 'memory', 'work', 'human'],
    target: 'HUMAN',
    carrierHz: 528,
    beatHz: 40,
    volumeDb: -20,
    fadeInMs: 300,
    fadeOutMs: 500,
    recommendedMinutes: 45,
    notes: 'Gamma waves (30-50 Hz) improve memory, cognition, and problem-solving. 528 Hz carrier supports mental clarity.'
  },
  ANXIETY_RELIEF_ALPHA: {
    id: 'ANXIETY_RELIEF_ALPHA',
    label: 'Anxiety Relief Alpha',
    tags: ['anxiety', 'alpha', 'relaxation', 'stress', 'human'],
    target: 'HUMAN',
    carrierHz: 396,
    beatHz: 10,
    volumeDb: -22,
    fadeInMs: 1200,
    fadeOutMs: 1500,
    recommendedMinutes: 30,
    notes: 'Alpha waves (8-13 Hz) promote relaxation and creativity. 396 Hz carrier helps release fear and anxiety.'
  },
  DOG_CALMING_432: {
    id: 'DOG_CALMING_432',
    label: 'Dog Calming 432Hz',
    tags: ['dog', 'pet', 'anxiety', '432hz', 'calm', 'canine'],
    target: 'PET',
    carrierHz: 432,
    beatHz: 6,
    volumeDb: -18,
    fadeInMs: 2000,
    fadeOutMs: 2500,
    recommendedMinutes: 60,
    notes: '432 Hz is the "frequency of nature" - especially effective for dogs. Use during storms, separation, or vet visits.'
  },
  CAT_SOOTHING_396: {
    id: 'CAT_SOOTHING_396',
    label: 'Cat Soothing 396Hz',
    tags: ['cat', 'pet', 'feline', 'stress', '396hz', 'calm'],
    target: 'PET',
    carrierHz: 396,
    beatHz: 8,
    volumeDb: -20,
    fadeInMs: 2500,
    fadeOutMs: 3000,
    recommendedMinutes: 45,
    notes: '396 Hz helps release fear and emotional stress in cats. Use for multi-cat households, vet visits, or environmental changes.'
  },
  BABY_SOOTHING_174: {
    id: 'BABY_SOOTHING_174',
    label: 'Baby Soothing 174Hz',
    tags: ['baby', 'infant', 'soothing', '174hz', 'sleep', 'calm'],
    target: 'HUMAN',
    carrierHz: 174,
    beatHz: 4,
    volumeDb: -30,
    fadeInMs: 3000,
    fadeOutMs: 4000,
    recommendedMinutes: 30,
    notes: 'Ultra-gentle 174 Hz frequency with theta waves for infant soothing. Use during fussy periods or bedtime routine.'
  },
  MEDITATION_THETA: {
    id: 'MEDITATION_THETA',
    label: 'Meditation Theta',
    tags: ['meditation', 'theta', 'mindfulness', 'spiritual', 'human'],
    target: 'HUMAN',
    carrierHz: 417,
    beatHz: 6,
    volumeDb: -23,
    fadeInMs: 1500,
    fadeOutMs: 2000,
    recommendedMinutes: 60,
    notes: 'Theta waves (4-8 Hz) induce deep meditation and creativity. 417 Hz carrier facilitates positive change.'
  },
  PAIN_RELIEF_285: {
    id: 'PAIN_RELIEF_285',
    label: 'Pain Relief 285Hz',
    tags: ['pain', 'healing', '285hz', 'recovery', 'human'],
    target: 'HUMAN',
    carrierHz: 285,
    beatHz: 3,
    volumeDb: -24,
    fadeInMs: 2000,
    fadeOutMs: 2500,
    recommendedMinutes: 45,
    notes: '285 Hz supports cellular repair and energy restoration. Low delta waves promote physical healing and pain management.'
  },
  CREATIVITY_ALPHA: {
    id: 'CREATIVITY_ALPHA',
    label: 'Creativity Alpha',
    tags: ['creativity', 'alpha', 'flow', 'artistic', 'human'],
    target: 'HUMAN',
    carrierHz: 639,
    beatHz: 12,
    volumeDb: -21,
    fadeInMs: 800,
    fadeOutMs: 1200,
    recommendedMinutes: 40,
    notes: 'Alpha waves enhance creativity and divergent thinking. 639 Hz carrier promotes emotional balance for artistic expression.'
  },
  STORM_ANXIETY_528: {
    id: 'STORM_ANXIETY_528',
    label: 'Storm Anxiety 528Hz',
    tags: ['storm', 'anxiety', 'emergency', '528hz', 'thunder', 'both'],
    target: 'BOTH',
    carrierHz: 528,
    beatHz: 7,
    volumeDb: -20,
    fadeInMs: 500,
    fadeOutMs: 1000,
    recommendedMinutes: 60,
    notes: 'Emergency calming for storms, fireworks, or high anxiety. 528 Hz reduces stress while theta waves provide deep calming.'
  }
};

CalmCastPresetMapSchema.parse(PRESETS);

export function listPresets() {
  return Object.values(PRESETS);
}

export function getPreset(id: string) {
  return PRESETS[id as keyof typeof PRESETS] || null;
}

export function getPresetOrThrow(id: string) {
  const preset = getPreset(id);
  if (!preset) throw new Error(`Unknown CalmCast preset: ${id}`);
  return preset;
}

export function computeBinauralFrequencies(presetIdOrPreset: string | { carrierHz: number; beatHz: number }) {
  const preset = typeof presetIdOrPreset === 'string' ? getPresetOrThrow(presetIdOrPreset) : presetIdOrPreset;
  return {
    leftHz: preset.carrierHz,
    rightHz: preset.carrierHz + preset.beatHz,
    beatHz: preset.beatHz
  };
}

export const CalmCastPresets = PRESETS;
