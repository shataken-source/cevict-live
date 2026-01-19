/**
 * API Input Validation Schemas
 * Using Zod for type-safe validation
 */

import { z } from 'zod';
import Decimal from 'decimal.js';

// Configure Decimal.js for financial calculations
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const SimulationRequestSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required'),
  iterations: z.number()
    .int('Iterations must be an integer')
    .min(10, 'Minimum 10 iterations required')
    .max(100000, 'Maximum 100,000 iterations allowed')
    .default(10000),
  customParams: z.object({
    homeTeam: z.string().optional(),
    awayTeam: z.string().optional(),
    league: z.string().optional(),
    sport: z.string().optional(),
    odds: z.object({
      home: z.number().optional(),
      away: z.number().optional(),
      spread: z.number().optional(),
      total: z.number().optional(),
    }).optional(),
  }).optional(),
});

export const PredictionRequestSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required'),
  includeClaudeEffect: z.boolean().default(true),
  bankroll: z.number()
    .nonnegative('Bankroll must be non-negative')
    .max(10000000, 'Bankroll exceeds maximum')
    .default(0),
});

export const ParlayRequestSchema = z.object({
  legs: z.array(z.object({
    gameId: z.string().min(1),
    type: z.enum(['spread', 'moneyline', 'total']),
    side: z.enum(['home', 'away', 'over', 'under']),
    line: z.number().optional(),
    odds: z.number(),
    probability: z.number().min(0).max(1).optional(),
  })).min(2, 'At least 2 legs required').max(5, 'Maximum 5 legs allowed'),
  stake: z.number()
    .positive('Stake must be positive')
    .max(100000, 'Stake exceeds maximum')
    .default(100),
});

export const TeaserRequestSchema = z.object({
  legs: z.array(z.object({
    gameId: z.string().min(1),
    originalLine: z.number(),
    side: z.enum(['home', 'away']),
  })).min(2, 'At least 2 legs required').max(4, 'Maximum 4 legs allowed for teaser'),
  points: z.number()
    .int('Points must be an integer')
    .min(4, 'Minimum 4 points')
    .max(14, 'Maximum 14 points')
    .default(6),
  stake: z.number()
    .positive('Stake must be positive')
    .max(100000, 'Stake exceeds maximum')
    .default(100),
});

export const BankrollRequestSchema = z.object({
  bankroll: z.number()
    .positive('Bankroll must be positive')
    .max(10000000, 'Bankroll exceeds maximum'),
  riskTolerance: z.enum(['low', 'moderate', 'high', 'aggressive']).default('moderate'),
  maxBetSize: z.number()
    .min(0.01, 'Minimum 1% of bankroll')
    .max(0.25, 'Maximum 25% of bankroll')
    .default(0.05),
  predictions: z.array(z.any()).optional(),
});

export const ArbitrageRequestSchema = z.object({
  sport: z.enum(['nfl', 'nba', 'mlb', 'nhl', 'cfb', 'cbb', 'soccer', 'mma', 'tennis']).optional(),
  minProfit: z.number()
    .min(0.1, 'Minimum 0.1% profit required')
    .max(10, 'Maximum 10% profit')
    .default(0.5),
  maxAge: z.number()
    .int('Max age must be an integer')
    .min(1, 'Minimum 1 second')
    .max(300, 'Maximum 5 minutes')
    .default(30),
});

export const BetTrackingSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required'),
  betType: z.enum(['spread', 'moneyline', 'total', 'prop', 'parlay', 'teaser']),
  side: z.enum(['home', 'away', 'over', 'under']),
  line: z.number().optional(),
  odds: z.number(),
  stake: z.number()
    .positive('Stake must be positive')
    .max(100000, 'Stake exceeds maximum'),
  sportsbook: z.string().min(1, 'Sportsbook name is required'),
});

/**
 * Validate and sanitize financial amounts using Decimal.js
 */
export function sanitizeAmount(amount: number): Decimal {
  if (isNaN(amount) || !isFinite(amount)) {
    throw new Error('Invalid amount: must be a finite number');
  }
  return new Decimal(amount);
}

/**
 * Validate probability (0-1 range)
 */
export function validateProbability(prob: number): number {
  if (isNaN(prob) || !isFinite(prob)) {
    throw new Error('Invalid probability: must be a finite number');
  }
  return Math.max(0, Math.min(1, prob));
}

/**
 * Validate odds (American format)
 */
export function validateOdds(odds: number): number {
  if (isNaN(odds) || !isFinite(odds)) {
    throw new Error('Invalid odds: must be a finite number');
  }
  // American odds typically range from -10000 to +10000
  if (odds < -10000 || odds > 10000) {
    throw new Error('Odds out of valid range (-10000 to +10000)');
  }
  return odds;
}

