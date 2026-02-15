import { createClient } from '@supabase/supabase-js';
import { fetchNearbyPlaces, storePlacesInDatabase } from '../lib/places-service';

/**
 * Fetch places for major cities
 * Run this as a cron job daily to keep database populated
 * 
 * npx ts-node scripts/fetch-places.ts
 * 
 * Env vars needed:
 * - GOOGLE_PLACES_API_KEY
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Major US cities to pre-populate
const MAJOR_CITIES = [
  { name: 'Atlanta', state: 'GA', lat: 33.749, lng: -84.388 },
  { name: 'New York', state: 'NY', lat: 40.7128, lng: -74.006 },
  { name: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
  { name: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
  { name: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
  { name: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.074 },
  { name: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 },
  { name: 'San Antonio', state: 'TX', lat: 29.4241, lng: -98.4936 },
  { name: 'San Diego', state: 'CA', lat: 32.7157, lng: -117.1611 },
  { name: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.797 },
  { name: 'San Jose', state: 'CA', lat: 37.3382, lng: -121.8863 },
  { name: 'Jacksonville', state: 'FL', lat: 30.3322, lng: -81.6557 },
  { name: 'Indianapolis', state: 'IN', lat: 39.7684, lng: -86.1581 },
  { name: 'San Francisco', state: 'CA', lat: 37.7749, lng: -122.4194 },
  { name: 'Columbus', state: 'OH', lat: 39.9612, lng: -82.9988 },
  { name: 'Charlotte', state: 'NC', lat: 35.2271, lng: -80.8431 },
  { name: 'Fort Worth', state: 'TX', lat: 32.7555, lng: -97.3308 },
  { name: 'Detroit', state: 'MI', lat: 42.3314, lng: -83.0458 },
  { name: 'El Paso', state: 'TX', lat: 31.7619, lng: -106.485 },
  { name: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
  { name: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
  { name: 'Washington', state: 'DC', lat: 38.9072, lng: -77.0369 },
  { name: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589 },
  { name: 'Nashville', state: 'TN', lat: 36.1627, lng: -86.7816 },
  { name: 'Las Vegas', state: 'NV', lat: 36.1699, lng: -115.1398 },
];

async function fetchPlacesForAllCities() {
  console.log('Starting places fetch job...');
  console.log(`Processing ${MAJOR_CITIES.length} cities...`);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
  }

  if (!GOOGLE_PLACES_API_KEY) {
    console.error('Missing GOOGLE_PLACES_API_KEY!');
    console.log('Set it in your environment variables to fetch real places.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  let totalPlaces = 0;

  for (const city of MAJOR_CITIES) {
    console.log(`\nFetching places for ${city.name}, ${city.state}...`);

    try {
      // Check if we already have places for this area
      const { data: existing } = await supabase
        .from('sr_places')
        .select('id')
        .eq('state', city.state)
        .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Updated within 7 days
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`  ${city.name}: Already has recent data, skipping`);
        continue;
      }

      // Fetch from Google Places API
      const places = await fetchNearbyPlaces(city.lat, city.lng, 10000); // 10km radius

      if (places.length > 0) {
        // Store in database
        await storePlacesInDatabase(supabase, places, city.state);
        totalPlaces += places.length;
        console.log(`  ${city.name}: Stored ${places.length} places`);
      } else {
        console.log(`  ${city.name}: No places found`);
      }

      // Rate limiting - be nice to Google API
      await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
      console.error(`  Error processing ${city.name}:`, err);
    }
  }

  console.log(`\nFetch complete! Total places added/updated: ${totalPlaces}`);
}

// Run if called directly
if (require.main === module) {
  fetchPlacesForAllCities().catch(console.error);
}

export { fetchPlacesForAllCities, MAJOR_CITIES };
