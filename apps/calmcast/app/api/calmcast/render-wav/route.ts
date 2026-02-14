import { NextRequest, NextResponse } from 'next/server';
import { clampAmplitudeToVetLocked, clampPlanToVetLocked, generateCalmCast, renderWav } from '@/lib/calmcast-core';
import { RenderWavQuerySchema, CalmRequestSchema } from '../../../../lib/validation';
import { extractApiKeyFromRequest, validateApiKey } from '../../../../lib/auth';
import { checkRateLimit, getClientIdentifier } from '../../../../lib/rate-limiter';
import { createRequestLogger } from '../../../../lib/logger';
import { generateCacheKey, getCachedAudio, setCachedAudio } from '../../../../lib/cache';
import { convertAudio, AudioFormat, getContentType, getFileExtension } from '../../../../lib/audio-formats';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function asNumber(value: string | null) {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asInt(value: string | null) {
  const n = asNumber(value);
  if (n === null) return null;
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

async function buildAudioResponse(args: {
  target: any;
  mode: any;
  durationMinutes: any;
  intensity: any;
  vetLock: boolean;
  sampleRate?: number;
  maxDurationSeconds?: number;
  amplitude?: number;
  format?: AudioFormat;
  quality?: string;
  stream?: boolean;
}) {
  const plan = generateCalmCast({
    target: args.target,
    mode: args.mode,
    durationMinutes: args.durationMinutes,
    intensity: args.intensity,
  });

  const finalPlan = args.vetLock ? clampPlanToVetLocked(plan).plan : plan;
  const requestedAmplitude = args.amplitude;
  const amplitude = requestedAmplitude === undefined ? undefined : args.vetLock ? clampAmplitudeToVetLocked(requestedAmplitude) : requestedAmplitude;

  let audioBuffer = renderWav(finalPlan, {
    sampleRate: args.sampleRate,
    maxDurationSeconds: args.maxDurationSeconds,
    amplitude,
  });

  // Convert to requested format if not WAV
  if (args.format && args.format !== 'wav') {
    audioBuffer = await convertAudio(Buffer.from(audioBuffer), {
      format: args.format,
      quality: args.quality as any,
      bitrate: args.format === 'mp3' ? 128 : undefined
    });
  }

  const extension = getFileExtension(args.format || 'wav');
  const filename = `calmcast-${String(args.target)}-${String(args.mode)}-${finalPlan.meta.durationMinutes}m${extension}`;
  const contentType = getContentType(args.format || 'wav');

  if (args.stream) {
    // For streaming, we'll return the buffer directly
    return new NextResponse(audioBuffer.slice().buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Audio-Format': args.format || 'wav',
        'X-Audio-Duration': finalPlan.meta.durationMinutes.toString(),
      },
    });
  }

  return new NextResponse(audioBuffer.slice().buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Audio-Format': args.format || 'wav',
      'X-Audio-Duration': finalPlan.meta.durationMinutes.toString(),
    },
  });
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const logger = createRequestLogger(request);
  
  try {
    // Extract and validate API key
    const apiKey = extractApiKeyFromRequest(request);
    let authResult: { valid: boolean; keyId?: string; name?: string; rateLimit?: number } | null = null;
    let rateLimitPoints = 5; // Lower limit for audio generation
    
    if (apiKey) {
      authResult = validateApiKey(apiKey);
      if (!authResult.valid) {
        logger.warn('Invalid API key provided', { apiKey: apiKey.substring(0, 8) + '...' });
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      rateLimitPoints = Math.floor((authResult.rateLimit || 1000) / 10); // Audio generation is more expensive
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
    
    // Parse and validate query parameters
    const sp = request.nextUrl.searchParams;
    const query = {
      target: sp.get('target'),
      mode: sp.get('mode'),
      durationMinutes: asNumber(sp.get('durationMinutes')),
      intensity: asInt(sp.get('intensity')),
      vetLock: sp.get('vetLock') === 'false' ? false : true,
      sampleRate: asInt(sp.get('sampleRate')),
      maxDurationSeconds: asInt(sp.get('maxDurationSeconds')),
      amplitude: asNumber(sp.get('amplitude')),
      format: sp.get('format') as AudioFormat,
      quality: sp.get('quality'),
      stream: sp.get('stream') === 'true'
    };

    const validation = RenderWavQuerySchema.safeParse(query);
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
    
    const { target, mode, durationMinutes, intensity, vetLock, format, quality, stream } = validation.data;
    
    // Check cache first
    const cacheKey = generateCacheKey(target, mode, durationMinutes, intensity) + `:${format || 'wav'}:${quality || 'medium'}`;
    const cachedAudio = await getCachedAudio(cacheKey);
    
    if (cachedAudio) {
      logger.info('Audio retrieved from cache', { 
        target, 
        mode, 
        durationMinutes, 
        intensity,
        format: format || 'wav',
        cacheHit: true 
      });
      
      const extension = getFileExtension(format || 'wav');
      const filename = `calmcast-${target}-${mode}-${durationMinutes}m${extension}`;
      const contentType = getContentType(format || 'wav');
      const body = new Uint8Array(cachedAudio);
      
      return new NextResponse(body, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': stream ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
          'X-Audio-Format': format || 'wav',
          'X-Cached': 'true',
        },
      });
    }
    
    // Generate new audio
    const response = await buildAudioResponse({
      target,
      mode,
      durationMinutes,
      intensity: intensity ?? undefined,
      vetLock,
      sampleRate: query.sampleRate ?? undefined,
      maxDurationSeconds: query.maxDurationSeconds ?? undefined,
      amplitude: query.amplitude ?? undefined,
      format,
      quality,
      stream
    });
    
    // Cache the generated audio
    if (response.body) {
      const arrayBuffer = await response.arrayBuffer();
      await setCachedAudio(cacheKey, Buffer.from(arrayBuffer), 7200); // Cache for 2 hours
      
      logger.info('Generated new audio file', { 
        target, 
        mode, 
        durationMinutes, 
        intensity,
        format: format || 'wav',
        sizeBytes: arrayBuffer.byteLength,
        cacheHit: false 
      });
      
      // Return a new response with the cached data
      const extension = getFileExtension(format || 'wav');
      const filename = `calmcast-${target}-${mode}-${durationMinutes}m${extension}`;
      const contentType = getContentType(format || 'wav');
      
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': stream ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
          'X-Audio-Format': format || 'wav',
          'X-Cached': 'false',
        },
      });
    }
    
    return response;
  } catch (error: any) {
    logger.error('Unexpected error in render-wav endpoint', error);
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

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logger = createRequestLogger(request);
  
  try {
    // Extract and validate API key
    const apiKey = extractApiKeyFromRequest(request);
    let authResult: { valid: boolean; keyId?: string; name?: string; rateLimit?: number } | null = null;
    let rateLimitPoints = 5; // Lower limit for audio generation
    
    if (apiKey) {
      authResult = validateApiKey(apiKey);
      if (!authResult.valid) {
        logger.warn('Invalid API key provided', { apiKey: apiKey.substring(0, 8) + '...' });
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      rateLimitPoints = Math.floor((authResult.rateLimit || 1000) / 10);
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

    // Validate the core calmcast request
    const calmcastValidation = CalmRequestSchema.safeParse(body);
    if (!calmcastValidation.success) {
      logger.error('Invalid request body', calmcastValidation.error.message);
      return NextResponse.json(
        { 
          error: 'Invalid request parameters',
          details: calmcastValidation.error.errors
        },
        { status: 400 }
      );
    }
    
    const { target, mode, durationMinutes, intensity } = calmcastValidation.data;
    const vetLock = body?.vetLock === false ? false : true;
    const format = body?.format as AudioFormat;
    const quality = body?.quality;
    const stream = body?.stream === true;
    
    // Check cache first
    const cacheKey = generateCacheKey(target, mode, durationMinutes, intensity) + `:${format || 'wav'}:${quality || 'medium'}`;
    const cachedAudio = await getCachedAudio(cacheKey);
    
    if (cachedAudio) {
      logger.info('Audio retrieved from cache', { 
        target, 
        mode, 
        durationMinutes, 
        intensity,
        format: format || 'wav',
        cacheHit: true 
      });
      
      const extension = getFileExtension(format || 'wav');
      const filename = `calmcast-${target}-${mode}-${durationMinutes}m${extension}`;
      const contentType = getContentType(format || 'wav');
      const body = new Uint8Array(cachedAudio);
      
      return new NextResponse(body, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': stream ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
          'X-Audio-Format': format || 'wav',
          'X-Cached': 'true',
        },
      });
    }
    
    // Generate new audio
    const response = await buildAudioResponse({
      target,
      mode,
      durationMinutes,
      intensity,
      vetLock,
      sampleRate: typeof body?.sampleRate === 'number' ? body.sampleRate : undefined,
      maxDurationSeconds: typeof body?.maxDurationSeconds === 'number' ? body.maxDurationSeconds : undefined,
      amplitude: typeof body?.amplitude === 'number' ? body.amplitude : undefined,
      format,
      quality,
      stream
    });
    
    // Cache the generated audio
    if (response.body) {
      const arrayBuffer = await response.arrayBuffer();
      await setCachedAudio(cacheKey, Buffer.from(arrayBuffer), 7200);
      
      logger.info('Generated new audio file', { 
        target, 
        mode, 
        durationMinutes, 
        intensity,
        format: format || 'wav',
        sizeBytes: arrayBuffer.byteLength,
        cacheHit: false 
      });
      
      // Return a new response with the cached data
      const extension = getFileExtension(format || 'wav');
      const filename = `calmcast-${target}-${mode}-${durationMinutes}m${extension}`;
      const contentType = getContentType(format || 'wav');
      
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': stream ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
          'X-Audio-Format': format || 'wav',
          'X-Cached': 'false',
        },
      });
    }
    
    return response;
  } catch (error: any) {
    logger.error('Unexpected error in render-wav endpoint', error);
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
