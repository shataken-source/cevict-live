import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-client';
import { parseLocationInput } from '@/lib/location-parser';
import { 
  validateLostPetForm, 
  sanitizeString, 
  validatePetType,
  validateSize,
  normalizePhone,
  MAX_LENGTHS 
} from '@/lib/validation';
import { reportRateLimiter, getClientId } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = reportRateLimiter.check(clientId);
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  try {
    const supabase = getSupabaseClient();
    const body = await req.json();
    
    // Sanitize all string inputs first
    const sanitized = {
      petName: sanitizeString(body.petName, MAX_LENGTHS.petName),
      petType: body.petType,
      breed: sanitizeString(body.breed, MAX_LENGTHS.breed) || 'Unknown',
      color: sanitizeString(body.color, MAX_LENGTHS.color),
      size: body.size,
      age: sanitizeString(body.age, MAX_LENGTHS.age),
      gender: sanitizeString(body.gender, 20),
      description: sanitizeString(body.description, MAX_LENGTHS.description),
      location: sanitizeString(body.location, MAX_LENGTHS.location),
      location_city: sanitizeString(body.location_city, 100),
      location_state: sanitizeString(body.location_state, 2),
      location_zip: sanitizeString(body.location_zip, 10),
      date_lost: body.date_lost || body.last_seen_date,
      owner_name: sanitizeString(body.owner_name, MAX_LENGTHS.ownerName),
      owner_email: sanitizeString(body.owner_email, MAX_LENGTHS.ownerEmail),
      owner_phone: normalizePhone(body.owner_phone),
      photo_url: sanitizeString(body.photo_url, MAX_LENGTHS.photoUrl),
    };

    // Validate all fields
    const validation = validateLostPetForm(sanitized);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Validate and normalize pet type
    const validPetType = validatePetType(sanitized.petType);
    if (!validPetType) {
      return NextResponse.json(
        {
          error: 'Invalid pet type. Must be "dog" or "cat"',
        },
        { status: 400 }
      );
    }

    // Validate and normalize size
    const validSize = sanitized.size ? validateSize(sanitized.size) : null;

    // Parse location - handle "Columbus Indiana" format
    let parsedLocation = {
      city: sanitized.location_city || null,
      state: sanitized.location_state || null,
      zip: sanitized.location_zip || null,
      detail: sanitized.location || null,
    };

    // If location is provided as a single string, parse it
    if (sanitized.location && !sanitized.location_city) {
      const parsed = parseLocationInput(sanitized.location);
      parsedLocation = {
        city: parsed.city ? sanitizeString(parsed.city, 100) : sanitized.location,
        state: parsed.state,
        zip: parsed.zip || sanitized.location_zip || null,
        detail: parsed.detail ? sanitizeString(parsed.detail, MAX_LENGTHS.location) : sanitized.location,
      };
    }

    // Validate that we have at least a city
    if (!parsedLocation.city || !parsedLocation.city.trim()) {
      return NextResponse.json(
        {
          error: 'Location is required. Please provide city and state (e.g., "Columbus, Indiana" or "Columbus Indiana")',
        },
        { status: 400 }
      );
    }

    // Sanitize location fields
    parsedLocation.city = sanitizeString(parsedLocation.city, 100);
    parsedLocation.state = parsedLocation.state ? sanitizeString(parsedLocation.state, 2) : null;
    parsedLocation.zip = parsedLocation.zip ? sanitizeString(parsedLocation.zip, 10) : null;
    parsedLocation.detail = parsedLocation.detail ? sanitizeString(parsedLocation.detail, MAX_LENGTHS.location) : null;

    // Insert the lost pet report
    const { data, error } = await supabase
      .from('lost_pets')
      .insert({
        pet_name: sanitized.petName,
        pet_type: validPetType,
        breed: sanitized.breed,
        color: sanitized.color!,
        size: validSize,
        age: sanitized.age,
        gender: sanitized.gender,
        description: sanitized.description,
        location_city: parsedLocation.city,
        location_state: parsedLocation.state,
        location_zip: parsedLocation.zip,
        location_detail: parsedLocation.detail,
        date_lost: sanitized.date_lost || null,
        status: 'lost',
        owner_name: sanitized.owner_name,
        owner_email: sanitized.owner_email,
        owner_phone: sanitized.owner_phone,
        photo_url: sanitized.photo_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        {
          error: 'Failed to save pet report',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pet report created successfully',
      pet: data,
    }, {
      headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetAt.toString(),
      },
    });
  } catch (error: any) {
    console.error('Report lost pet error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
