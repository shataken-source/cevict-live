import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { getRedisClient } from './cache';

// Rate limiter for anonymous requests (IP-based)
export const anonymousRateLimiter = new RateLimiterMemory({
  keyPrefix: 'calmcast_anon',
  points: 10, // Number of requests
  duration: 3600, // Per hour
});

// Rate limiter for authenticated API key requests
let apiKeyRateLimiter: RateLimiterRedis | null = null;

export async function getApiKeyRateLimiter(): Promise<RateLimiterRedis> {
  if (!apiKeyRateLimiter) {
    try {
      const redisClient = await getRedisClient();
      apiKeyRateLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'calmcast_apikey',
        points: 1000, // Default high limit for API keys
        duration: 3600, // Per hour
      });
    } catch (error) {
      console.warn('Redis not available, falling back to memory rate limiter');
      apiKeyRateLimiter = new RateLimiterMemory({
        keyPrefix: 'calmcast_apikey_fallback',
        points: 1000,
        duration: 3600,
      }) as any;
    }
  }
  return apiKeyRateLimiter;
}

export async function checkRateLimit(
  identifier: string, 
  customRateLimit?: number,
  isApiKey: boolean = false
): Promise<{ allowed: boolean; remaining: number; resetTime?: Date }> {
  try {
    const limiter = isApiKey ? await getApiKeyRateLimiter() : anonymousRateLimiter;
    
    if (customRateLimit && isApiKey && apiKeyRateLimiter) {
      // Create custom limiter for this API key
      const customLimiter = new RateLimiterRedis({
        storeClient: await getRedisClient(),
        keyPrefix: 'calmcast_custom',
        points: customRateLimit,
        duration: 3600,
      });
      
      const result = await customLimiter.consume(identifier);
      return {
        allowed: true,
        remaining: result.remainingPoints || 0,
        resetTime: new Date(Date.now() + result.msBeforeNext || 0)
      };
    }
    
    const result = await limiter.consume(identifier);
    return {
      allowed: true,
      remaining: result.remainingPoints || 0,
      resetTime: new Date(Date.now() + result.msBeforeNext || 0)
    };
  } catch (error: any) {
    if (error.remainingPoints !== undefined) {
      return {
        allowed: false,
        remaining: error.remainingPoints || 0,
        resetTime: new Date(Date.now() + error.msBeforeNext || 0)
      };
    }
    // If rate limiter fails, allow the request but log the error
    console.warn('Rate limiter error:', error);
    return { allowed: true, remaining: 0 };
  }
}

export function getClientIdentifier(request: Request): string {
  // Try to get real IP, falling back to forwarded headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  return `ip:${ip}`;
}
