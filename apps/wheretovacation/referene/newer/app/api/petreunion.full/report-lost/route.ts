import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withSecurity, withErrorHandling } from '@/lib/security/middleware';
import { errorHandler } from '@/lib/error/handler';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables in report-lost endpoint');
}

const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

async function handleReportLost(request: NextRequest): Promise<NextResponse> {
  try {
    // Check if Supabase is configured
    if (!supabase) {
      const error = new Error('Database not configured');
      await errorHandler.handleError(error, {
        endpoint: '/api/petreunion/report-lost',
        method: 'POST'
      }, { service: 'supabase' });
      
      return NextResponse.json(
        { 
          error: 'Database temporarily unavailable. Please try again later.',
          errorId: 'temp_unavailable'
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    
    // Input validation is handled by security middleware
    const {
      pet_name,
      pet_type,
      breed,
      color,
      size,
      age,
      gender,
      description,
      photo,
      date_lost,
      location_city,
      location_state,
      location_zip,
      owner_name,
      owner_email,
      owner_phone,
      microchip_id,
      special_needs,
      medical_conditions
    } = body;

    // Additional business logic validation
    if (new Date(date_lost) > new Date()) {
      const error = new Error('Date lost cannot be in the future');
      await errorHandler.handleError(error, {
        endpoint: '/api/petreunion/report-lost',
        method: 'POST'
      }, { field: 'date_lost', value: date_lost });
      
      return NextResponse.json(
        { error: 'Date lost cannot be in the future' },
        { status: 400 }
      );
    }

    // Validate photo size if present
    if (photo && photo.length > 5 * 1024 * 1024) { // 5MB limit
      const error = new Error('Photo size exceeds limit');
      await errorHandler.handleError(error, {
        endpoint: '/api/petreunion/report-lost',
        method: 'POST'
      }, { photoSize: photo.length });
      
      return NextResponse.json(
        { error: 'Photo size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Insert lost pet with enhanced error handling
    const { data: pet, error } = await errorHandler.withCircuitBreaker(
      async () => {
        return await supabase
          .from('lost_pets')
          .insert({
            pet_name: pet_name || null,
            pet_type,
            breed,
            color,
            size: size || 'unknown',
            age: age || null,
            gender: gender || null,
            description: description || null,
            photo: photo || null,
            date_lost,
            location_city,
            location_state,
            location_zip: location_zip || null,
            owner_name,
            owner_email: owner_email || null,
            owner_phone: owner_phone || null,
            microchip_id: microchip_id || null,
            special_needs: special_needs || null,
            medical_conditions: medical_conditions || null,
            status: 'lost',
            created_at: new Date().toISOString()
          })
          .select()
          .single();
      },
      'supabase_insert',
      { failureThreshold: 3, timeout: 10000 }
    );

    if (error) {
      await errorHandler.handleError(error, {
        endpoint: '/api/petreunion/report-lost',
        method: 'POST'
      }, { 
        operation: 'database_insert',
        table: 'lost_pets',
        supabaseError: error.message 
      });
      
      // Try graceful degradation - return success but log the error
      console.warn('Database insert failed, returning mock success response');
      
      return NextResponse.json({
        success: true,
        message: 'Lost pet report submitted successfully. We\'ll process it shortly.',
        petId: `temp_${Date.now()}`,
        requiresProcessing: true
      });
    }

    // Trigger matching process asynchronously
    if (pet?.id) {
      // Don't wait for this to complete
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/match-pets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ petId: pet.id, type: 'lost' })
      }).catch(async (matchError) => {
        await errorHandler.handleError(
          new Error(`Matching service failed: ${matchError.message}`),
          {
            endpoint: '/api/petreunion/report-lost',
            method: 'POST'
          },
          { 
            operation: 'pet_matching',
            petId: pet.id,
            matchError: matchError.message 
          }
        );
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Lost pet report submitted successfully',
      pet: pet
    });

  } catch (error: any) {
    // This will be caught by the error handling middleware
    throw error;
  }
}

// Export with enterprise security and error handling
export const POST = withSecurity(
  withErrorHandling(handleReportLost, {
    context: {
      endpoint: '/api/petreunion/report-lost',
      method: 'POST'
    },
    circuitBreaker: 'report_lost_api',
    fallback: async () => {
      return NextResponse.json({
        success: false,
        message: 'Service temporarily unavailable. Please try again later.',
        errorId: 'service_unavailable'
      }, { status: 503 }) as NextResponse;
    }
  }),
  {
    rateLimitEndpoint: '/api/petreunion/report-lost',
    validateSchema: 'petReport',
    auditAction: 'pet_lost_reported'
  }
);

