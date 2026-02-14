import { z } from 'zod';

export const CalmTargetSchema = z.enum(['dogs', 'cats', 'horses', 'wildlife', 'babies', 'humans']);
export const CalmModeSchema = z.enum(['sleep', 'anxiety', 'storm', 'travel', 'focus']);
export const IntensitySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]).optional();
export const AudioFormatSchema = z.enum(['wav', 'mp3', 'aac', 'ogg']).optional();
export const AudioQualitySchema = z.enum(['low', 'medium', 'high']).optional();

export const CalmRequestSchema = z.object({
  target: CalmTargetSchema,
  mode: CalmModeSchema,
  durationMinutes: z.number().positive().max(240), // Max 4 hours
  intensity: IntensitySchema
});

export const RenderWavQuerySchema = z.object({
  target: CalmTargetSchema,
  mode: CalmModeSchema,
  durationMinutes: z.coerce.number().positive().max(240),
  intensity: z.coerce.number().int().min(1).max(3).optional(),
  vetLock: z.coerce.boolean().default(true),
  sampleRate: z.coerce.number().int().positive().optional(),
  maxDurationSeconds: z.coerce.number().int().positive().optional(),
  amplitude: z.coerce.number().positive().max(1).optional(),
  format: AudioFormatSchema,
  quality: AudioQualitySchema,
  stream: z.coerce.boolean().optional()
});

export const PresetQuerySchema = z.object({
  id: z.string().optional()
});

export type CalmRequest = z.infer<typeof CalmRequestSchema>;
export type RenderWavQuery = z.infer<typeof RenderWavQuerySchema>;
export type PresetQuery = z.infer<typeof PresetQuerySchema>;
