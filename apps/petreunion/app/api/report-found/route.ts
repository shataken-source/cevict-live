import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-client'
import { parseLocationInput } from '@/lib/location-parser';
import { sanitizeString, MAX_LENGTHS } from '@/lib/validation';
import { reportRateLimiter, getClientId } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientId = getClientId(request);
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
    const body = await request.json()

    // Validate required fields
    if (!body.petType || !body.color || !body.location || !body.date_found) {
      return NextResponse.json(
        { error: 'Missing required fields: petType, color, location, and date_found are required' },
        { status: 400 }
      )
    }

    // Parse location - handle "City State" format
    let parsedLocation = {
      city: body.location_city || null,
      state: body.location_state || null,
      zip: body.location_zip || null,
      detail: body.location || null,
    };

    // If location is provided as a single string, parse it
    if (body.location && !body.location_city) {
      const parsed = parseLocationInput(body.location);
      parsedLocation = {
        city: parsed.city ? sanitizeString(parsed.city, 100) : body.location,
        state: parsed.state,
        zip: parsed.zip || body.location_zip || null,
        detail: parsed.detail ? sanitizeString(parsed.detail, MAX_LENGTHS.location) : body.location,
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

    // Sanitize location fields — require state (no default to AL; invalid location = reject)
    parsedLocation.city = sanitizeString(parsedLocation.city, 100);
    const stateRaw = parsedLocation.state ? sanitizeString(parsedLocation.state, 2) : null;
    if (!stateRaw || stateRaw.length !== 2) {
      return NextResponse.json(
        {
          error: 'Please provide a valid US city and state (e.g., "Houston, TX" or "Los Angeles, California"). State is required.',
        },
        { status: 400 }
      );
    }
    parsedLocation.state = stateRaw;
    parsedLocation.zip = parsedLocation.zip ? sanitizeString(parsedLocation.zip, 10) : null;
    parsedLocation.detail = parsedLocation.detail ? sanitizeString(parsedLocation.detail, MAX_LENGTHS.location) : null;

    // Insert into database
    const { data, error } = await supabase
      .from('lost_pets')
      .insert({
        pet_name: sanitizeString(body.petName, MAX_LENGTHS.petName),
        pet_type: body.petType,
        breed: sanitizeString(body.breed, MAX_LENGTHS.breed) || null,
        color: sanitizeString(body.color, MAX_LENGTHS.color),
        size: body.size || null,
        age: sanitizeString(body.age, MAX_LENGTHS.age) || null,
        gender: sanitizeString(body.gender, 20) || null,
        description: sanitizeString(body.description, MAX_LENGTHS.description) || null,
        location_city: parsedLocation.city,
        location_state: parsedLocation.state,
        location_zip: parsedLocation.zip,
        location_detail: parsedLocation.detail,
        date_lost: null, // Found pets don't have date_lost, but field is required
        date_found: body.date_found,
        status: 'found',
        owner_name: sanitizeString(body.finder_name, MAX_LENGTHS.ownerName) || 'Community', // Required field
        owner_email: sanitizeString(body.finder_email, MAX_LENGTHS.ownerEmail) || null,
        owner_phone: sanitizeString(body.finder_phone, 20) || null,
        photo_url: sanitizeString(body.photo_url, MAX_LENGTHS.photoUrl) || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting found pet:', error)
      return NextResponse.json(
        { error: 'Failed to submit report', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data },
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt.toString(),
        },
      }
    )
  } catch (error) {
    console.error('Error in report-found API:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}
