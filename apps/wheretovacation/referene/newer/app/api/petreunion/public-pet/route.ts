import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * GET /api/petreunion/public-pet?slug=ABCD1234
 * or
 * GET /api/petreunion/public-pet?id=123
 * 
 * Returns public info about a lost pet (for QR code landing page)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');
    
    if (!slug && !id) {
      return NextResponse.json(
        { error: 'slug or id is required' },
        { status: 400 }
      );
    }
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }
    
    // Fetch pet by slug or id
    let query = supabase
      .from('lost_pets')
      .select(`
        id,
        pet_name,
        pet_type,
        breed,
        color,
        size,
        photo_url,
        date_lost,
        location_city,
        location_state,
        location_detail,
        description,
        markings,
        reward_amount,
        status,
        public_url_slug,
        sighting_count,
        last_sighting_at,
        created_at,
        updated_at
      `);
    
    if (slug) {
      query = query.eq('public_url_slug', slug);
    } else {
      query = query.eq('id', id);
    }
    
    const { data: pet, error } = await query.single();
    
    if (error || !pet) {
      return NextResponse.json(
        { error: 'Pet not found' },
        { status: 404 }
      );
    }
    
    // Fetch recent sightings (last 5)
    const { data: sightings } = await supabase
      .from('pet_sightings')
      .select(`
        id,
        sighting_location,
        sighting_city,
        sighting_state,
        sighting_date,
        is_verified
      `)
      .eq('pet_id', pet.id)
      .order('sighting_date', { ascending: false })
      .limit(5);
    
    // Calculate days lost
    const dateLost = new Date(pet.date_lost);
    const daysLost = Math.floor((Date.now() - dateLost.getTime()) / (1000 * 60 * 60 * 24));
    
    // Determine status display
    let statusDisplay = {
      label: 'Lost',
      color: 'red',
      icon: '🔴',
      message: `Missing for ${daysLost} day${daysLost !== 1 ? 's' : ''}`
    };
    
    if (pet.status === 'found') {
      statusDisplay = {
        label: 'Found',
        color: 'green',
        icon: '🟢',
        message: 'This pet has been found and is safe!'
      };
    } else if (pet.status === 'reunited') {
      statusDisplay = {
        label: 'Reunited',
        color: 'blue',
        icon: '💙',
        message: 'This pet has been reunited with their family!'
      };
    }
    
    return NextResponse.json({
      pet: {
        ...pet,
        // Don't expose sensitive owner info
        photo_url: pet.photo_url?.startsWith('data:') 
          ? pet.photo_url 
          : pet.photo_url, // Keep URL as-is
      },
      status: statusDisplay,
      daysLost,
      sightings: sightings || [],
      sightingCount: pet.sighting_count || 0,
      lastSighting: pet.last_sighting_at,
      reportSightingUrl: `/api/petreunion/report-sighting`,
      shareUrl: `https://petreunion.com/pet/${pet.public_url_slug || pet.id}`
    });
    
  } catch (error: any) {
    console.error('[Public Pet] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get pet info' },
      { status: 500 }
    );
  }
}

