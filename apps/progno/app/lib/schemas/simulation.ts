/**
 * Simulation Engine Input Validation Schema
 * Prevents DoS attacks and mathematically impossible results
 */

import { z } from 'zod';

export const SimulationInputSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required'), // More flexible than UUID
  iterations: z.number()
    .int('Iterations must be an integer')
    .min(100, 'Minimum 100 iterations required to prevent division by zero')
    .max(100000, 'Maximum 100,000 iterations allowed to prevent DoS'),
  winProbability: z.number()
    .min(0, 'Win probability must be between 0 and 1')
    .max(1, 'Win probability must be between 0 and 1')
    .optional(), // Optional for queue jobs
  odds: z.number()
    .gt(1.0, 'Decimal odds must be greater than 1.0')
    .optional(), // Optional for queue jobs
  stake: z.number()
    .positive('Stake must be positive')
    .optional(), // Optional for queue jobs
  modelConfig: z.object({
    volatility: z.number()
      .min(0, 'Volatility must be between 0 and 1')
      .max(1, 'Volatility must be between 0 and 1')
      .optional(),
    useHistoricalWeighting: z.boolean()
      .default(true),
  }).optional(),
  seed: z.number()
    .int()
    .positive()
    .optional(), // Optional seed for reproducibility
  customParams: z.any().optional(), // Allow custom game parameters
});

export type SimulationInput = z.infer<typeof SimulationInputSchema>;

/**
 * Validate simulation input and prevent infinite loops
 */
export function validateSimulationInput(input: unknown): SimulationInput {
  const validated = SimulationInputSchema.parse(input);

  // Additional safety checks
  if (validated.iterations > 50000 && !validated.seed) {
    throw new Error('Seeds are required for simulations with >50,000 iterations to ensure reproducibility');
  }

  // Prevent division by zero scenarios (only if winProbability is provided)
  if (validated.winProbability !== undefined) {
    if (validated.winProbability === 0 || validated.winProbability === 1) {
      throw new Error('Win probability cannot be exactly 0 or 1 (use 0.001 or 0.999 instead)');
    }
  }

  return validated;
}

