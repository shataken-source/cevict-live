import { NextRequest, NextResponse } from 'next/server';
import { getPreset, listPresets } from '@/lib/calmcast-core';
import { PresetQuerySchema } from '../../../../lib/validation';
import { extractApiKeyFromRequest, validateApiKey } from '../../../../lib/auth';
import { checkRateLimit, getClientIdentifier } from '../../../../lib/rate-limiter';
import { createRequestLogger } from '../../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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
    
    // Validate query parameters
    const url = new URL(request.url);
    const query = {
      id: url.searchParams.get('id')
    };
    
    const validation = PresetQuerySchema.safeParse(query);
    if (!validation.success) {
      logger.error('Invalid query parameters', validation.error.message);
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }
    
    const { id } = validation.data;
    
    // Handle request
    if (id) {
      const preset = getPreset(id);
      if (!preset) {
        logger.info('Preset not found', { presetId: id });
        return NextResponse.json({ error: 'Preset not found', id }, { status: 404 });
      }

      logger.info('Preset retrieved successfully', { presetId: id });
      return NextResponse.json({ success: true, preset });
    }

    const presets = listPresets();
    logger.info('All presets retrieved successfully', { count: presets.length });
    
    return NextResponse.json({
      success: true,
      presets,
    });
  } catch (error: any) {
    logger.error('Unexpected error in presets endpoint', error);
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
