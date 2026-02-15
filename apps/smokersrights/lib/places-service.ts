/**
 * Places Service - Real data from Google Places API
 * Fetches smoke shops, vape shops, hookah bars, cigar lounges near user
 */

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

export interface Place {
  id: string;
  name: string;
  type: 'bar' | 'restaurant' | 'lounge' | 'outdoor' | 'hotel' | 'casino' | 'vape_shop' | 'smoke_shop' | 'hookah_lounge';
  address: string;
  distance: string;
  rating: number;
  reviews: number;
  smokingPolicy: 'allowed' | 'designated' | 'outdoor-only' | 'vape-only';
  features: string[];
  verified: boolean;
  phone?: string;
  website?: string;
  hours?: string[];
  photos?: string[];
  lat?: number;
  lng?: number;
}

interface GooglePlace {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  geometry?: {
    location: { lat: number; lng: number };
  };
  types?: string[];
  opening_hours?: { weekday_text?: string[] };
  photos?: { photo_reference: string }[];
  international_phone_number?: string;
  website?: string;
}

const SEARCH_KEYWORDS = [
  'smoke shop', 'vape shop', 'hookah lounge', 'cigar bar', 
  'tobacco shop', 'cigarette store', 'vape store', 'smoking lounge'
];

export async function fetchNearbyPlaces(
  lat: number, 
  lng: number, 
  radius: number = 5000
): Promise<Place[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.error('No GOOGLE_PLACES_API_KEY configured');
    return [];
  }

  const allPlaces: Place[] = [];
  
  // Search for each keyword type
  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&key=${GOOGLE_PLACES_API_KEY}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.status === 'OK' && data.results) {
        for (const place of data.results) {
          const transformed = transformGooglePlace(place, lat, lng);
          // Avoid duplicates
          if (!allPlaces.find(p => p.id === transformed.id)) {
            allPlaces.push(transformed);
          }
        }
      }
      
      // Rate limit
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`Error fetching ${keyword}:`, err);
    }
  }
  
  // Sort by distance
  return allPlaces.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
}

function transformGooglePlace(place: GooglePlace, userLat: number, userLng: number): Place {
  const placeLat = place.geometry?.location?.lat || userLat;
  const placeLng = place.geometry?.location?.lng || userLng;
  const distance = calculateDistance(userLat, userLng, placeLat, placeLng);
  
  const type = determinePlaceType(place.types || [], place.name);
  const smokingPolicy = determineSmokingPolicy(type, place.name);
  
  return {
    id: place.place_id,
    name: place.name,
    type: type,
    address: place.vicinity || place.formatted_address || 'Address unknown',
    distance: distance.toFixed(1),
    rating: place.rating || 0,
    reviews: place.user_ratings_total || 0,
    smokingPolicy: smokingPolicy,
    features: generateFeatures(type, place.name),
    verified: true,
    phone: place.international_phone_number,
    website: place.website,
    hours: place.opening_hours?.weekday_text,
    photos: place.photos?.map(p => p.photo_reference),
    lat: placeLat,
    lng: placeLng
  };
}

function determinePlaceType(types: string[], name: string): Place['type'] {
  const lowerName = name.toLowerCase();
  
  if (types.includes('bar')) {
    if (lowerName.includes('cigar') || lowerName.includes('hookah')) return 'lounge';
    return 'bar';
  }
  if (types.includes('restaurant')) return 'restaurant';
  if (types.includes('lodging')) return 'hotel';
  if (types.includes('casino')) return 'casino';
  if (lowerName.includes('vape') || lowerName.includes('vaping')) return 'vape_shop';
  if (lowerName.includes('smoke') || lowerName.includes('tobacco') || lowerName.includes('cigarette')) return 'smoke_shop';
  if (lowerName.includes('hookah') || lowerName.includes('lounge')) return 'hookah_lounge';
  
  return 'smoke_shop';
}

function determineSmokingPolicy(type: Place['type'], name: string): Place['smokingPolicy'] {
  const lowerName = name.toLowerCase();
  
  if (type === 'vape_shop') return 'vape-only';
  if (type === 'smoke_shop' || type === 'hookah_lounge') return 'allowed';
  if (lowerName.includes('cigar') || lowerName.includes('lounge')) return 'allowed';
  if (type === 'bar' || type === 'casino') return 'designated';
  if (type === 'hotel' || type === 'restaurant') return 'outdoor-only';
  
  return 'designated';
}

function generateFeatures(type: Place['type'], name: string): string[] {
  const features: string[] = [];
  const lowerName = name.toLowerCase();
  
  if (type === 'vape_shop') {
    features.push('Vape Products', 'E-Liquids', 'Mods');
    if (lowerName.includes('bar')) features.push('Tasting Bar');
  }
  if (type === 'smoke_shop') {
    features.push('Tobacco', 'Accessories', 'Lighters');
    if (lowerName.includes('cigar')) features.push('Cigar Selection', 'Humidor');
  }
  if (type === 'hookah_lounge') {
    features.push('Hookah', 'Shisha', 'Lounge Seating');
  }
  if (type === 'bar' || type === 'lounge') {
    features.push('Full Bar', 'Drinks');
    if (lowerName.includes('cigar')) features.push('Cigar Menu');
  }
  
  return features.slice(0, 4);
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

// Fetch detailed place info
export async function fetchPlaceDetails(placeId: string): Promise<Partial<Place>> {
  if (!GOOGLE_PLACES_API_KEY) return {};
  
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,international_phone_number,website,opening_hours,photos,rating&key=${GOOGLE_PLACES_API_KEY}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.status === 'OK' && data.result) {
      const r = data.result;
      return {
        phone: r.international_phone_number,
        website: r.website,
        hours: r.opening_hours?.weekday_text,
        photos: r.photos?.map((p: any) => p.photo_reference)
      };
    }
  } catch (err) {
    console.error('Error fetching place details:', err);
  }
  
  return {};
}

// Store fetched places in Supabase for caching
export async function storePlacesInDatabase(
  supabase: any, 
  places: Place[], 
  state: string
): Promise<void> {
  const dbPlaces = places.map(p => ({
    id: p.id,
    name: p.name,
    type: p.type,
    address: p.address,
    state: state,
    lat: p.lat,
    lng: p.lng,
    rating: p.rating,
    reviews: p.reviews,
    smoking_policy: p.smokingPolicy,
    features: p.features,
    phone: p.phone,
    website: p.website,
    verified: p.verified,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  
  const { error } = await supabase.from('sr_places').upsert(dbPlaces, {
    onConflict: 'id'
  });
  
  if (error) {
    console.error('Error storing places:', error);
  }
}
