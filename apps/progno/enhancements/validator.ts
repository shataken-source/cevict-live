import { z } from 'zod';

export const SportsInputSchema = z.object({
  league: z.string().min(2).max(10),
  homeTeam: z.string().min(2).max(50),
  awayTeam: z.string().min(2).max(50),
  line: z.number().min(-100).max(100),
  bankroll: z.number().min(0).max(1000000),
  riskProfile: z.enum(['conservative', 'moderate', 'aggressive']),
  gameDate: z.string().optional(),
  additionalContext: z.string().max(1000).optional(),
});

export function validateInput<T>(type: string, input: T): T {
  try {
    if (type === 'sports') {
      SportsInputSchema.parse(input);
    }
    return input;
  } catch (error) {
    throw new Error('Validation failed');
  }
}
