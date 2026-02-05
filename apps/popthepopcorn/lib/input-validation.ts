/**
 * Input Validation with Zod
 * Validates API request inputs
 */

import { z } from 'zod'

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format')

/**
 * Headline ID validation
 */
export const headlineIdSchema = uuidSchema

/**
 * Drama score validation (1-10)
 */
export const dramaScoreSchema = z.number().int().min(1).max(10)

/**
 * Reaction type validation
 */
export const reactionTypeSchema = z.enum(['🔥', '🧢', '🧐', '🍿', '📈', '📉', '🎭'])

/**
 * Crowd vote request schema
 */
export const crowdVoteSchema = z.object({
  headlineId: headlineIdSchema,
  dramaScore: dramaScoreSchema,
})

/**
 * Reaction request schema
 */
export const reactionSchema = z.object({
  headlineId: headlineIdSchema,
  reactionType: reactionTypeSchema,
})

/**
 * Admin login schema
 */
export const adminLoginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

/**
 * Validate request body against schema
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; details?: z.ZodError } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return {
        success: false,
        error: firstError?.message || 'Validation failed',
        details: error,
      }
    }
    return {
      success: false,
      error: 'Invalid request format',
    }
  }
}
