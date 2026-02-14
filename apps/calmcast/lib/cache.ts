import { createClient, RedisClientType } from 'redis';
import type { CalmCastPlan } from '@/lib/calmcast-core';

let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = createClient({ url: redisUrl });
    
    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
    
    await redisClient.connect();
  }
  return redisClient;
}

export function generateCacheKey(target: string, mode: string, durationMinutes: number, intensity?: number): string {
  return `calmcast:${target}:${mode}:${durationMinutes}:${intensity || 2}`;
}

export async function getCachedAudio(cacheKey: string): Promise<Buffer | null> {
  try {
    const client = await getRedisClient();
    const cached = await client.get(cacheKey);
    return cached ? Buffer.from(cached, 'base64') : null;
  } catch (error) {
    console.warn('Cache get failed:', error);
    return null;
  }
}

export async function setCachedAudio(cacheKey: string, audioBuffer: Buffer, ttlSeconds: number = 3600): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.setEx(cacheKey, ttlSeconds, audioBuffer.toString('base64'));
  } catch (error) {
    console.warn('Cache set failed:', error);
  }
}

export async function getCachedPlan(cacheKey: string): Promise<CalmCastPlan | null> {
  try {
    const client = await getRedisClient();
    const cached = await client.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn('Plan cache get failed:', error);
    return null;
  }
}

export async function setCachedPlan(cacheKey: string, plan: CalmCastPlan, ttlSeconds: number = 1800): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.setEx(cacheKey, ttlSeconds, JSON.stringify(plan));
  } catch (error) {
    console.warn('Plan cache set failed:', error);
  }
}
