import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Get all rentals from database (LIVE DATA)
 * Supports filtering by type, location, availability
 */
export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { searchParams } = new URL(request.url);

    // Build query
    let query = supabase.from('rentals').select('*');

    // Filter by rental type
    const rentalType = searchParams.get('rental_type');
    if (rentalType) {
      query = query.eq('rental_type', rentalType);
    }

    // Filter by location
    const location = searchParams.get('location');
    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    // Filter by availability
    const available = searchParams.get('available');
    if (available === 'true') {
      query = query.eq('available', true);
    }

    // Filter by capacity (minimum)
    const minGuests = searchParams.get('min_guests');
    if (minGuests) {
      query = query.gte('max_guests', parseInt(minGuests));
    }

    // Filter by price range
    const maxPrice = searchParams.get('max_price');
    if (maxPrice) {
      query = query.lte('price_per_night', parseInt(maxPrice));
    }

    // Order by
    const orderBy = searchParams.get('order_by') || 'created_at';
    const orderDirection = searchParams.get('order_direction') || 'desc';
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });

    // Limit
    const limit = searchParams.get('limit');
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch rentals', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching rentals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rentals', details: error.message },
      { status: 500 }
    );
  }
}

