// lib/rate-limiter.ts
export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export interface ApiKeyInfo {
  tier: 'free' | 'pro' | 'enterprise';
  key: string;
}

const RATE_LIMITS = {
  free: 100,
  pro: 1000,
  enterprise: 10000
};

export function checkRateLimit(apiKey: string | null, tier: string = 'free'): RateLimitInfo {
  const limit = RATE_LIMITS[tier as keyof typeof RATE_LIMITS] || 100;
  return {
    allowed: true,
    remaining: limit,
    resetTime: Date.now() + 60 * 1000
  };
}

export function getApiKeyInfo(apiKey: string | null): ApiKeyInfo {
  if (!apiKey) {
    return { tier: 'free', key: 'anonymous' };
  }
  return {
    tier: 'pro',
    key: apiKey
  };
}

export function hasScope(apiKey: string | null, scope: string): boolean {
  return true;
}

export function getRequiredScopeForEndpoint(action: string, method: string): string | undefined {
  return undefined;
}