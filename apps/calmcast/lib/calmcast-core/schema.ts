import { z } from 'zod';

export const CalmCastTargetSchema = z.enum(['HUMAN', 'PET', 'BOTH']);
export type CalmCastTarget = z.infer<typeof CalmCastTargetSchema>;

export const CalmCastPresetSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  tags: z.array(z.string()).default([]),
  target: CalmCastTargetSchema,
  carrierHz: z.number().positive(),
  beatHz: z.number().positive(),
  volumeDb: z.number().max(0),
  fadeInMs: z.number().int().nonnegative(),
  fadeOutMs: z.number().int().nonnegative(),
  recommendedMinutes: z.number().int().positive().optional(),
  notes: z.string().optional()
});

export type CalmCastPreset = z.infer<typeof CalmCastPresetSchema>;

export const CalmCastPresetMapSchema = z.record(CalmCastPresetSchema);
export type CalmCastPresetMap = z.infer<typeof CalmCastPresetMapSchema>;
