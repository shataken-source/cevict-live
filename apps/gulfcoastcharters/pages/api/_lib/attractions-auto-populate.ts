/**
 * Auto-populate local attractions when a new boat/destination is added.
 *
 * Flow:
 *  1. Normalize the location string to a city key
 *  2. Check if we already have attractions for that location
 *  3. If not → seed from curated data + optionally fetch Google Places
 *  4. Link attractions to source (boat ID or WTV destination ID)
 *
 * Called from:
 *  - save-boat.ts (when new scraped boat is created)
 *  - WTV destination creation (future)
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ── Location normalization ───────────────────────────────────────────────────

const LOCATION_ALIASES: Record<string, string> = {
  'gulf shores': 'Gulf Shores, AL',
  'orange beach': 'Orange Beach, AL',
  'destin': 'Destin, FL',
  'panama city beach': 'Panama City Beach, FL',
  'panama city': 'Panama City Beach, FL',
  'pcb': 'Panama City Beach, FL',
  'pensacola': 'Pensacola, FL',
  'pensacola beach': 'Pensacola, FL',
  'fort walton beach': 'Fort Walton Beach, FL',
  'fort walton': 'Fort Walton Beach, FL',
  'navarre': 'Navarre, FL',
  'dauphin island': 'Dauphin Island, AL',
  'mobile': 'Mobile, AL',
  'biloxi': 'Biloxi, MS',
  'gulfport': 'Gulfport, MS',
  'grand isle': 'Grand Isle, LA',
  'galveston': 'Galveston, TX',
  'corpus christi': 'Corpus Christi, TX',
  'port aransas': 'Port Aransas, TX',
  'south padre island': 'South Padre Island, TX',
  'south padre': 'South Padre Island, TX',
  'clearwater': 'Clearwater, FL',
  'tampa': 'Tampa, FL',
  'key west': 'Key West, FL',
  'marathon': 'Marathon, FL',
  'islamorada': 'Islamorada, FL',
};

export function normalizeLocation(raw: string): string {
  if (!raw) return '';
  const lower = raw.toLowerCase().trim();

  // Direct alias match
  for (const [alias, normalized] of Object.entries(LOCATION_ALIASES)) {
    if (lower.includes(alias)) return normalized;
  }

  // If it has a state abbreviation, capitalize properly
  const match = lower.match(/^(.+?),?\s*(al|fl|ms|la|tx)$/i);
  if (match) {
    const city = match[1].trim().replace(/\b\w/g, c => c.toUpperCase());
    return `${city}, ${match[2].toUpperCase()}`;
  }

  // Last resort: title case
  return raw.trim().replace(/\b\w/g, c => c.toUpperCase());
}

// ── Curated seed attractions by location ─────────────────────────────────────

interface SeedAttraction {
  name: string;
  description: string;
  category: string;
  type: 'indoor' | 'outdoor' | 'both';
  price_range: string;
  duration: string;
  website: string | null;
  lat: number;
  lon: number;
}

const SEED_BY_LOCATION: Record<string, SeedAttraction[]> = {
  'Gulf Shores, AL': [
    { name: 'Gulf Coast Exploreum', description: 'Interactive science museum with hands-on exhibits', category: 'museum', type: 'indoor', price_range: '$', duration: '2-3 hours', website: 'https://www.exploreum.com', lat: 30.6954, lon: -88.0399 },
    { name: 'USS Alabama Battleship Memorial Park', description: 'Historic WWII battleship, submarine, and aircraft museum', category: 'museum', type: 'outdoor', price_range: '$$', duration: '2-3 hours', website: 'https://www.ussalabama.com', lat: 30.6818, lon: -88.0145 },
    { name: 'Gulf State Park', description: 'Beach, hiking trails, fishing pier, nature center, and zip line', category: 'park', type: 'outdoor', price_range: '$', duration: 'Full day', website: 'https://www.alapark.com/gulf-state-park', lat: 30.2468, lon: -87.6476 },
    { name: 'Alabama Gulf Coast Zoo', description: 'Zoological park with exotic animals, petting zoo, and animal encounters', category: 'entertainment', type: 'outdoor', price_range: '$$', duration: '2-3 hours', website: 'https://www.alabamagulfcoastzoo.com', lat: 30.2695, lon: -87.6845 },
    { name: 'Tanger Outlets Gulf Shores', description: 'Outlet shopping with 120+ brand-name stores', category: 'shopping', type: 'indoor', price_range: '$$', duration: '2-4 hours', website: 'https://www.tangeroutlet.com', lat: 30.2938, lon: -87.6267 },
    { name: 'Hugh S. Branyon Backcountry Trail', description: '15+ miles of paved trails through coastal forests and wetlands', category: 'park', type: 'outdoor', price_range: 'Free', duration: '1-3 hours', website: null, lat: 30.2633, lon: -87.6373 },
    { name: 'Gulf Shores Bowling Center', description: 'Bowling alley with arcade and billiards — great rainy day option', category: 'entertainment', type: 'indoor', price_range: '$', duration: '1-2 hours', website: null, lat: 30.2781, lon: -87.6868 },
  ],
  'Orange Beach, AL': [
    { name: 'The Wharf', description: 'Entertainment district with Ferris wheel, shopping, dining, and amphitheater', category: 'entertainment', type: 'both', price_range: '$$', duration: '3-5 hours', website: 'https://www.alwharf.com', lat: 30.2756, lon: -87.5836 },
    { name: 'Adventure Island', description: 'Go-karts, mini golf, bumper boats, and arcade', category: 'entertainment', type: 'both', price_range: '$$', duration: '2-3 hours', website: null, lat: 30.2844, lon: -87.5741 },
    { name: 'Coastal Arts Center of Orange Beach', description: 'Art gallery with classes, pottery, and exhibits', category: 'museum', type: 'indoor', price_range: '$', duration: '1-2 hours', website: null, lat: 30.2802, lon: -87.5691 },
    { name: 'LuLu\'s at Homeport Marina', description: 'Jimmy Buffett\'s sister\'s waterfront restaurant and entertainment complex', category: 'restaurant', type: 'both', price_range: '$$', duration: '2-3 hours', website: 'https://www.lulubuffett.com', lat: 30.2801, lon: -87.6347 },
  ],
  'Destin, FL': [
    { name: 'Destin History & Fishing Museum', description: 'Maritime heritage museum with fishing and boating history', category: 'museum', type: 'indoor', price_range: '$', duration: '1-2 hours', website: 'https://www.destinhistoryandfishingmuseum.org', lat: 30.3935, lon: -86.4958 },
    { name: 'Big Kahuna\'s Water Park', description: 'Water and adventure park with slides, lazy river, and mini golf', category: 'entertainment', type: 'outdoor', price_range: '$$$', duration: 'Full day', website: 'https://www.bigkahunas.com', lat: 30.3896, lon: -86.4638 },
    { name: 'Henderson Beach State Park', description: 'Pristine beach with nature trails and coastal dune habitat', category: 'park', type: 'outdoor', price_range: '$', duration: '3-5 hours', website: null, lat: 30.3758, lon: -86.4470 },
    { name: 'Destin Commons', description: 'Open-air shopping and dining center with movie theater and bowling', category: 'shopping', type: 'both', price_range: '$$', duration: '2-4 hours', website: 'https://www.destincommons.com', lat: 30.3908, lon: -86.4511 },
    { name: 'HarborWalk Village', description: 'Waterfront boardwalk with restaurants, shops, and live music', category: 'entertainment', type: 'both', price_range: '$$', duration: '2-4 hours', website: 'https://www.emeraldgrande.com/harborwalk-village', lat: 30.3928, lon: -86.5106 },
    { name: 'Wild Willy\'s Adventure Zone', description: 'Indoor fun park with mini golf, ropes course, and arcade', category: 'entertainment', type: 'indoor', price_range: '$$', duration: '2-3 hours', website: null, lat: 30.3901, lon: -86.4580 },
  ],
  'Panama City Beach, FL': [
    { name: 'WonderWorks', description: 'Indoor amusement park with 100+ interactive science exhibits', category: 'entertainment', type: 'indoor', price_range: '$$', duration: '2-3 hours', website: 'https://www.wonderworksonline.com', lat: 30.1766, lon: -85.8055 },
    { name: 'Ripley\'s Believe It or Not!', description: 'Odditorium with interactive exhibits and illusions', category: 'museum', type: 'indoor', price_range: '$$', duration: '1-2 hours', website: 'https://www.ripleys.com', lat: 30.1766, lon: -85.8055 },
    { name: 'Pier Park', description: 'Massive shopping, dining, and entertainment complex on the beach', category: 'shopping', type: 'both', price_range: '$$', duration: '3-5 hours', website: 'https://www.simon.com/mall/pier-park', lat: 30.1773, lon: -85.8119 },
    { name: 'St. Andrews State Park', description: 'Beaches, snorkeling, nature trails, and historic turpentine still', category: 'park', type: 'outdoor', price_range: '$', duration: 'Full day', website: null, lat: 30.1275, lon: -85.7375 },
    { name: 'Gulf World Marine Park', description: 'Marine park with dolphin shows, stingray touch pools, and sea lion encounters', category: 'marine', type: 'both', price_range: '$$$', duration: '3-4 hours', website: 'https://www.gulfworldmarinepark.com', lat: 30.1847, lon: -85.7893 },
    { name: 'Coconut Creek Family Fun Park', description: 'Mini golf courses and giant human maze', category: 'entertainment', type: 'outdoor', price_range: '$', duration: '1-2 hours', website: null, lat: 30.1894, lon: -85.7947 },
  ],
  'Pensacola, FL': [
    { name: 'National Naval Aviation Museum', description: 'Free museum with 150+ aircraft, IMAX theater, and Blue Angels history', category: 'museum', type: 'indoor', price_range: 'Free', duration: '3-5 hours', website: 'https://www.navalaviationmuseum.org', lat: 30.3530, lon: -87.2971 },
    { name: 'Pensacola Lighthouse & Maritime Museum', description: 'Historic 1859 lighthouse with panoramic views and maritime exhibits', category: 'museum', type: 'both', price_range: '$', duration: '1-2 hours', website: 'https://www.pensacolalighthouse.org', lat: 30.3463, lon: -87.3080 },
    { name: 'Fort Pickens', description: 'Historic Civil War-era fort on Gulf Islands National Seashore', category: 'park', type: 'outdoor', price_range: '$', duration: '2-3 hours', website: null, lat: 30.3264, lon: -87.2889 },
    { name: 'Sam\'s Fun City', description: 'Family amusement park with rides, mini golf, go-karts, and arcade', category: 'entertainment', type: 'both', price_range: '$$', duration: '3-5 hours', website: 'https://www.samsfuncity.com', lat: 30.4590, lon: -87.2375 },
    { name: 'Pensacola Museum of Art', description: 'Fine arts museum with rotating exhibitions and community programs', category: 'museum', type: 'indoor', price_range: '$', duration: '1-2 hours', website: 'https://www.pensacolamuseum.org', lat: 30.4139, lon: -87.2149 },
    { name: 'Cordova Mall', description: 'Major indoor shopping mall with department stores, dining, and cinema', category: 'shopping', type: 'indoor', price_range: '$$', duration: '2-4 hours', website: null, lat: 30.4659, lon: -87.2283 },
  ],
  'Galveston, TX': [
    { name: 'Moody Gardens', description: 'Aquarium Pyramid, Rainforest Pyramid, and Discovery Museum', category: 'entertainment', type: 'both', price_range: '$$$', duration: 'Full day', website: 'https://www.moodygardens.com', lat: 29.2682, lon: -94.8377 },
    { name: 'Schlitterbahn Waterpark', description: 'Major waterpark with slides, rivers, and wave pool', category: 'entertainment', type: 'outdoor', price_range: '$$$', duration: 'Full day', website: 'https://www.schlitterbahn.com', lat: 29.2869, lon: -94.7867 },
    { name: 'The Strand Historic District', description: 'Victorian architecture with shops, restaurants, and galleries', category: 'shopping', type: 'both', price_range: '$$', duration: '2-4 hours', website: null, lat: 29.3085, lon: -94.7942 },
    { name: 'Galveston Island State Park', description: 'Beaches, kayaking, bird watching, and nature trails', category: 'park', type: 'outdoor', price_range: '$', duration: '3-5 hours', website: null, lat: 29.2421, lon: -94.9228 },
  ],
  'Biloxi, MS': [
    { name: 'Beau Rivage Casino Resort', description: 'Full casino with shows, dining, spa, and golf', category: 'entertainment', type: 'indoor', price_range: '$$$', duration: '3-5 hours', website: 'https://www.beaurivage.com', lat: 30.3937, lon: -88.8878 },
    { name: 'Maritime & Seafood Industry Museum', description: 'Museum showcasing Biloxi\'s maritime heritage and seafood industry', category: 'museum', type: 'indoor', price_range: '$', duration: '1-2 hours', website: null, lat: 30.3935, lon: -88.8847 },
    { name: 'Ship Island Excursions', description: 'Ferry to barrier island with historic Fort Massachusetts and pristine beach', category: 'tour', type: 'outdoor', price_range: '$$', duration: 'Full day', website: 'https://www.msshipisland.com', lat: 30.3957, lon: -88.8897 },
  ],
};

// ── Google Places integration (optional) ─────────────────────────────────────

interface PlaceResult {
  name: string;
  description: string;
  category: string;
  type: 'indoor' | 'outdoor' | 'both';
  price_range: string;
  lat: number;
  lon: number;
  rating: number;
  google_place_id: string;
  website: string | null;
}

async function fetchGooglePlaces(lat: number, lon: number, apiKey: string): Promise<PlaceResult[]> {
  const types = ['tourist_attraction', 'museum', 'amusement_park', 'aquarium', 'bowling_alley', 'shopping_mall', 'zoo'];
  const results: PlaceResult[] = [];

  for (const placeType of types) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=24000&type=${placeType}&key=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const json = await res.json();

      for (const place of (json.results || []).slice(0, 5)) {
        if (!place.name || place.business_status === 'CLOSED_PERMANENTLY') continue;
        if ((place.rating || 0) < 3.5) continue; // only quality attractions

        const categoryMap: Record<string, string> = {
          tourist_attraction: 'entertainment', museum: 'museum', amusement_park: 'entertainment',
          aquarium: 'marine', bowling_alley: 'entertainment', shopping_mall: 'shopping', zoo: 'entertainment',
        };

        results.push({
          name: place.name,
          description: place.vicinity || '',
          category: categoryMap[placeType] || 'entertainment',
          type: ['museum', 'bowling_alley', 'shopping_mall'].includes(placeType) ? 'indoor' : 'both',
          price_range: place.price_level != null ? ['Free', '$', '$$', '$$$', '$$$$'][Math.min(place.price_level, 4)] : '$$',
          lat: place.geometry?.location?.lat || lat,
          lon: place.geometry?.location?.lng || lon,
          rating: place.rating || 0,
          google_place_id: place.place_id || '',
          website: null, // would need a details call for website
        });
      }
    } catch {
      // continue with next type
    }
  }

  // Deduplicate by name
  const seen = new Set<string>();
  return results.filter(r => {
    const key = r.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Main auto-populate function ──────────────────────────────────────────────

export async function autoPopulateAttractions(
  supabase: SupabaseClient,
  opts: {
    location: string;          // raw location string from boat or destination
    sourceBoatId?: string;     // scraped_boats.id
    sourceDestinationId?: string; // WTV destination id
    lat?: number;
    lon?: number;
  }
): Promise<{ inserted: number; location: string; source: string }> {
  const normalizedLocation = normalizeLocation(opts.location);
  if (!normalizedLocation) {
    return { inserted: 0, location: '', source: 'none' };
  }

  // Check if we already have attractions for this location
  const { count } = await supabase
    .from('local_attractions')
    .select('id', { count: 'exact', head: true })
    .eq('location', normalizedLocation);

  if (count && count > 0) {
    console.log(`[Attractions] Already have ${count} attractions for "${normalizedLocation}" — skipping`);
    return { inserted: 0, location: normalizedLocation, source: 'already_exists' };
  }

  let attractions: any[] = [];
  let source = 'seed';

  // 1. Try curated seed data first
  const seedData = SEED_BY_LOCATION[normalizedLocation];
  if (seedData && seedData.length > 0) {
    attractions = seedData.map(a => ({
      ...a,
      location: normalizedLocation,
      source: 'seed',
      source_boat_id: opts.sourceBoatId || null,
      source_destination_id: opts.sourceDestinationId || null,
      active: true,
    }));
    source = 'seed';
  }

  // 2. If no seed data AND we have lat/lon AND Google Places key, fetch from Google
  if (attractions.length === 0 && opts.lat && opts.lon) {
    const googleKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
    if (googleKey) {
      try {
        const places = await fetchGooglePlaces(opts.lat, opts.lon, googleKey);
        attractions = places.map(p => ({
          name: p.name,
          description: p.description,
          category: p.category,
          type: p.type,
          price_range: p.price_range,
          lat: p.lat,
          lon: p.lon,
          rating: p.rating,
          google_place_id: p.google_place_id,
          website: p.website,
          location: normalizedLocation,
          source: 'google_places',
          source_boat_id: opts.sourceBoatId || null,
          source_destination_id: opts.sourceDestinationId || null,
          active: true,
        }));
        source = 'google_places';
      } catch (err) {
        console.error('[Attractions] Google Places fetch failed:', err);
      }
    }
  }

  if (attractions.length === 0) {
    console.log(`[Attractions] No seed data or Google Places results for "${normalizedLocation}"`);
    return { inserted: 0, location: normalizedLocation, source: 'none' };
  }

  // Insert attractions (upsert to avoid duplicates)
  const { data, error } = await supabase
    .from('local_attractions')
    .upsert(attractions, { onConflict: 'lower(name), lower(location)', ignoreDuplicates: true })
    .select('id');

  if (error) {
    // If upsert with function-based conflict fails, try plain insert with ignore
    console.warn('[Attractions] Upsert failed, trying insert:', error.message);
    const { data: insertData, error: insertError } = await supabase
      .from('local_attractions')
      .insert(attractions)
      .select('id');

    if (insertError) {
      console.error('[Attractions] Insert also failed:', insertError.message);
      return { inserted: 0, location: normalizedLocation, source: 'error' };
    }
    const count = insertData?.length || 0;
    console.log(`[Attractions] Inserted ${count} attractions for "${normalizedLocation}" (source: ${source})`);
    return { inserted: count, location: normalizedLocation, source };
  }

  const inserted = data?.length || 0;
  console.log(`[Attractions] Inserted ${inserted} attractions for "${normalizedLocation}" (source: ${source})`);
  return { inserted, location: normalizedLocation, source };
}
