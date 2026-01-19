/**
 * Input Validation for Claude Effect
 * Security and data validation
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate Claude Effect input data
 */
export function validateClaudeEffectInput(data: any): ValidationResult {
  const errors: string[] = [];

  // Validate base probability
  if (typeof data.baseProbability !== 'number' ||
      data.baseProbability < 0 ||
      data.baseProbability > 1) {
    errors.push('baseProbability must be a number between 0 and 1');
  }

  // Validate base confidence
  if (typeof data.baseConfidence !== 'number' ||
      data.baseConfidence < 0 ||
      data.baseConfidence > 1) {
    errors.push('baseConfidence must be a number between 0 and 1');
  }

  // Validate game data
  if (!data.gameData || typeof data.gameData !== 'object') {
    errors.push('gameData is required and must be an object');
  }

  // Validate context (optional but if present, validate structure)
  if (data.context) {
    if (typeof data.context !== 'object') {
      errors.push('context must be an object');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize string inputs
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') return '';

  // Remove potentially dangerous characters
  let sanitized = input
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate API request rate (basic check)
 */
export function validateRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): boolean {
  // In production, use Redis or similar
  // This is a placeholder for rate limiting logic
  return true;
}

