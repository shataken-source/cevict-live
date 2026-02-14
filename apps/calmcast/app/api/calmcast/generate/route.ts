import { NextRequest, NextResponse } from 'next/server';
import { clampPlanToVetLocked, generateCalmCast } from '@/lib/calmcast-core';
import { CalmRequestSchema } from '../../../../lib/validation';
import { extractApiKeyFromRequest, validateApiKey } from '../../../../lib/auth';
import { checkRateLimit, getClientIdentifier } from '../../../../lib/rate-limiter';
import { createRequestLogger } from '../../../../lib/logger';
import { generateCacheKey, getCachedPlan, setCachedPlan } from '../../../../lib/cache';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logger = createRequestLogger(request);
  
  try {
    // Extract and validate API key
    const apiKey = extractApiKeyFromRequest(request);
    let authResult: { valid: boolean; keyId?: string; name?: string; rateLimit?: number } | null = null;
    let rateLimitPoints = 10; // Default for anonymous
    
    if (apiKey) {
      authResult = validateApiKey(apiKey);
      if (!authResult.valid) {
        logger.warn('Invalid API key provided', { apiKey: apiKey.substring(0, 8) + '...' });
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      rateLimitPoints = authResult.rateLimit || 1000;
      logger.setContext('apiKey', authResult.keyId!);
    }
    
    // Check rate limits
    const identifier = authResult?.valid ? `apikey:${authResult.keyId}` : getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(identifier, rateLimitPoints, authResult?.valid || false);
    
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded', { 
        identifier, 
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime 
      });
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.resetTime 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime?.getTime().toString() || ''
          }
        }
      );
    }
    
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      logger.error('Invalid JSON body', error);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validation = CalmRequestSchema.safeParse(body);
    if (!validation.success) {
      logger.error('Invalid request body', validation.error.message);
      return NextResponse.json(
        { 
          error: 'Invalid request parameters',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }
    
    const { target, mode, durationMinutes, intensity } = validation.data;
    
    // Check cache first
    const cacheKey = generateCacheKey(target, mode, durationMinutes, intensity);
    const cachedPlan = await getCachedPlan(cacheKey);
    
    if (cachedPlan) {
      logger.info('Plan retrieved from cache', { 
        target, 
        mode, 
        durationMinutes, 
        intensity,
        cacheHit: true 
      });
      
      return NextResponse.json({ 
        success: true, 
        plan: cachedPlan,
        cached: true
      });
    }
    
    // Generate new plan
    const plan = generateCalmCast({
      target,
      mode,
      durationMinutes,
      intensity,
    });
    
    logger.info('Generated new calmcast plan', { 
      target, 
      mode, 
      durationMinutes, 
      intensity,
      planId: plan.meta.generatedAt 
    });
    
    // Apply vet lock if enabled
    const vetLock = body?.vetLock === false ? false : true;
    
    if (!vetLock) {
      // Cache the unclamped plan
      await setCachedPlan(cacheKey, plan);
      
      logger.info('Plan generated without vet lock', { vetLock: false });
      return NextResponse.json({ 
        success: true, 
        plan, 
        vetLock: { enabled: false },
        cached: false
      });
    }

    const clamped = clampPlanToVetLocked(plan);
    
    // Cache the clamped plan
    await setCachedPlan(cacheKey, clamped.plan);
    
    logger.info('Plan generated with vet lock', { 
      vetLock: true, 
      clamped: clamped.clamped,
      changesCount: clamped.changes?.length || 0
    });
    
    return NextResponse.json({
      success: true,
      plan: clamped.plan,
      vetLock: { enabled: true, clamped: clamped.clamped, changes: clamped.changes },
      cached: false
    });
  } catch (error: any) {
    logger.error('Unexpected error in generate endpoint', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    logger.info('Request completed', { 
      duration: Date.now() - startTime,
      statusCode: 200
    });
  }
}
