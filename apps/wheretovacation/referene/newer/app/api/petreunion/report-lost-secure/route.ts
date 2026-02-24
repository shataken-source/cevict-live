import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validatePetData, sanitizeObject } from '@/lib/security/validation';
import { createError, handleDatabaseError, getSafeErrorResponse, ErrorCode, withErrorHandling } from '@/lib/errors/error-handler';
import { rateLimitMiddleware } from '@/lib/security/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Enterprise-level secure pet report endpoint
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Rate limiting
  const rateLimit = rateLimitMiddleware({ windowMs: 15 * 60 * 1000, maxRequests: 10 });
  const { allowed, headers } = rateLimit(request);
  
  if (!allowed) {
    const error = createError(ErrorCode.RATE_LIMIT_EXCEEDED, 'Too many requests. Please try again later.');
    return NextResponse.json(
      getSafeErrorResponse(error),
      { status: error.statusCode, headers: Object.fromEntries(headers) }
    );
  }
  
  if (!supabase) {
    const error = createError(
      ErrorCode.SERVICE_UNAVAILABLE,
      'Database not configured',
      undefined,
      503
    );
    return NextResponse.json(
      getSafeErrorResponse(error),
      { status: error.statusCode }
    );
  }

  try {
    // Parse and sanitize request body
    const rawBody = await request.json();
    const sanitizedBody = sanitizeObject(rawBody);
    
    // Validate pet data
    const validation = validatePetData(sanitizedBody);
    
    if (!validation.valid) {
      const error = createError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid pet data',
        { errors: validation.errors },
        400
      );
      return NextResponse.json(
        getSafeErrorResponse(error),
        { status: error.statusCode }
      );
    }
    
    // Prepare data for database
    const petData = {
      ...validation.sanitized,
      photo_url: sanitizedBody.photo ? sanitizedBody.photo.substring(0, 1300000) : null, // Limit photo size
      status: 'lost',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Insert into database
    const { data, error: dbError } = await supabase
      .from('lost_pets')
      .insert([petData])
      .select()
      .single();
    
    if (dbError) {
      throw handleDatabaseError(dbError);
    }
    
    return NextResponse.json({
      success: true,
      id: data.id,
      message: 'Pet report submitted successfully',
      data: {
        id: data.id,
        pet_name: data.pet_name,
        status: data.status
      }
    }, { 
      status: 201,
      headers: Object.fromEntries(headers)
    });
    
  } catch (error: any) {
    // If it's already an AppError, use it
    if (error.code && error.statusCode) {
      return NextResponse.json(
        getSafeErrorResponse(error),
        { status: error.statusCode }
      );
    }
    
    // Otherwise, create a generic error
    const appError = createError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to submit pet report',
      process.env.NODE_ENV === 'development' ? { originalError: error.message } : undefined
    );
    
    return NextResponse.json(
      getSafeErrorResponse(appError),
      { status: appError.statusCode }
    );
  }
});












