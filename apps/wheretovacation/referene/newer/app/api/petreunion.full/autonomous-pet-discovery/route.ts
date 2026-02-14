import { CITIES_BY_STATE, US_STATES } from '@/data/us-states-cities';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

let Resend: any = null;
try {
  const resendModule = require('resend');
  Resend = resendModule.Resend || resendModule.default?.Resend;
} catch (error) {
  console.log('[EMAIL] Resend not available for shelter emails');
}

/**
 * Parse location input and determine if it's a state or city
 * Returns: { isState: boolean, stateName?: string, stateCode?: string, city?: string, cities?: string[] }
 */
function parseLocation(location: string): {
  isState: boolean;
  stateName?: string;
  stateCode?: string;
  city?: string;
  cities?: string[];
} {
  // Check if it's a state name
  const state = US_STATES.find(s =>
    s.name.toLowerCase() === location.toLowerCase() ||
    s.code.toLowerCase() === location.toLowerCase()
  );

  if (state) {
    // It's a state - get all cities for that state
    const cities = CITIES_BY_STATE[state.name] || [];
    return {
      isState: true,
      stateName: state.name,
      stateCode: state.code,
      cities
    };
  }

  // Check if it's "City, State" format
  const parts = location.split(',').map(p => p.trim());
  if (parts.length === 2) {
    const city = parts[0];
    const stateNameOrCode = parts[1];
    const stateMatch = US_STATES.find(s =>
      s.name.toLowerCase() === stateNameOrCode.toLowerCase() ||
      s.code.toLowerCase() === stateNameOrCode.toLowerCase()
    );

    if (stateMatch) {
      return {
        isState: false,
        stateName: stateMatch.name,
        stateCode: stateMatch.code,
        city
      };
    }
  }

  // Assume it's a city name (unknown state)
  return {
    isState: false,
    city: location
  };
}

// API Credentials
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || '';
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || '';
const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID || '';
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN || '';
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || '';
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET || '';

// Unified Pet DTO
interface UnifiedPet {
  name: string;
  type: 'dog' | 'cat';
  breed: string;
  age?: string;
  gender?: string;
  size?: string;
  color?: string;
  photo_url?: string;
  description: string;
  status: 'lost' | 'found';
  location_city: string;
  location_state: string;
  location_zipcode?: string; // ZIP code for matching
  source: 'facebook' | 'instagram' | 'twitter';
  source_url?: string;
  source_post_id?: string;
  shelter_id?: string;
  shelter_name?: string;
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
  discovered_at: string;
}

interface DiscoveryResult {
  source: 'facebook' | 'instagram' | 'twitter' | 'zip_codes';
  petsFound: number;
  petsSaved: number;
  petsNew: number;
  petsUpdated: number;
  errors: string[];
  duration: number;
}

interface DiscoverySummary {
  totalFound: number;
  totalSaved: number;
  totalNew: number;
  totalUpdated: number;
  totalDeleted: number;
  totalErrors: number;
  totalMatches: number;
  totalMatchesSaved: number;
  duration: number;
  sources: DiscoveryResult[];
}

interface PetMatch {
  lostPetId: string;
  foundPetId: string;
  matchScore: number;
  reasons: string[];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const EMAIL_DELAY_MS = 5000;
let shelterEmailQueue: Array<{ shelter: { id: string; shelter_name: string; email: string; city?: string; state?: string; zipcode?: string }; resolve: () => void; reject: (error: any) => void }> = [];
let isProcessingShelterEmails = false;

async function processShelterEmailQueue() {
  if (isProcessingShelterEmails || shelterEmailQueue.length === 0) {
    return;
  }

  isProcessingShelterEmails = true;

  while (shelterEmailQueue.length > 0) {
    const { shelter, resolve, reject } = shelterEmailQueue.shift()!;
    try {
      await sendShelterWelcomeEmail(shelter);
      resolve();
    } catch (error) {
      reject(error);
    }
    if (shelterEmailQueue.length > 0) {
      await sleep(EMAIL_DELAY_MS);
    }
  }

  isProcessingShelterEmails = false;
}

async function queueShelterWelcomeEmail(shelter: { id: string; shelter_name: string; email: string; city?: string; state?: string; zipcode?: string }) {
  if (!shelter.email) return;
  return new Promise<void>((resolve, reject) => {
    shelterEmailQueue.push({ shelter, resolve, reject });
    processShelterEmailQueue();
  });
}

async function sendShelterWelcomeEmail(shelter: { shelter_name: string; email: string; city?: string; state?: string; zipcode?: string }) {
  if (!Resend) return;
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.log('[EMAIL] RESEND_API_KEY not configured, skipping shelter welcome email');
    return;
  }

  const resend = new Resend(resendApiKey);
  const baseUrl = process.env.NEXT_PUBLIC_PETREUNION_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://petreunion-final.vercel.app';
  const shelterPortal = `${baseUrl}/shelter/login`;
  const locationLine = shelter.city ? `${shelter.city}, ${shelter.state || ''}` : 'your area';

  const subject = `${shelter.shelter_name} — Shelter pets added to PetReunion`;
  const textBody = `Hello ${shelter.shelter_name},

We just added the dogs and cats discovered near ${locationLine} to the nationwide PetReunion database.

To view and manage these pets, create or log into your shelter account:
${shelterPortal}

In the portal you can:
- Review and update each pet we scraped for you
- Publish pets instantly with new photos/descriptions
- Manage adoptions and respond to interested families
- Track your full inventory across the PetReunion network

Thank you for partnering with PetReunion to help these animals find homes!

PetReunion Team`;

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'PetReunion <onboarding@resend.dev>',
    to: [shelter.email],
    subject,
    text: textBody,
    replyTo: process.env.RESEND_REPLY_TO || 'support@petreunion.org',
    headers: {
      'X-Entity-Ref-ID': `shelter-${shelter.zipcode || 'unknown'}-${Date.now()}`
    }
  });
}

// Normalize pet data from different sources to unified format
function normalizePet(pet: any, source: 'facebook' | 'instagram' | 'twitter', shelterId?: string, shelterName?: string): UnifiedPet {
  return {
    name: pet.name || pet.pet_name || 'Unknown',
    type: (pet.type || pet.pet_type || 'dog').toLowerCase() === 'cat' ? 'cat' : 'dog',
    breed: pet.breed || 'Mixed Breed',
    age: pet.age || undefined,
    gender: pet.gender || undefined,
    size: pet.size || 'medium',
    color: pet.color || 'Unknown',
    photo_url: pet.photo_url || pet.photo || undefined,
    description: pet.description || pet.text || '',
    status: pet.status || 'found',
    location_city: pet.location_city || pet.city || 'Unknown',
    location_state: pet.location_state || pet.state || '',
    location_zipcode: pet.location_zipcode || pet.location_zip || undefined,
    source,
    source_url: pet.source_url || pet.post_url || pet.url || undefined,
    source_post_id: pet.facebook_post_id || pet.instagram_post_id || pet.tweet_id || undefined,
    shelter_id: shelterId,
    shelter_name: shelterName,
    owner_name: pet.owner_name || 'Community',
    owner_phone: pet.owner_phone || undefined,
    owner_email: pet.owner_email || undefined,
    discovered_at: new Date().toISOString()
  };
}

// ============================================
// FACEBOOK SCRAPER (Reuse Existing)
// ============================================

async function scrapeFacebook(location: string, maxPets: number = 100, zipCode?: string): Promise<UnifiedPet[]> {
  const startTime = Date.now();
  const pets: UnifiedPet[] = [];

  try {
    // Call the existing Facebook scraper API
    const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://petreunion-final.vercel.app';
    const response = await fetch(`${apiUrl}/api/petreunion/scrape-facebook-bulletproof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location,
        maxPets,
        strategies: ['graph-api', 'browser']
      }),
      signal: AbortSignal.timeout(120000) // 2 minute timeout
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[FACEBOOK] Scraper API returned ${response.status}: ${errorText}`);
      return pets; // Return empty array instead of throwing
    }

    const data = await response.json();

    // The scraper saves pets to database and returns summary
    // We need to query the database for the newly saved pets
    if (supabase && data.summary && data.summary.totalSaved > 0) {
      const loc = parseLocation(location);

      // Query for recently saved pets (within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      let query = supabase
        .from('lost_pets')
        .select('*')
        .gte('created_at', fiveMinutesAgo)
        .or('description.ilike.%facebook%,facebook_post_id.not.is.null')
        .order('created_at', { ascending: false })
        .limit(maxPets);

      // Filter by location
      if (loc.isState && loc.stateCode) {
        query = query.eq('location_state', loc.stateCode);
      } else if (loc.city && loc.stateCode) {
        query = query.eq('location_state', loc.stateCode)
                     .ilike('location_city', `%${loc.city}%`);
      } else if (loc.city) {
        query = query.ilike('location_city', `%${loc.city}%`);
      }

      const { data: recentPets, error } = await query;

      if (!error && recentPets) {
        for (const pet of recentPets) {
          const normalized = normalizePet(pet, 'facebook');
          if (zipCode) {
            normalized.location_zipcode = zipCode;
          }
          pets.push(normalized);
        }
        console.log(`[FACEBOOK] Found ${pets.length} newly scraped pets from database`);
      } else if (error) {
        console.error(`[FACEBOOK] Error querying database:`, error.message);
      }
    } else {
      console.log(`[FACEBOOK] Scraper found ${data.summary?.totalFound || 0} pets, saved ${data.summary?.totalSaved || 0}`);
    }

    console.log(`[FACEBOOK] Returning ${pets.length} pets`);
  } catch (error: any) {
    console.error(`[FACEBOOK] Error:`, error.message);
    // Don't throw - return empty array so other scrapers can continue
  }

  return pets;
}

// ============================================
// INSTAGRAM SCRAPER
// ============================================

async function scrapeInstagram(location: string, maxPets: number = 100, zipCode?: string): Promise<UnifiedPet[]> {
  const startTime = Date.now();
  const pets: UnifiedPet[] = [];

  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_ACCOUNT_ID) {
    console.log('[INSTAGRAM] API credentials not configured - skipping');
    return pets;
  }

  try {
    const loc = parseLocation(location);
    const hashtags: string[] = [];

    if (loc.isState && loc.cities) {
      // Search all cities in the state
      console.log(`[INSTAGRAM] Searching ${loc.cities.length} cities in ${loc.stateName}...`);
      for (const city of loc.cities.slice(0, 10)) { // Limit to 10 cities to avoid rate limits
        const cityLower = city.toLowerCase().replace(/\s+/g, '');
        hashtags.push(
          `#lostdog${cityLower}`,
          `#lostcat${cityLower}`,
          `#founddog${cityLower}`,
          `#foundcat${cityLower}`
        );
      }
    } else if (loc.city) {
      // Search specific city
      const cityLower = loc.city.toLowerCase().replace(/\s+/g, '');
      hashtags.push(
        `#lostdog${cityLower}`,
        `#lostcat${cityLower}`,
        `#lostpet${cityLower}`,
        `#missingdog${cityLower}`,
        `#missingcat${cityLower}`,
        `#founddog${cityLower}`,
        `#foundcat${cityLower}`
      );
    }

    // Add generic hashtags
    hashtags.push('#lostdog', '#lostcat', '#lostpet', '#missingdog', '#missingcat');

    console.log(`[INSTAGRAM] Searching ${hashtags.length} hashtags for ${location}...`);

    // Instagram Graph API - Search for hashtags
    for (const hashtag of hashtags.slice(0, 5)) { // Limit to 5 hashtags to avoid rate limits
      if (pets.length >= maxPets) break;

      try {
        const hashtagName = hashtag.replace('#', '');
        // Get hashtag ID
        const hashtagSearchUrl = `https://graph.facebook.com/v18.0/ig_hashtag_search?user_id=${INSTAGRAM_ACCOUNT_ID}&q=${encodeURIComponent(hashtagName)}&access_token=${INSTAGRAM_ACCESS_TOKEN}`;

        const searchResponse = await fetch(hashtagSearchUrl, {
          signal: AbortSignal.timeout(10000)
        });

        if (!searchResponse.ok) {
          console.log(`[INSTAGRAM] Hashtag search failed for ${hashtag}: ${searchResponse.status}`);
          continue;
        }

        const searchData = await searchResponse.json();
        const hashtagId = searchData.data?.[0]?.id;

        if (!hashtagId) continue;

        // Get recent media for hashtag
        const mediaUrl = `https://graph.facebook.com/v18.0/${hashtagId}/recent_media?user_id=${INSTAGRAM_ACCOUNT_ID}&access_token=${INSTAGRAM_ACCESS_TOKEN}&limit=10&fields=id,caption,media_type,media_url,permalink,timestamp,username`;

        const mediaResponse = await fetch(mediaUrl, {
          signal: AbortSignal.timeout(10000)
        });

        if (!mediaResponse.ok) continue;

        const mediaData = await mediaResponse.json();

        if (mediaData.data && Array.isArray(mediaData.data)) {
          for (const media of mediaData.data) {
            if (pets.length >= maxPets) break;

            const caption = media.caption || '';
            const captionLower = caption.toLowerCase();

            // Check if it's about lost/found pets
            if (!captionLower.includes('lost') && !captionLower.includes('missing') &&
                !captionLower.includes('found') && !captionLower.includes('dog') &&
                !captionLower.includes('cat') && !captionLower.includes('pet')) {
              continue;
            }

            const pet: UnifiedPet = {
              name: extractNameFromText(caption) || 'Unknown',
              type: captionLower.includes('cat') || captionLower.includes('kitten') ? 'cat' : 'dog',
              breed: extractBreedFromText(caption) || 'Mixed Breed',
              description: caption.substring(0, 500),
              status: captionLower.includes('lost') || captionLower.includes('missing') ? 'lost' : 'found',
              location_city: loc.city || 'Unknown',
              location_state: loc.stateCode || '',
              location_zipcode: zipCode,
              source: 'instagram',
              source_url: media.permalink || `https://instagram.com/p/${media.id}`,
              source_post_id: media.id,
              photo_url: media.media_url || undefined,
              owner_name: media.username || 'Instagram User',
              discovered_at: new Date().toISOString()
            };

            pets.push(pet);
          }
        }

        await sleep(2000); // Rate limiting
      } catch (error: any) {
        console.error(`[INSTAGRAM] Error searching ${hashtag}:`, error.message);
      }
    }

    console.log(`[INSTAGRAM] Found ${pets.length} pets`);
  } catch (error: any) {
    console.error(`[INSTAGRAM] Error:`, error.message);
  }

  return pets;
}

// ============================================
// TWITTER SCRAPER
// ============================================

async function scrapeTwitter(location: string, maxPets: number = 100, zipCode?: string): Promise<UnifiedPet[]> {
  const startTime = Date.now();
  const pets: UnifiedPet[] = [];

  if (!TWITTER_BEARER_TOKEN) {
    console.log('[TWITTER] API credentials not configured - skipping');
    return pets;
  }

  try {
    const loc = parseLocation(location);
    const queries: string[] = [];

    if (loc.isState && loc.cities && loc.stateCode) {
      // Search all cities in the state
      console.log(`[TWITTER] Searching ${loc.cities.length} cities in ${loc.stateName}...`);
      for (const city of loc.cities.slice(0, 10)) { // Limit to 10 cities to avoid rate limits
        queries.push(
          `lost dog ${city} ${loc.stateCode}`,
          `lost cat ${city} ${loc.stateCode}`,
          `found dog ${city} ${loc.stateCode}`,
          `found cat ${city} ${loc.stateCode}`
        );
      }
    } else if (loc.city) {
      // Search specific city
      const statePart = loc.stateCode ? ` ${loc.stateCode}` : '';
      queries.push(
        `lost dog ${loc.city}${statePart}`,
        `lost cat ${loc.city}${statePart}`,
        `missing dog ${loc.city}`,
        `missing cat ${loc.city}`,
        `found dog ${loc.city}`,
        `found cat ${loc.city}`,
        `#lostdog ${loc.city}`,
        `#lostcat ${loc.city}`,
        `#lostpet ${loc.city}`
      );
    }

    console.log(`[TWITTER] Searching ${queries.length} queries for ${location}...`);

    // Twitter API v2 - Search tweets
    for (const query of queries.slice(0, 5)) { // Limit to 5 queries
      if (pets.length >= maxPets) break;

      try {
        const searchUrl = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=10&tweet.fields=created_at,author_id,text,entities&expansions=author_id`;

        const response = await fetch(searchUrl, {
          headers: {
            'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!response.ok) {
          console.log(`[TWITTER] Search failed for "${query}": ${response.status}`);
          continue;
        }

        const data = await response.json();

        if (data.data && Array.isArray(data.data)) {
          for (const tweet of data.data) {
            if (pets.length >= maxPets) break;

            const text = tweet.text || '';
            const textLower = text.toLowerCase();

            // Check if tweet is about lost/found pets
            if (!textLower.includes('lost') && !textLower.includes('missing') &&
                !textLower.includes('found') && !textLower.includes('dog') &&
                !textLower.includes('cat') && !textLower.includes('pet')) {
              continue;
            }

            // Extract pet info from tweet
            // Try to extract city from tweet text, fallback to search city
            const extractedCity = extractCityFromText(text) || loc.city || 'Unknown';
            const extractedState = loc.stateCode || loc.stateName || '';

            const pet: UnifiedPet = {
              name: extractNameFromText(text) || 'Unknown',
              type: textLower.includes('cat') || textLower.includes('kitten') ? 'cat' : 'dog',
              breed: extractBreedFromText(text) || 'Mixed Breed',
              description: text.substring(0, 500),
              status: textLower.includes('lost') || textLower.includes('missing') ? 'lost' : 'found',
              location_city: extractedCity,
              location_state: extractedState,
              location_zipcode: zipCode,
              source: 'twitter',
              source_url: `https://twitter.com/i/web/status/${tweet.id}`,
              source_post_id: tweet.id,
              owner_name: 'Twitter User',
              discovered_at: new Date().toISOString()
            };

            pets.push(pet);
          }
        }

        await sleep(1000); // Rate limiting
      } catch (error: any) {
        console.error(`[TWITTER] Error searching "${query}":`, error.message);
      }
    }

    console.log(`[TWITTER] Found ${pets.length} pets`);
  } catch (error: any) {
    console.error(`[TWITTER] Error:`, error.message);
  }

  return pets;
}

// Helper functions for text extraction
function extractNameFromText(text: string): string | null {
  const patterns = [
    /(?:lost|found|missing)\s+(?:dog|cat|puppy|kitten)\s+(?:named|called)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:dog|cat|puppy|kitten)\s+(?:named|called)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /name[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractBreedFromText(text: string): string | null {
  const breedPatterns = [
    /breed[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(Labrador|Golden|German Shepherd|Pit Bull|Beagle|Boxer|Bulldog|Poodle|Chihuahua|Dachshund|Husky|Retriever|Terrier|Spaniel|Mix|Mixed)/i
  ];

  for (const pattern of breedPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractCityFromText(text: string): string | null {
  // Common patterns for city mentions in pet posts
  const cityPatterns = [
    /(?:in|near|at|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /([A-Z][a-z]+),?\s+(?:AL|FL|GA|TX|MS|LA|TN|AR|OK|KY|MO|IL|IN|OH|MI|WI|MN|IA|ND|SD|NE|KS|CO|WY|MT|ID|UT|NV|AZ|NM|CA|OR|WA|AK|HI|ME|NH|VT|MA|RI|CT|NY|NJ|PA|DE|MD|VA|WV|NC|SC|DC)/i
  ];

  for (const pattern of cityPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const city = match[1].trim();
      // Filter out common false positives
      if (!['Lost', 'Found', 'Missing', 'Dog', 'Cat', 'Pet'].includes(city)) {
        return city;
      }
    }
  }

  return null;
}

// ============================================
// SHELTER INVENTORY DIFFING
// ============================================

async function diffShelterInventory(
  shelterId: string,
  discoveredPets: UnifiedPet[]
): Promise<{ newPets: UnifiedPet[]; deletedPets: any[] }> {
  const newPets: UnifiedPet[] = [];
  const deletedPets: any[] = [];

  if (!supabase || !shelterId) {
    return { newPets, deletedPets };
  }

  try {
    // Get existing pets for this shelter
    const { data: existingPets, error } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('shelter_id', shelterId)
      .in('status', ['lost', 'found']);

    if (error) {
      console.error(`[DIFF] Error fetching existing pets:`, error.message);
      return { newPets, deletedPets };
    }

    const existingPetMap = new Map<string, any>();
    if (existingPets) {
      for (const pet of existingPets) {
        // Use source_post_id as key if available, otherwise use name+location
        const key = pet.facebook_post_id ||
                   pet.instagram_post_id ||
                   pet.twitter_post_id ||
                   `${pet.pet_name}_${pet.location_city}_${pet.status}`;
        existingPetMap.set(key, pet);
      }
    }

    // Find new pets
    for (const discoveredPet of discoveredPets) {
      const key = discoveredPet.source_post_id ||
                 `${discoveredPet.name}_${discoveredPet.location_city}_${discoveredPet.status}`;

      if (!existingPetMap.has(key)) {
        newPets.push(discoveredPet);
      }
    }

    // Find deleted pets (pets that exist in DB but not in discovered list)
    const discoveredKeys = new Set(
      discoveredPets.map(p => p.source_post_id || `${p.name}_${p.location_city}_${p.status}`)
    );

    if (existingPets) {
      for (const existingPet of existingPets) {
        const key = existingPet.facebook_post_id ||
                   existingPet.instagram_post_id ||
                   existingPet.twitter_post_id ||
                   `${existingPet.pet_name}_${existingPet.location_city}_${existingPet.status}`;

        if (!discoveredKeys.has(key)) {
          deletedPets.push(existingPet);
        }
      }
    }

    console.log(`[DIFF] Shelter ${shelterId}: ${newPets.length} new, ${deletedPets.length} deleted`);
  } catch (error: any) {
    console.error(`[DIFF] Error:`, error.message);
  }

  return { newPets, deletedPets };
}

// ============================================
// SAVE PETS TO DATABASE
// ============================================

async function savePets(pets: UnifiedPet[]): Promise<{ saved: number; skipped: number; errors: string[]; savedIds: string[] }> {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  let saved = 0;
  let skipped = 0;
  const errors: string[] = [];
  const savedIds: string[] = [];

  for (const pet of pets) {
    try {
      // Check for duplicates by source_post_id
      if (pet.source_post_id) {
        const sourceField = pet.source === 'facebook' ? 'facebook_post_id' :
                          pet.source === 'instagram' ? 'instagram_post_id' :
                          'twitter_post_id';

        const { data: existing } = await supabase
          .from('lost_pets')
          .select('id')
          .eq(sourceField, pet.source_post_id)
          .maybeSingle();

        if (existing) {
          skipped++;
          // Still track ID if it's a found pet for matching
          if (pet.status === 'found' && existing.id) {
            savedIds.push(existing.id);
          }
          continue;
        }
      }

      // Prepare insert data
      const insertData: any = {
        pet_name: pet.name,
        pet_type: pet.type,
        breed: pet.breed,
        color: pet.color || 'Unknown',
        size: pet.size || 'medium',
        description: pet.description || `Found via ${pet.source} scraper`,
        photo_url: pet.photo_url || null,
        status: pet.status,
        location_city: pet.location_city || 'Unknown',
        location_state: pet.location_state || '',
        location_zipcode: pet.location_zipcode || null,
        date_lost: new Date().toISOString().split('T')[0],
        owner_name: pet.owner_name || 'Community',
        owner_email: pet.owner_email || null,
        owner_phone: pet.owner_phone || null,
        shelter_id: pet.shelter_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add source-specific post ID
      if (pet.source_post_id) {
        if (pet.source === 'facebook') {
          insertData.facebook_post_id = pet.source_post_id;
        } else if (pet.source === 'instagram') {
          // Note: May need to add instagram_post_id column
          // insertData.instagram_post_id = pet.source_post_id;
        } else if (pet.source === 'twitter') {
          // Note: May need to add twitter_post_id column
          // insertData.twitter_post_id = pet.source_post_id;
        }
      }

      const { data: insertedData, error: insertError } = await supabase
        .from('lost_pets')
        .insert(insertData)
        .select('id')
        .single();

      if (insertError) {
        errors.push(`Error saving ${pet.name}: ${insertError.message}`);
      } else {
        saved++;
        // Track ID if it's a found pet for matching
        if (pet.status === 'found' && insertedData?.id) {
          savedIds.push(insertedData.id);
        }
      }
    } catch (error: any) {
      errors.push(`Exception saving ${pet.name}: ${error.message}`);
    }
  }

  return { saved, skipped, errors, savedIds };
}

// ============================================
// MARK DELETED PETS AS RECOVERED
// ============================================

async function markPetsAsRecovered(pets: any[]): Promise<number> {
  if (!supabase || pets.length === 0) {
    return 0;
  }

  let marked = 0;

  for (const pet of pets) {
    try {
      const { error } = await supabase
        .from('lost_pets')
        .update({
          status: 'reunited',
          updated_at: new Date().toISOString()
        })
        .eq('id', pet.id);

      if (!error) {
        marked++;
      }
    } catch (error: any) {
      console.error(`[MARK] Error marking pet ${pet.id}:`, error.message);
    }
  }

  return marked;
}

// ============================================
// PET MATCHING - Match Found Pets to Lost Pets
// ============================================

// Normalize text for comparison
function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s]/g, '');
}

// Calculate match score between lost and found pet
function calculateMatchScore(lostPet: any, foundPet: any): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Type match (required) - 20 points
  if (lostPet.pet_type === foundPet.pet_type) {
    score += 20;
    reasons.push(`Same type: ${lostPet.pet_type}`);
  } else {
    return { score: 0, reasons: ['Different pet types'] }; // No match if different types
  }

  // Breed match - 30 points
  const lostBreed = normalizeText(lostPet.breed || '');
  const foundBreed = normalizeText(foundPet.breed || '');

  if (lostBreed === foundBreed) {
    score += 30;
    reasons.push(`Exact breed match: ${lostPet.breed}`);
  } else if (lostBreed.includes(foundBreed) || foundBreed.includes(lostBreed)) {
    score += 20;
    reasons.push(`Partial breed match: ${lostPet.breed} / ${foundPet.breed}`);
  } else if (lostBreed.includes('mix') || foundBreed.includes('mix') ||
             lostBreed.includes('mixed') || foundBreed.includes('mixed')) {
    score += 10;
    reasons.push('Mixed breed - possible match');
  }

  // Color match - 20 points
  const lostColor = normalizeText(lostPet.color || '');
  const foundColor = normalizeText(foundPet.color || '');

  if (lostColor === foundColor && lostColor !== 'n/a' && lostColor !== 'unknown') {
    score += 20;
    reasons.push(`Color match: ${lostPet.color}`);
  } else if (lostColor && foundColor &&
             (lostColor.includes(foundColor) || foundColor.includes(lostColor))) {
    score += 10;
    reasons.push(`Partial color match: ${lostPet.color} / ${foundPet.color}`);
  }

  // Size match - 15 points
  if (lostPet.size === foundPet.size && lostPet.size) {
    score += 15;
    reasons.push(`Size match: ${lostPet.size}`);
  }

  // Location proximity - 15 points
  // Handle pets with no city listed - use state-level matching
  const lostCity = lostPet.location_city && lostPet.location_city !== 'Unknown' ? lostPet.location_city : null;
  const foundCity = foundPet.location_city && foundPet.location_city !== 'Unknown' ? foundPet.location_city : null;
  const stateMatch = lostPet.location_state === foundPet.location_state && lostPet.location_state;

  if (lostCity && foundCity) {
    // Both have cities - exact match
    const cityMatch = normalizeText(lostCity) === normalizeText(foundCity);
    if (cityMatch && stateMatch) {
      score += 15;
      reasons.push(`Same city: ${lostCity}, ${lostPet.location_state}`);
    } else if (stateMatch) {
      score += 8;
      reasons.push(`Same state: ${lostPet.location_state}`);
    }
  } else if (stateMatch) {
    // At least one has no city, but states match - give partial credit
    score += 8;
    reasons.push(`Same state: ${lostPet.location_state} (city info missing for one or both)`);
  } else if (lostCity || foundCity) {
    // One has city, one doesn't - minimal credit if states match
    if (stateMatch) {
      score += 5;
      reasons.push(`Same state: ${lostPet.location_state} (incomplete location data)`);
    }
  }

  // Description keywords - 10 points
  const lostDesc = normalizeText(lostPet.description || '');
  const foundDesc = normalizeText(foundPet.description || '');

  const lostKeywords = lostDesc.split(/\s+/).filter(w => w.length > 3);
  const foundKeywords = foundDesc.split(/\s+/).filter(w => w.length > 3);
  const commonKeywords = lostKeywords.filter(k => foundKeywords.includes(k));

  if (commonKeywords.length > 0) {
    score += Math.min(commonKeywords.length * 2, 10);
    reasons.push(`Shared keywords: ${commonKeywords.slice(0, 3).join(', ')}`);
  }

  // Markings match - 10 points
  if (lostPet.markings && foundPet.markings) {
    const lostMarkings = normalizeText(lostPet.markings);
    const foundMarkings = normalizeText(foundPet.markings);

    if (lostMarkings === foundMarkings) {
      score += 10;
      reasons.push('Markings match');
    } else if (lostMarkings && foundMarkings &&
               (lostMarkings.includes(foundMarkings) || foundMarkings.includes(lostMarkings))) {
      score += 5;
      reasons.push('Partial markings match');
    }
  }

  // Date proximity - 5 points (if found within 30 days of lost)
  if (lostPet.date_lost && foundPet.date_lost) {
    const lostDate = new Date(lostPet.date_lost);
    const foundDate = new Date(foundPet.date_lost);
    const daysDiff = Math.abs((foundDate.getTime() - lostDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 7) {
      score += 5;
      reasons.push(`Found within 7 days of lost date`);
    } else if (daysDiff <= 30) {
      score += 3;
      reasons.push(`Found within 30 days of lost date`);
    }
  }

  return { score: Math.min(score, 100), reasons };
}

// Match newly found pets against lost pets in database
async function matchFoundPets(foundPetIds: string[], minScore: number = 60): Promise<{ matches: PetMatch[]; saved: number; errors: number }> {
  if (!supabase || foundPetIds.length === 0) {
    return { matches: [], saved: 0, errors: 0 };
  }

  try {
    // Get the found pets we just saved
    const { data: foundPets, error: foundError } = await supabase
      .from('lost_pets')
      .select('*')
      .in('id', foundPetIds)
      .eq('status', 'found');

    if (foundError || !foundPets || foundPets.length === 0) {
      console.log(`[MATCH] No found pets to match`);
      return { matches: [], saved: 0, errors: 0 };
    }

    // Get all lost pets (status = 'lost')
    const { data: lostPets, error: lostError } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('status', 'lost')
      .limit(1000); // Limit to prevent performance issues

    if (lostError || !lostPets || lostPets.length === 0) {
      console.log(`[MATCH] No lost pets to match against`);
      return { matches: [], saved: 0, errors: 0 };
    }

    console.log(`[MATCH] Matching ${foundPets.length} found pets against ${lostPets.length} lost pets...`);

    const matches: PetMatch[] = [];

    // Compare each found pet with each lost pet
    for (const foundPet of foundPets) {
      for (const lostPet of lostPets) {
        const { score, reasons } = calculateMatchScore(lostPet, foundPet);

        if (score >= minScore) {
          matches.push({
            lostPetId: lostPet.id,
            foundPetId: foundPet.id,
            matchScore: score,
            reasons
          });
        }
      }
    }

    // Sort by match score (highest first)
    matches.sort((a, b) => b.matchScore - a.matchScore);

    console.log(`[MATCH] Found ${matches.length} potential matches (score >= ${minScore})`);

    // Save matches to database
    let saved = 0;
    let errors = 0;

    for (const match of matches) {
      try {
        // Check if match already exists
        const { data: existing } = await supabase
          .from('pet_matches')
          .select('id')
          .eq('lost_pet_id', match.lostPetId)
          .eq('found_pet_id', match.foundPetId)
          .maybeSingle();

        if (existing) {
          // Update existing match with new score
          const { error: updateError } = await supabase
            .from('pet_matches')
            .update({
              match_score: match.matchScore,
              match_reasons: match.reasons,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (updateError) {
            errors++;
          } else {
            saved++;
          }
        } else {
          // Create new match
          const { error: insertError } = await supabase
            .from('pet_matches')
            .insert({
              lost_pet_id: match.lostPetId,
              found_pet_id: match.foundPetId,
              match_score: match.matchScore,
              match_reasons: match.reasons,
              status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error(`[MATCH] Error saving match:`, insertError.message);
            errors++;
          } else {
            saved++;
          }
        }
      } catch (error: any) {
        console.error(`[MATCH] Error processing match:`, error.message);
        errors++;
      }
    }

    console.log(`[MATCH] Saved ${saved} matches, ${errors} errors`);

    return { matches, saved, errors };
  } catch (error: any) {
    console.error(`[MATCH] Matching error:`, error.message);
    return { matches: [], saved: 0, errors: 1 };
  }
}

// ============================================
// MAIN API HANDLER
// ============================================

/**
 * Get ZIP codes that need to be scraped (oldest last_scraped_at or never scraped)
 */
async function getZipCodesToScrape(limit: number = 5): Promise<Array<{ zip_code: string; city: string; state: string; state_code: string; latitude: number | null; longitude: number | null }>> {
  if (!supabase) {
    return [];
  }

  try {
    // Get ZIP codes ordered by last_scraped_at (NULL first = never scraped)
    // Prioritize by priority, then by last_scraped_at
    const { data, error } = await supabase
      .from('zip_codes')
      .select('zip_code, city, state, state_code, latitude, longitude')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .order('last_scraped_at', { ascending: true, nullsFirst: true })
      .limit(limit);

    if (error) {
      console.error('[ZIP CODES] Error fetching ZIP codes:', error);
      return [];
    }

    return data || [];
  } catch (error: any) {
    console.error('[ZIP CODES] Error:', error.message);
    return [];
  }
}

async function getZipCodesNearCity(
  city: string,
  stateCode?: string,
  radiusMiles: number = 25
): Promise<Array<{ zip_code: string; city: string; state: string; state_code: string; latitude: number | null; longitude: number | null }>> {
  if (!supabase) {
    return [];
  }

  const normalizedCity = city.trim();

  try {
    let query = supabase
      .from('zip_codes')
      .select('zip_code, city, state, state_code, latitude, longitude')
      .ilike('city', normalizedCity)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(1);

    if (stateCode) {
      query = query.eq('state_code', stateCode);
    }

    const { data, error } = await query;

    if (!data || data.length === 0) {
      console.error(`[ZIP CODES] No center ZIP found for ${city}${stateCode ? `, ${stateCode}` : ''}`);
      if (error) console.error('[ZIP CODES] details:', error.message);
      return [];
    }

    const center = data[0];
    const surrounding = await findSurroundingZipCodes(
      center.zip_code,
      center.latitude,
      center.longitude,
      radiusMiles
    );

    return [
      {
        zip_code: center.zip_code,
        city: center.city,
        state: center.state,
        state_code: center.state_code,
        latitude: center.latitude,
        longitude: center.longitude
      },
      ...surrounding
    ];
  } catch (error: any) {
    console.error('[ZIP CODES] Error finding focus ZIP codes:', error.message);
    return [];
  }
}

/**
 * Find surrounding ZIP codes within a radius (in miles)
 * Uses Haversine formula to calculate distance
 */
async function findSurroundingZipCodes(
  centerZip: string,
  centerLat: number | null,
  centerLon: number | null,
  radiusMiles: number = 100
): Promise<Array<{ zip_code: string; city: string; state: string; state_code: string; distance: number; latitude: number | null; longitude: number | null }>> {
  if (!supabase || !centerLat || !centerLon) {
    return [];
  }

  try {
    // Get all ZIP codes with coordinates
    const { data: allZips, error } = await supabase
      .from('zip_codes')
      .select('zip_code, city, state, state_code, latitude, longitude')
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error || !allZips) {
      console.error('[ZIP CODES] Error fetching ZIP codes for radius search:', error);
      return [];
    }

    const surrounding: Array<{ zip_code: string; city: string; state: string; state_code: string; distance: number; latitude: number | null; longitude: number | null }> = [];

    // Haversine formula to calculate distance
    for (const zip of allZips) {
      if (!zip.latitude || !zip.longitude || zip.zip_code === centerZip) {
        continue;
      }

      const distance = calculateDistance(
        centerLat,
        centerLon,
        zip.latitude,
        zip.longitude
      );

      if (distance <= radiusMiles) {
        surrounding.push({
          zip_code: zip.zip_code,
          city: zip.city,
          state: zip.state,
          state_code: zip.state_code,
          latitude: zip.latitude,
          longitude: zip.longitude,
          distance: Math.round(distance * 10) / 10 // Round to 1 decimal
        });
      }
    }

    // Sort by distance
    surrounding.sort((a, b) => a.distance - b.distance);

    return surrounding;
  } catch (error: any) {
    console.error('[ZIP CODES] Error finding surrounding ZIP codes:', error.message);
    return [];
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Update last_scraped_at for ZIP codes
 */
async function updateZipCodeScraped(zipCodes: string[], petsFound: number = 0): Promise<void> {
  if (!supabase || zipCodes.length === 0) {
    return;
  }

  try {
    const now = new Date().toISOString();

    for (const zipCode of zipCodes) {
      // Get current scrape_count first
      const { data: current, error: fetchError } = await supabase
        .from('zip_codes')
        .select('scrape_count')
        .eq('zip_code', zipCode)
        .single();

      const newScrapeCount = (current?.scrape_count || 0) + 1;

      const { error: updateError } = await supabase
        .from('zip_codes')
        .update({
          last_scraped_at: now,
          scrape_count: newScrapeCount,
          last_pets_found: petsFound,
          updated_at: now
        })
        .eq('zip_code', zipCode);

      if (updateError) {
        console.error(`[ZIP CODES] Error updating ${zipCode}:`, updateError.message);
      }
    }
  } catch (error: any) {
    console.error('[ZIP CODES] Error updating scraped timestamp:', error.message);
  }
}

async function updateShelterScraped(zipCodes: string[]): Promise<void> {
  if (!supabase || zipCodes.length === 0) {
    return;
  }

  try {
    await supabase
      .from('shelters')
      .update({
        last_scraped_at: new Date().toISOString()
      })
      .in('zipcode', zipCodes);
  } catch (error: any) {
    console.error('[SHELTERS] Error updating last scraped timestamp:', error.message);
  }
}

async function notifySheltersByZip(zipCodes: string[]): Promise<void> {
  if (!supabase || zipCodes.length === 0) {
    return;
  }

  try {
    const { data, error } = await supabase
      .from('shelters')
      .select('id, shelter_name, email, city, state, zipcode, welcome_email_sent_at')
      .in('zipcode', zipCodes)
      .not('email', 'is', null);

    if (error) {
      console.error('[SHELTERS] Error fetching shelters for notification:', error.message);
      return;
    }

    const toNotify = (data || []).filter((s: any) => s.email && !s.welcome_email_sent_at);
    if (toNotify.length === 0) return;

    for (const shelter of toNotify) {
      try {
        await queueShelterWelcomeEmail(shelter);
        await markSheltersWelcomeSent([shelter.id]);
      } catch (emailError: any) {
        console.error(`[SHELTERS] Failed to send welcome email to ${shelter.email}:`, emailError.message);
      }
    }
  } catch (error: any) {
    console.error('[SHELTERS] Error notifying shelters:', error.message);
  }
}

async function markSheltersWelcomeSent(ids: string[]): Promise<void> {
  if (!supabase || ids.length === 0) {
    return;
  }

  try {
    await supabase
      .from('shelters')
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .in('id', ids);
  } catch (error: any) {
    console.error('[SHELTERS] Error marking welcome email sent:', error.message);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `discovery_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  try {
    console.log(`[PET DISCOVERY] [${requestId}] Starting autonomous pet discovery...`);

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      location, // Optional: can still use location string for backward compatibility
      maxPets = 100,
      sources = ['facebook', 'instagram', 'twitter'],
      scanShelters = true,
      useZipCodes = true, // New: use ZIP code-based scraping
      zipCodesToScrape = 5, // Number of ZIP codes to scrape
      radiusMiles = 100, // Radius for surrounding ZIP codes
      focusCity,
      focusState,
      focusRadiusMiles
    } = body;

    const focusCityName = typeof focusCity === 'string' ? focusCity.trim() : '';
    const focusStateCode = typeof focusState === 'string' ? focusState.trim().toUpperCase() : undefined;
    const focusRadius = typeof focusRadiusMiles === 'number' && !Number.isNaN(focusRadiusMiles)
      ? focusRadiusMiles
      : radiusMiles;

    console.log(`[PET DISCOVERY] [${requestId}] Config:`, { location, maxPets, sources, scanShelters, useZipCodes, zipCodesToScrape, radiusMiles });

    const allPets: UnifiedPet[] = [];
    const results: DiscoveryResult[] = [];
    let totalDeleted = 0;
    const savedFoundPetIds: string[] = []; // Track IDs of saved found pets for matching
    const scrapedZipCodes: string[] = []; // Track which ZIP codes we scraped

    // ZIP CODE-BASED SCRAPING (NEW)
    if (useZipCodes) {
      console.log(`[PET DISCOVERY] [${requestId}] Using ZIP code-based scraping...`);

      let targetZipCodes: Array<{ zip_code: string; city: string; state: string; state_code: string; latitude: number | null; longitude: number | null }> = [];

      if (focusCityName) {
        targetZipCodes = await getZipCodesNearCity(focusCityName, focusStateCode, focusRadius);
        console.log(`[PET DISCOVERY] [${requestId}] Focused run for ${focusCityName}${focusStateCode ? `, ${focusStateCode}` : ''} within ${focusRadius} miles`);
      } else {
        targetZipCodes = await getZipCodesToScrape(zipCodesToScrape);
      }

      if (targetZipCodes.length === 0) {
        console.log(`[PET DISCOVERY] [${requestId}] No ZIP codes found in database. Run populate-zip-codes script first.`);
        return NextResponse.json({
          success: false,
          error: 'No ZIP codes found. Please populate ZIP codes table first.',
          requestId
        });
      }

      const searchRadius = focusCityName ? focusRadius : radiusMiles;
      console.log(`[PET DISCOVERY] [${requestId}] Found ${targetZipCodes.length} ZIP codes to scrape`);

      for (const zipCode of targetZipCodes) {
        console.log(`[PET DISCOVERY] [${requestId}] Scraping ZIP ${zipCode.zip_code} (${zipCode.city}, ${zipCode.state_code})...`);

        const surroundingZips = await findSurroundingZipCodes(
          zipCode.zip_code,
          zipCode.latitude,
          zipCode.longitude,
          searchRadius
        );

        const allZipsToSearch = [
          { zip: zipCode.zip_code, city: zipCode.city, state: zipCode.state, stateCode: zipCode.state_code },
          ...surroundingZips.map(z => ({ zip: z.zip_code, city: z.city, state: z.state, stateCode: z.state_code }))
        ];

        console.log(`[PET DISCOVERY] [${requestId}] Searching ${allZipsToSearch.length} ZIP codes (1 center + ${surroundingZips.length} surrounding)`);

        for (const zip of allZipsToSearch) {
          const locationString = `${zip.city}, ${zip.stateCode}`;
          scrapedZipCodes.push(zip.zip);

          if (sources.includes('facebook')) {
            try {
              const pets = await scrapeFacebook(locationString, Math.floor(maxPets / allZipsToSearch.length), zip.zip);
              allPets.push(...pets);
            } catch (error: any) {
              console.error(`[PET DISCOVERY] Facebook error for ${zip.zip}:`, error.message);
            }
          }

          if (sources.includes('instagram')) {
            try {
              const pets = await scrapeInstagram(locationString, Math.floor(maxPets / allZipsToSearch.length), zip.zip);
              allPets.push(...pets);
            } catch (error: any) {
              console.error(`[PET DISCOVERY] Instagram error for ${zip.zip}:`, error.message);
            }
          }

          if (sources.includes('twitter')) {
            try {
              const pets = await scrapeTwitter(locationString, Math.floor(maxPets / allZipsToSearch.length), zip.zip);
              allPets.push(...pets);
            } catch (error: any) {
              console.error(`[PET DISCOVERY] Twitter error for ${zip.zip}:`, error.message);
            }
          }

          await sleep(500);
        }

        await updateZipCodeScraped([zipCode.zip_code], allPets.length);
      }

      if (allPets.length > 0) {
        const saveResult = await savePets(allPets);

        if (saveResult.savedIds.length > 0) {
          savedFoundPetIds.push(...saveResult.savedIds);
        }

        const uniqueZips = [...new Set(scrapedZipCodes)];
        await updateZipCodeScraped(uniqueZips, saveResult.saved);
        await updateShelterScraped(uniqueZips);
        await notifySheltersByZip(uniqueZips);

        results.push({
          source: 'zip_codes',
          petsFound: allPets.length,
          petsSaved: saveResult.saved,
          petsNew: saveResult.saved,
          petsUpdated: 0,
          errors: saveResult.errors,
          duration: Date.now() - startTime
        });
      }

    } else {
      // LEGACY: Location-based scraping (backward compatibility)
      console.log(`[PET DISCOVERY] [${requestId}] Using legacy location-based scraping: ${location}`);

      // 1. Scrape Facebook
      if (sources.includes('facebook')) {
        const sourceStart = Date.now();
        try {
          const pets = await scrapeFacebook(location, maxPets);
          allPets.push(...pets);

          const saveResult = await savePets(pets);

          // Track found pets for matching
          if (saveResult.savedIds.length > 0) {
            savedFoundPetIds.push(...saveResult.savedIds);
          }

          results.push({
            source: 'facebook',
            petsFound: pets.length,
            petsSaved: saveResult.saved,
            petsNew: saveResult.saved,
            petsUpdated: 0,
            errors: saveResult.errors,
            duration: Date.now() - sourceStart
          });
        } catch (error: any) {
          results.push({
            source: 'facebook',
            petsFound: 0,
            petsSaved: 0,
            petsNew: 0,
            petsUpdated: 0,
            errors: [error.message],
            duration: Date.now() - sourceStart
          });
        }
      }

      // 2. Scrape Instagram
      if (sources.includes('instagram')) {
        const sourceStart = Date.now();
        try {
          const pets = await scrapeInstagram(location, maxPets);
          allPets.push(...pets);

          const saveResult = await savePets(pets);

          // Track found pets for matching
          if (saveResult.savedIds.length > 0) {
            savedFoundPetIds.push(...saveResult.savedIds);
          }

          results.push({
            source: 'instagram',
            petsFound: pets.length,
            petsSaved: saveResult.saved,
            petsNew: saveResult.saved,
            petsUpdated: 0,
            errors: saveResult.errors,
            duration: Date.now() - sourceStart
          });
        } catch (error: any) {
          results.push({
            source: 'instagram',
            petsFound: 0,
            petsSaved: 0,
            petsNew: 0,
            petsUpdated: 0,
            errors: [error.message],
            duration: Date.now() - sourceStart
          });
        }
      }

      // 3. Scrape Twitter
      if (sources.includes('twitter')) {
        const sourceStart = Date.now();
        try {
          const pets = await scrapeTwitter(location, maxPets);
          allPets.push(...pets);

          const saveResult = await savePets(pets);

          // Track found pets for matching
          if (saveResult.savedIds.length > 0) {
            savedFoundPetIds.push(...saveResult.savedIds);
          }

          results.push({
            source: 'twitter',
            petsFound: pets.length,
            petsSaved: saveResult.saved,
            petsNew: saveResult.saved,
            petsUpdated: 0,
            errors: saveResult.errors,
            duration: Date.now() - sourceStart
          });
        } catch (error: any) {
          results.push({
            source: 'twitter',
            petsFound: 0,
            petsSaved: 0,
            petsNew: 0,
            petsUpdated: 0,
            errors: [error.message],
            duration: Date.now() - sourceStart
          });
        }
      }
    }

    // 4. Scan shelters and diff inventory
    if (scanShelters && supabase) {
      try {
        const { data: shelters, error: shelterError } = await supabase
          .from('shelters')
          .select('id, shelter_name, email')
          .eq('auto_scrape_enabled', true)
          .limit(50);

        if (!shelterError && shelters) {
          for (const shelter of shelters) {
            // Get pets discovered for this shelter
            const shelterPets = allPets.filter(p => p.shelter_id === shelter.id);

            if (shelterPets.length > 0) {
              const { newPets, deletedPets } = await diffShelterInventory(shelter.id, shelterPets);

              // Save new pets
              if (newPets.length > 0) {
                const saveResult = await savePets(newPets);
                totalDeleted += await markPetsAsRecovered(deletedPets);

                // Optionally send email to shelter about new pets
                // TODO: Implement email notification
              }
            }
          }
        }
      } catch (error: any) {
        console.error(`[PET DISCOVERY] [${requestId}] Shelter scanning error:`, error.message);
      }
    }

    // 5. Match found pets against lost pets
    let totalMatches = 0;
    let totalMatchesSaved = 0;

    if (savedFoundPetIds.length > 0) {
      try {
        console.log(`[PET DISCOVERY] [${requestId}] Matching ${savedFoundPetIds.length} found pets against lost pets...`);
        const matchResult = await matchFoundPets(savedFoundPetIds, 60); // Minimum score: 60
        totalMatches = matchResult.matches.length;
        totalMatchesSaved = matchResult.saved;
        console.log(`[PET DISCOVERY] [${requestId}] Matching complete: ${totalMatches} matches found, ${totalMatchesSaved} saved`);
      } catch (error: any) {
        console.error(`[PET DISCOVERY] [${requestId}] Matching error:`, error.message);
      }
    }

    const totalDuration = Date.now() - startTime;
    const summary: DiscoverySummary = {
      totalFound: results.reduce((sum, r) => sum + r.petsFound, 0),
      totalSaved: results.reduce((sum, r) => sum + r.petsSaved, 0),
      totalNew: results.reduce((sum, r) => sum + r.petsNew, 0),
      totalUpdated: results.reduce((sum, r) => sum + r.petsUpdated, 0),
      totalDeleted,
      totalMatches,
      totalMatchesSaved,
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      duration: totalDuration,
      sources: results
    };

    console.log(`[PET DISCOVERY] [${requestId}] Complete:`, summary);

    return NextResponse.json({
      success: true,
      requestId,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error(`[PET DISCOVERY] [${requestId}] Fatal error:`, error);
    return NextResponse.json(
      {
        error: error.message || 'Pet discovery failed',
        requestId,
        success: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    sources: {
      facebook: !!FACEBOOK_ACCESS_TOKEN,
      instagram: !!(INSTAGRAM_ACCESS_TOKEN && INSTAGRAM_ACCOUNT_ID),
      twitter: !!TWITTER_BEARER_TOKEN
    },
    database: supabase ? 'connected' : 'not configured'
  });
}

