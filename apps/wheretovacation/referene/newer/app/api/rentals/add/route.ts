import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Add a new rental (manually or via scraper)
 * Triggers the local activities bot after successful rental addition
 * Makes activities available to Finn
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      rental_type, // condo, house, villa, etc.
      property_category, // beachfront, luxury, family, etc.
      bedrooms,
      bathrooms,
      max_guests,
      price_per_night,
      location,
      address,
      description,
      amenities = [],
      available = true,
      source = 'manual',
      source_url,
    } = body;

    // Validate required fields
    if (!name || !rental_type || !max_guests || !price_per_night || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: name, rental_type, max_guests, price_per_night, location' },
        { status: 400 }
      );
    }

    // Insert into Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for duplicates
    const { data: existing } = await supabase
      .from('rentals')
      .select('id')
      .eq('name', name)
      .eq('location', location)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Rental with this name and location already exists', rentalId: existing.id },
        { status: 409 }
      );
    }

    // Insert rental
    const { data, error } = await supabase
      .from('rentals')
      .insert([{
        name,
        rental_type,
        property_category: property_category || rental_type,
        bedrooms,
        bathrooms,
        max_guests,
        price_per_night,
        location,
        address,
        description,
        amenities,
        available,
        source,
        source_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to add rental', details: error.message },
        { status: 500 }
      );
    }

    const rental = data;

    // Trigger local activities bot (makes activities available to Finn)
    try {
      const activitiesBotUrl = process.env.ACTIVITIES_BOT_URL || process.env.NEXT_PUBLIC_GCC_URL || 'http://localhost:3006';
      await fetch(`${activitiesBotUrl}/api/activities/trigger-bot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trigger: 'new_rental_added',
          rentalId: rental.id,
          rentalName: rental.name,
          location: rental.location,
        }),
      });
    } catch (error) {
      console.error('Failed to trigger activities bot:', error);
      // Don't fail the rental addition if bot trigger fails
    }

    // Also notify GCC if needed
    try {
      const gccUrl = process.env.NEXT_PUBLIC_GCC_URL || 'http://localhost:3006';
      await fetch(`${gccUrl}/api/rentals/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rentalId: rental.id,
          rentalName: rental.name,
          location: rental.location,
          action: 'added',
        }),
      });
    } catch (error) {
      console.error('Failed to notify GCC:', error);
    }

    return NextResponse.json({
      success: true,
      rental,
      message: 'Rental added successfully. Local activities bot triggered for Finn.',
    });
  } catch (error: any) {
    console.error('Error adding rental:', error);
    return NextResponse.json(
      { error: 'Failed to add rental', details: error.message },
      { status: 500 }
    );
  }
}

