/**
 * Rate Limiter
 * Implements tiered rate limiting based on API key tiers
 */

export type RateLimitTier = 'free' | 'pro' | 'elite' | 'enterprise';

export type ApiScope =
  | 'predictions:read'
  | 'predictions:write'
  | 'simulations:read'
  | 'simulations:write'
  | 'arbitrage:read'
  | 'parlays:read'
  | 'parlays:write'
  | 'performance:read'
  | 'claude-effect:read'
  | 'odds:read'
  | 'games:read'
  | '*'; // All scopes

export interface RateLimitConfig {
  requestsPerHour: number;
  burstLimit: number;
  windowMs: number;
  scopes?: ApiScope[]; // Allowed scopes for this tier
}

export interface ApiKeyInfo {
  tier: RateLimitTier;
  scopes: ApiScope[];
  keyId?: string;
  userId?: string;
}

const RATE_LIMIT_CONFIGS: Record<RateLimitTier, RateLimitConfig> = {
  free: {
    requestsPerHour: 100,
    burstLimit: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    scopes: ['predictions:read', 'games:read', 'odds:read'],
  },
  pro: {
    requestsPerHour: 1000,
    burstLimit: 50,
    windowMs: 60 * 60 * 1000,
    scopes: ['predictions:read', 'predictions:write', 'simulations:read', 'arbitrage:read', 'parlays:read', 'games:read', 'odds:read'],
  },
  elite: {
    requestsPerHour: 5000,
    burstLimit: 200,
    windowMs: 60 * 60 * 1000,
    scopes: ['predictions:read', 'predictions:write', 'simulations:read', 'simulations:write', 'arbitrage:read', 'parlays:read', 'parlays:write', 'performance:read', 'claude-effect:read', 'games:read', 'odds:read'],
  },
  enterprise: {
    requestsPerHour: 10000,
    burstLimit: 500,
    windowMs: 60 * 60 * 1000,
    scopes: ['*'], // All scopes
  },
};

// API key info store (would be in database in production)
const apiKeyInfoStore = new Map<string, ApiKeyInfo>();

interface RateLimitEntry {
  count: number;
  resetTime: number;
  burstCount: number;
  burstResetTime: number;
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if request is within rate limits
 */
export function checkRateLimit(
  apiKey: string | null,
  tier: RateLimitTier = 'free'
): { allowed: boolean; remaining: number; resetAt: Date } {
  const key = apiKey || 'anonymous';
  const config = RATE_LIMIT_CONFIGS[tier];
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Initialize or reset if window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
      burstCount: 0,
      burstResetTime: now + 60000, // 1 minute burst window
    };
  }

  // Check burst limit (short window)
  if (entry.burstResetTime < now) {
    entry.burstCount = 0;
    entry.burstResetTime = now + 60000;
  }

  if (entry.burstCount >= config.burstLimit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.burstResetTime),
    };
  }

  // Check hourly limit
  if (entry.count >= config.requestsPerHour) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetTime),
    };
  }

  // Increment counters
  entry.count++;
  entry.burstCount++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.requestsPerHour - entry.count,
    resetAt: new Date(entry.resetTime),
  };
}

/**
 * Get API key info including tier and scopes
 */
export function getApiKeyInfo(apiKey: string | null): ApiKeyInfo {
  if (!apiKey) {
    return {
      tier: 'free',
      scopes: RATE_LIMIT_CONFIGS.free.scopes || [],
    };
  }

  // Check cache first
  const cached = apiKeyInfoStore.get(apiKey);
  if (cached) {
    return cached;
  }

  // TODO: Check database for API key info in production
  // For now, check environment variable or default to free
  const tier = process.env[`API_KEY_TIER_${apiKey}`] as RateLimitTier;
  const validTier = tier && ['free', 'pro', 'elite', 'enterprise'].includes(tier)
    ? tier
    : 'free';

  const config = RATE_LIMIT_CONFIGS[validTier];
  const info: ApiKeyInfo = {
    tier: validTier,
    scopes: config.scopes || [],
    keyId: process.env[`API_KEY_ID_${apiKey}`],
    userId: process.env[`API_KEY_USER_${apiKey}`],
  };

  // Cache for future use
  apiKeyInfoStore.set(apiKey, info);

  return info;
}

/**
 * Get tier from API key (backward compatibility)
 */
export function getTierFromApiKey(apiKey: string | null): RateLimitTier {
  return getApiKeyInfo(apiKey).tier;
}

/**
 * Check if API key has required scope
 */
export function hasScope(apiKey: string | null, requiredScope: ApiScope): boolean {
  const info = getApiKeyInfo(apiKey);

  // Wildcard scope allows everything
  if (info.scopes.includes('*')) {
    return true;
  }

  return info.scopes.includes(requiredScope);
}

/**
 * Check if API key has any of the required scopes
 */
export function hasAnyScope(apiKey: string | null, requiredScopes: ApiScope[]): boolean {
  const info = getApiKeyInfo(apiKey);

  // Wildcard scope allows everything
  if (info.scopes.includes('*')) {
    return true;
  }

  return requiredScopes.some(scope => info.scopes.includes(scope));
}

/**
 * Map endpoint to required scope
 */
export function getRequiredScopeForEndpoint(endpoint: string, method: string = 'GET'): ApiScope | null {
  const endpointLower = endpoint.toLowerCase();
  const methodUpper = method.toUpperCase();

  // Predictions
  if (endpointLower.includes('predict') || endpointLower.includes('prediction')) {
    return methodUpper === 'POST' ? 'predictions:write' : 'predictions:read';
  }

  // Simulations
  if (endpointLower.includes('simulat')) {
    return methodUpper === 'POST' ? 'simulations:write' : 'simulations:read';
  }

  // Arbitrage
  if (endpointLower.includes('arbitrage') || endpointLower.includes('arb')) {
    return 'arbitrage:read';
  }

  // Parlays
  if (endpointLower.includes('parlay') || endpointLower.includes('teaser')) {
    return methodUpper === 'POST' ? 'parlays:write' : 'parlays:read';
  }

  // Performance
  if (endpointLower.includes('performance') || endpointLower.includes('leaderboard') || endpointLower.includes('stats')) {
    return 'performance:read';
  }

  // Claude Effect
  if (endpointLower.includes('claude-effect') || endpointLower.includes('claude')) {
    return 'claude-effect:read';
  }

  // Odds
  if (endpointLower.includes('odds')) {
    return 'odds:read';
  }

  // Games
  if (endpointLower.includes('game')) {
    return 'games:read';
  }

  // Default: require predictions:read for most endpoints
  return 'predictions:read';
}

/**
 * Clean up expired entries (run periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now && entry.burstResetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

