import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchNearbyPlaces, storePlacesInDatabase } from '@/lib/places-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const radius = parseInt(searchParams.get('radius') || '5000');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Latitude and longitude required' }, { status: 400 });
  }

  // First try to get from database (cached places)
  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Query places within radius using PostGIS or simple distance filter
    const { data: dbPlaces, error } = await supabase
      .from('sr_places')
      .select('*')
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    if (!error && dbPlaces && dbPlaces.length > 0) {
      // Calculate distance and filter
      const placesWithDistance = dbPlaces.map(p => {
        const distance = calculateDistance(lat, lng, p.lat, p.lng);
        return { ...p, distance: distance.toFixed(1) };
      }).filter(p => parseFloat(p.distance) <= radius / 1609.34); // Convert meters to miles

      if (placesWithDistance.length >= 5) {
        // Sort by distance
        placesWithDistance.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
        
        return NextResponse.json({ 
          places: placesWithDistance.map(transformDbPlace),
          source: 'database'
        });
      }
    }
  }

  // If not enough in DB, fetch from Google Places API
  try {
    const googlePlaces = await fetchNearbyPlaces(lat, lng, radius);
    
    // Store in database for caching
    if (supabaseUrl && supabaseKey && googlePlaces.length > 0) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const state = await getStateFromCoords(lat, lng);
      await storePlacesInDatabase(supabase, googlePlaces, state);
    }

    return NextResponse.json({ 
      places: googlePlaces,
      source: 'google_places'
    });
  } catch (err) {
    console.error('Error fetching places:', err);
    return NextResponse.json({ 
      error: 'Failed to fetch places',
      places: []
    }, { status: 500 });
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
           Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function transformDbPlace(p: any) {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    address: p.address,
    distance: p.distance || '0.0',
    rating: p.rating || 0,
    reviews: p.reviews || 0,
    smokingPolicy: p.smoking_policy || 'designated',
    features: p.features || [],
    verified: p.verified || false,
    phone: p.phone,
    website: p.website,
    hours: p.hours,
    lat: p.lat,
    lng: p.lng
  };
}

async function getStateFromCoords(lat: number, lng: number): Promise<string> {
  // Simple reverse geocoding - in production use a real geocoding service
  // This is a simplified version that returns state based on coordinates
  // For now, return 'GA' as default (Atlanta area)
  return 'GA';
}
