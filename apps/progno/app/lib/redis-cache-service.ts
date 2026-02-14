/**
 * Redis Caching Service
 * Cache odds, weather, and API responses to reduce costs
 */

import { Redis } from '@upstash/redis';

export interface CacheConfig {
  oddsTtlSeconds: number;
  weatherTtlSeconds: number;
  scoresTtlSeconds: number;
  statsTtlSeconds: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  keys: number;
  memoryUsage: string;
  estimatedSavings: number;
}

export class RedisCacheService {
  private redis: Redis | null = null;
  private localCache: Map<string, { value: any; expires: number }> = new Map();
  private stats: { hits: number; misses: number } = { hits: 0, misses: 0 };
  private config: CacheConfig;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      oddsTtlSeconds: 300,      // 5 minutes for odds
      weatherTtlSeconds: 3600,    // 1 hour for weather
      scoresTtlSeconds: 60,       // 1 minute for live scores
      statsTtlSeconds: 86400,   // 24 hours for team stats
      ...config,
    };

    // Initialize Redis if credentials available
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (url && token) {
      this.redis = new Redis({ url, token });
    } else {
      console.log('[Cache] Redis not configured, using in-memory cache');
    }
  }

  /**
   * Get cached odds data
   */
  async getOdds(gameId: string): Promise<any | null> {
    const key = `odds:${gameId}`;
    return this.get(key, this.config.oddsTtlSeconds);
  }

  /**
   * Cache odds data
   */
  async setOdds(gameId: string, odds: any): Promise<void> {
    const key = `odds:${gameId}`;
    await this.set(key, odds, this.config.oddsTtlSeconds);
  }

  /**
   * Get cached weather data
   */
  async getWeather(location: string): Promise<any | null> {
    const key = `weather:${location.toLowerCase().replace(/\s+/g, '_')}`;
    return this.get(key, this.config.weatherTtlSeconds);
  }

  /**
   * Cache weather data
   */
  async setWeather(location: string, weather: any): Promise<void> {
    const key = `weather:${location.toLowerCase().replace(/\s+/g, '_')}`;
    await this.set(key, weather, this.config.weatherTtlSeconds);
  }

  /**
   * Get cached live scores
   */
  async getScore(gameId: string): Promise<any | null> {
    const key = `score:${gameId}`;
    return this.get(key, this.config.scoresTtlSeconds);
  }

  /**
   * Cache live score
   */
  async setScore(gameId: string, score: any): Promise<void> {
    const key = `score:${gameId}`;
    await this.set(key, score, this.config.scoresTtlSeconds);
  }

  /**
   * Get cached team stats
   */
  async getTeamStats(teamId: string): Promise<any | null> {
    const key = `stats:${teamId}`;
    return this.get(key, this.config.statsTtlSeconds);
  }

  /**
   * Cache team stats
   */
  async setTeamStats(teamId: string, stats: any): Promise<void> {
    const key = `stats:${teamId}`;
    await this.set(key, stats, this.config.statsTtlSeconds);
  }

  /**
   * Generic cache getter with fallback
   */
  async get<T>(key: string, ttl: number): Promise<T | null> {
    // Try Redis first
    if (this.redis) {
      try {
        const value = await this.redis.get<T>(key);
        if (value) {
          this.stats.hits++;
          return value;
        }
      } catch (e) {
        console.error('[Cache] Redis error:', e);
      }
    }

    // Fallback to local cache
    const local = this.localCache.get(key);
    if (local && local.expires > Date.now()) {
      this.stats.hits++;
      return local.value;
    }

    // Clean up expired local cache entry
    if (local) {
      this.localCache.delete(key);
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Generic cache setter
   */
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    // Set in Redis
    if (this.redis) {
      try {
        await this.redis.set(key, value, { ex: ttl });
      } catch (e) {
        console.error('[Cache] Redis set error:', e);
      }
    }

    // Also set in local cache for fallback
    this.localCache.set(key, {
      value,
      expires: Date.now() + ttl * 1000,
    });

    // Clean up old local cache entries periodically
    if (this.localCache.size > 1000) {
      this.cleanupLocalCache();
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(key);
    }
    this.localCache.delete(key);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (this.redis) {
      await this.redis.flushall();
    }
    this.localCache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    let redisKeys = 0;
    let memoryUsage = '0 MB';

    if (this.redis) {
      try {
        redisKeys = await this.redis.dbsize();
        // Note: Memory info requires more complex Redis commands
        memoryUsage = 'See Redis dashboard';
      } catch (e) {
        console.error('[Cache] Stats error:', e);
      }
    }

    // Estimate savings: assume API calls cost ~$0.001 each
    const estimatedSavings = this.stats.hits * 0.001;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 10) / 10,
      keys: redisKeys || this.localCache.size,
      memoryUsage,
      estimatedSavings: Math.round(estimatedSavings * 100) / 100,
    };
  }

  /**
   * Warm cache with upcoming games data
   */
  async warmCache(
    games: Array<{ id: string; sport: string; homeTeam: string; awayTeam: string; gameTime: string }>
  ): Promise<void> {
    console.log(`[Cache] Warming cache with ${games.length} games`);

    // Pre-fetch odds for all games
    const oddsPromises = games.map(async (game) => {
      const cached = await this.getOdds(game.id);
      if (!cached) {
        // Trigger fetch - would integrate with odds service
        console.log(`[Cache] Will fetch odds for ${game.id}`);
      }
    });

    // Pre-fetch weather for outdoor games
    const weatherPromises = games
      .filter(g => ['nfl', 'mlb'].includes(g.sport.toLowerCase()))
      .map(async (game) => {
        const location = this.inferLocation(game.homeTeam);
        const cached = await this.getWeather(location);
        if (!cached) {
          console.log(`[Cache] Will fetch weather for ${location}`);
        }
      });

    await Promise.all([...oddsPromises, ...weatherPromises]);
  }

  /**
   * Cache API response with smart TTL
   */
  async cacheApiResponse(
    apiName: string,
    endpoint: string,
    params: Record<string, any>,
    response: any
  ): Promise<void> {
    const key = `api:${apiName}:${endpoint}:${this.hashParams(params)}`;
    
    // Determine TTL based on API
    let ttl = 300; // Default 5 minutes
    if (apiName === 'weather') ttl = 3600;
    if (apiName === 'scores') ttl = 60;
    if (apiName === 'stats') ttl = 86400;

    await this.set(key, response, ttl);
  }

  /**
   * Get cached API response
   */
  async getApiResponse(
    apiName: string,
    endpoint: string,
    params: Record<string, any>
  ): Promise<any | null> {
    const key = `api:${apiName}:${endpoint}:${this.hashParams(params)}`;
    
    let ttl = 300;
    if (apiName === 'weather') ttl = 3600;
    if (apiName === 'scores') ttl = 60;
    if (apiName === 'stats') ttl = 86400;

    return this.get(key, ttl);
  }

  /**
   * Batch get multiple cache keys
   */
  async mget(keys: string[]): Promise<(any | null)[]> {
    if (this.redis) {
      try {
        return await this.redis.mget(...keys);
      } catch (e) {
        console.error('[Cache] MGET error:', e);
      }
    }

    // Fallback to individual gets
    return Promise.all(keys.map(k => this.get(k, 300)));
  }

  /**
   * Batch set multiple cache keys
   */
  async mset(entries: Array<{ key: string; value: any; ttl: number }>): Promise<void> {
    if (this.redis) {
      const pipeline = this.redis.pipeline();
      for (const entry of entries) {
        pipeline.set(entry.key, entry.value, { ex: entry.ttl });
      }
      try {
        await pipeline.exec();
      } catch (e) {
        console.error('[Cache] Pipeline error:', e);
      }
    }

    // Also set in local cache
    for (const entry of entries) {
      this.localCache.set(entry.key, {
        value: entry.value,
        expires: Date.now() + entry.ttl * 1000,
      });
    }
  }

  private cleanupLocalCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.localCache) {
      if (entry.expires < now) {
        this.localCache.delete(key);
      }
    }

    // If still too big, remove oldest
    if (this.localCache.size > 1000) {
      const entries = Array.from(this.localCache.entries());
      entries.sort((a, b) => a[1].expires - b[1].expires);
      const toRemove = entries.slice(0, entries.length - 800);
      for (const [key] of toRemove) {
        this.localCache.delete(key);
      }
    }
  }

  private hashParams(params: Record<string, any>): string {
    const str = JSON.stringify(params, Object.keys(params).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private inferLocation(team: string): string {
    // Simplified mapping - real implementation would have full database
    const locations: Record<string, string> = {
      'Chiefs': 'Kansas City, MO',
      '49ers': 'San Francisco, CA',
      'Broncos': 'Denver, CO',
      'Dolphins': 'Miami, FL',
      'Packers': 'Green Bay, WI',
    };
    return locations[team] || team;
  }
}

export default RedisCacheService;
