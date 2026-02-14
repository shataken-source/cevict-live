import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Facebook credentials
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || '';
const FACEBOOK_EMAIL = process.env.FACEBOOK_EMAIL || '';
const FACEBOOK_PASSWORD = process.env.FACEBOOK_PASSWORD || '';

interface ScrapedPet {
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
  location_city?: string;
  location_state?: string;
  source: string;
  source_url?: string;
  facebook_post_id?: string;
  facebook_post_created?: string;
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
}

interface ScrapeResult {
  success: boolean;
  strategy: string;
  petsFound: number;
  petsSaved: number;
  errors: string[];
  duration: number;
  requestId?: string; // Optional request ID for tracking
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[RETRY] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error('Max retries exceeded');
}

// ============================================
// FACEBOOK GRAPH API STRATEGY
// ============================================

async function getFacebookAccessToken(): Promise<string | null> {
  // Check for direct access token first
  if (FACEBOOK_ACCESS_TOKEN) {
    console.log('[GRAPH API] Using provided FACEBOOK_ACCESS_TOKEN');
    return FACEBOOK_ACCESS_TOKEN;
  }

  // Try to get app access token using App ID and Secret
  if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
    try {
      console.log('[GRAPH API] Attempting to get app access token using App ID and Secret...');
      const response = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&grant_type=client_credentials`
      );
      const data = await response.json();

      if (data.error) {
        console.error('[GRAPH API] Error getting app token:', data.error.message);
        console.error('[GRAPH API] Error details:', JSON.stringify(data.error, null, 2));
        return null;
      }

      if (data.access_token) {
        console.log('[GRAPH API] Successfully obtained app access token');
        return data.access_token;
      }

      console.warn('[GRAPH API] No access_token in response:', JSON.stringify(data, null, 2));
      return null;
    } catch (error: any) {
      console.error('[GRAPH API] Exception getting app token:', error.message);
      console.error('[GRAPH API] Stack:', error.stack);
      return null;
    }
  }

  // Log what's missing
  console.error('[GRAPH API] Missing Facebook credentials:');
  console.error('[GRAPH API] - FACEBOOK_ACCESS_TOKEN:', FACEBOOK_ACCESS_TOKEN ? 'SET' : 'NOT SET');
  console.error('[GRAPH API] - FACEBOOK_APP_ID:', FACEBOOK_APP_ID ? 'SET' : 'NOT SET');
  console.error('[GRAPH API] - FACEBOOK_APP_SECRET:', FACEBOOK_APP_SECRET ? 'SET' : 'NOT SET');
  console.error('[GRAPH API] Note: Email/password credentials are not used for Graph API - need App ID/Secret or direct token');

  return null;
}

// Search Facebook for posts directly (if available)
async function searchFacebookPosts(query: string, accessToken: string): Promise<any[]> {
  try {
    // Try to search for posts directly (may require page token or different permissions)
    const url = `https://graph.facebook.com/v18.0/search?q=${encodeURIComponent(query)}&type=post&access_token=${accessToken}&limit=25&fields=id,message,created_time,full_picture,picture,permalink_url,from{name},place{name,location{city,state,country}}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      // Post search may not be available, that's okay
      console.log(`[GRAPH API] Post search not available: ${data.error.message}`);
      return [];
    }

    return data.data || [];
  } catch (error: any) {
    console.error(`[GRAPH API] Post search error:`, error.message);
    return [];
  }
}

// Search Facebook for pages
async function searchFacebookPages(query: string, accessToken: string): Promise<any[]> {
  try {
    const url = `https://graph.facebook.com/v18.0/search?q=${encodeURIComponent(query)}&type=page&access_token=${accessToken}&limit=25&fields=id,name,category`;
    console.log(`[GRAPH API] Searching pages with URL: ${url.replace(accessToken, 'TOKEN_HIDDEN')}`);
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error(`[GRAPH API] Error searching pages for "${query}":`, JSON.stringify(data.error, null, 2));
      return [];
    }

    const pages = data.data || [];
    console.log(`[GRAPH API] Search "${query}" returned ${pages.length} pages:`, pages.map((p: any) => p.name).join(', '));
    return pages;
  } catch (error: any) {
    console.error(`[GRAPH API] Page search error for "${query}":`, error.message);
    return [];
  }
}

// Search Facebook for places (locations that might have pet posts)
async function searchFacebookPlaces(query: string, accessToken: string): Promise<any[]> {
  try {
    const url = `https://graph.facebook.com/v18.0/search?q=${encodeURIComponent(query)}&type=place&access_token=${accessToken}&limit=25&fields=id,name,location`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.log(`[GRAPH API] Place search not available: ${data.error.message}`);
      return [];
    }

    return data.data || [];
  } catch (error: any) {
    return [];
  }
}

async function getPagePosts(pageId: string, accessToken: string, limit: number = 50): Promise<any[]> {
  try {
    const url = `https://graph.facebook.com/v18.0/${pageId}/posts?access_token=${accessToken}&fields=id,message,created_time,full_picture,picture,permalink_url,attachments{media{image{src}},subattachments{media{image{src}}}},place{name,location{city,state,country}}&limit=${limit}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error(`[GRAPH API] Error getting posts from page ${pageId}:`, JSON.stringify(data.error, null, 2));
      return [];
    }

    const posts = data.data || [];
    console.log(`[GRAPH API] Page ${pageId} returned ${posts.length} posts`);
    if (posts.length > 0) {
      console.log(`[GRAPH API] Sample post messages:`, posts.slice(0, 3).map((p: any) => (p.message || '').substring(0, 100)).join(' | '));
    }
    return posts;
  } catch (error: any) {
    console.error(`[GRAPH API] Posts error for page ${pageId}:`, error.message);
    return [];
  }
}

async function searchGroups(accessToken: string, query: string): Promise<any[]> {
  try {
    const url = `https://graph.facebook.com/v18.0/search?q=${encodeURIComponent(query)}&type=group&access_token=${accessToken}&limit=25`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error(`[GRAPH API] Error searching groups:`, data.error.message);
      return [];
    }

    return data.data || [];
  } catch (error: any) {
    console.error(`[GRAPH API] Group search error:`, error.message);
    return [];
  }
}

async function getGroupPosts(groupId: string, accessToken: string, limit: number = 50): Promise<any[]> {
  try {
    const url = `https://graph.facebook.com/v18.0/${groupId}/feed?access_token=${accessToken}&fields=id,message,created_time,full_picture,picture,permalink_url,attachments{media{image{src}},subattachments{media{image{src}}}},place{name,location{city,state,country}}&limit=${limit}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error(`[GRAPH API] Error getting group posts:`, data.error.message);
      return [];
    }

    return data.data || [];
  } catch (error: any) {
    console.error(`[GRAPH API] Group posts error:`, error.message);
    return [];
  }
}

// Try to find page by trying different formats
async function tryGetPagePosts(pageIdentifier: string, accessToken: string, limit: number = 50): Promise<{ posts: any[]; pageName?: string }> {
  // Try getting page info first to verify it exists
  try {
    const pageInfoUrl = `https://graph.facebook.com/v18.0/${pageIdentifier}?access_token=${accessToken}&fields=id,name,username`;
    const pageInfoResponse = await fetch(pageInfoUrl);
    const pageInfo = await pageInfoResponse.json();

    if (pageInfo.error) {
      return { posts: [] };
    }

    // Use the actual page ID
    const actualPageId = pageInfo.id || pageIdentifier;
    const posts = await getPagePosts(actualPageId, accessToken, limit);

    if (posts.length > 0) {
      return { posts, pageName: pageInfo.name || pageIdentifier };
    }
  } catch (error: any) {
    console.error(`[GRAPH API] Error trying page ${pageIdentifier}:`, error.message);
  }

  return { posts: [] };
}

// ============================================
// ENHANCED PET EXTRACTION
// ============================================

function extractPetFromPost(post: any, source: string = 'facebook'): ScrapedPet | null {
  const message = post.message || '';
  const messageLower = message.toLowerCase();

  // MUST have pet keywords - be more lenient
  const petKeywords = ['lost', 'found', 'missing', 'dog', 'cat', 'puppy', 'kitten', 'pet', 'animal', 'adopt', 'adoption', 'rescue', 'shelter', 'pup', 'feline', 'canine'];
  if (!petKeywords.some(keyword => messageLower.includes(keyword))) {
    return null;
  }

  // Extract name with multiple patterns - but don't require it
  let name = 'Unknown';
  const namePatterns = [
    /(?:lost|found|missing)\s+(?:dog|cat|puppy|kitten)\s+(?:named|called)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:dog|cat|puppy|kitten)\s+(?:named|called)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /name[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is|was)\s+(?:lost|missing|found)/i,
    /(?:my|our)\s+(?:dog|cat|pet)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /looking\s+for\s+(?:a|an|my)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /adopt\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  ];

  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length > 1 && match[1].length < 50) {
      name = match[1].trim();
      break;
    }
  }

  // Generate a name if none found - use breed, type, or default
  if (name === 'Unknown' || name.length < 2) {
    // Try to use breed or type as name
    if (messageLower.includes('labrador') || messageLower.includes('lab')) {
      name = 'Labrador';
    } else if (messageLower.includes('golden')) {
      name = 'Golden';
    } else if (messageLower.includes('pit') || messageLower.includes('pitbull')) {
      name = 'Pit Bull';
    } else if (messageLower.includes('shepherd')) {
      name = 'Shepherd';
    } else if (messageLower.includes('dog') || messageLower.includes('puppy')) {
      name = 'Dog';
    } else if (messageLower.includes('cat') || messageLower.includes('kitten')) {
      name = 'Cat';
    } else {
      name = 'Pet'; // Default name - we'll still save it
    }
  }

  // Extract breed
  let breed = 'Mixed Breed';
  const breedPatterns = [
    /breed[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+Mix|Mix Breed|Mixed)?)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Mix|Breed|Retriever|Shepherd|Terrier|Hound|Spaniel|Bulldog|Poodle|Labrador|Golden|German|Pit|Boxer|Beagle|Chihuahua|Dachshund|Rottweiler|Siberian|Border|Australian|Collie|Great|Saint|Mastiff|Husky|Malamute|Samoyed|Pug|Boston|French|English|American|Staffordshire|Bull|Jack|Russell|Yorkshire|West|Scottish|Persian|Siamese|Maine Coon|Ragdoll|British Shorthair|Abyssinian|Bengal|Russian Blue|Mix|Mixed))/i,
    /(Labrador|Golden|German Shepherd|Pit Bull|Beagle|Boxer|Bulldog|Poodle|Chihuahua|Dachshund|Husky|Malamute|Retriever|Terrier|Spaniel|Setter|Pointer|Collie|Corgi|Pomeranian|Shih Tzu|Yorkshire|Boston|French|English|American|Staffordshire|Pit|Bull|Pug|Basset|Bloodhound|Coonhound|Foxhound|Greyhound|Whippet|Saluki|Afghan|Borzoi|Irish|Scottish|Welsh|Persian|Siamese|Maine Coon|Ragdoll|British Shorthair|Abyssinian|Bengal|Russian Blue|Mix|Mixed|Mutt)/i
  ];

  for (const pattern of breedPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      breed = match[1].trim();
      break;
    }
  }

  // Determine type
  let type: 'dog' | 'cat' = 'dog';
  if (messageLower.includes('cat') || messageLower.includes('kitten') || messageLower.includes('feline')) {
    type = 'cat';
  }

  // Determine status
  let status: 'lost' | 'found' = 'found';
  if (messageLower.includes('lost') || messageLower.includes('missing') || messageLower.includes('runaway')) {
    status = 'lost';
  } else if (messageLower.includes('found') || messageLower.includes('rescued') || messageLower.includes('at shelter')) {
    status = 'found';
  }

  // Extract location
  let location_city = 'Unknown';
  let location_state = '';

  if (post.place?.location) {
    location_city = post.place.location.city || 'Unknown';
    location_state = post.place.location.state || '';
  } else {
    // Try to extract from message
    const locationPatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[,\s]+([A-Z]{2})\b/,
      /(?:in|near|at|location)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[,\s]*([A-Z]{2})?/i,
      /\b([A-Z]{2})\b/
    ];

    for (const pattern of locationPatterns) {
      const match = message.match(pattern);
      if (match) {
        if (match[1] && match[1].length === 2) {
          location_state = match[1];
        } else if (match[1]) {
          location_city = match[1].trim();
        }
        if (match[2]) {
          location_state = match[2];
        }
        break;
      }
    }
  }

  // Extract color
  const colors = ['black', 'white', 'brown', 'tan', 'gray', 'grey', 'orange', 'red', 'yellow', 'brindle', 'spotted', 'striped', 'calico', 'tabby', 'tortoiseshell'];
  let color = 'Unknown';
  for (const c of colors) {
    if (messageLower.includes(c)) {
      color = c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }

  // Extract size
  let size = 'medium';
  if (messageLower.includes('small') || messageLower.includes('tiny') || messageLower.includes('puppy') || messageLower.includes('kitten')) {
    size = 'small';
  } else if (messageLower.includes('large') || messageLower.includes('big') || messageLower.includes('giant')) {
    size = 'large';
  }

  // Extract gender
  let gender = 'unknown';
  if (messageLower.includes('male') || messageLower.includes('boy')) {
    gender = 'male';
  } else if (messageLower.includes('female') || messageLower.includes('girl')) {
    gender = 'female';
  }

  // Extract age
  let age = '';
  const ageMatch = message.match(/(\d+)\s*(?:year|yr|month|mo|week|wk|old|years|months|weeks)/i);
  if (ageMatch) {
    age = ageMatch[0];
  }

  // Extract contact info
  let owner_name = 'Community';
  let owner_phone = '';
  let owner_email = '';

  const phoneMatch = message.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
  if (phoneMatch) {
    owner_phone = phoneMatch[1];
  }

  const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    owner_email = emailMatch[1];
  }

  // Get photo URL
  let photo_url = '';
  if (post.full_picture) {
    photo_url = post.full_picture;
  } else if (post.picture) {
    photo_url = post.picture;
  } else if (post.attachments?.data?.[0]?.media?.image?.src) {
    photo_url = post.attachments.data[0].media.image.src;
  } else if (post.attachments?.data?.[0]?.subattachments?.data?.[0]?.media?.image?.src) {
    photo_url = post.attachments.data[0].subattachments.data[0].media.image.src;
  }

  // Build description
  const description = message.substring(0, 500);

  return {
    name,
    type,
    breed,
    age,
    gender,
    size,
    color,
    photo_url,
    description,
    status,
    location_city,
    location_state,
    source,
    source_url: post.permalink_url || `https://www.facebook.com/${post.id}`,
    facebook_post_id: post.id,
    facebook_post_created: post.created_time,
    owner_name,
    owner_phone,
    owner_email
  };
}

// ============================================
// PET API INTEGRATIONS - REMOVED (Petfinder discontinued Dec 2025)
// ============================================
// Petfinder API code removed - API discontinued
// RescueGroups code commented out - keys not available

// RescueGroups.org API - COMMENTED OUT
// const RESCUEGROUPS_API_KEY = process.env.RESCUEGROUPS_API_KEY || '';

// COMMENTED OUT - RescueGroups API integration
/*
async function scrapeWithRescueGroupsAPI(location: string, maxPets: number = 100): Promise<ScrapeResult> {
  const startTime = Date.now();
  const requestId = `rescuegroups_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const result: ScrapeResult = {
    success: false,
    strategy: 'RescueGroups API',
    petsFound: 0,
    petsSaved: 0,
    errors: [],
    duration: 0,
    requestId: requestId
  };

  if (!RESCUEGROUPS_API_KEY) {
    result.errors.push('RescueGroups API key not configured');
    return result;
  }

  try {
    // RescueGroups.org API endpoint
    const locationParts = location.split(',').map(s => s.trim());
    const city = locationParts[0] || location;
    const state = locationParts[1] || '';

    console.log(`[RESCUEGROUPS - ${requestId}] Searching RescueGroups for pets in ${location}...`);

    // RescueGroups API query
    const query = {
      apikey: RESCUEGROUPS_API_KEY,
      objectType: 'animals',
      objectAction: 'publicSearch',
      search: {
        resultStart: 0,
        resultLimit: Math.min(maxPets, 100),
        resultSort: 'createdDate',
        resultOrder: 'desc',
        filters: [
          {
            fieldName: 'animalStatus',
            operation: 'equals',
            criteria: 'Available'
          },
          {
            fieldName: 'animalLocationCity',
            operation: 'equals',
            criteria: city
          }
        ],
        fields: ['animalID', 'animalName', 'animalBreed', 'animalSpecies', 'animalGeneralAge', 'animalSex', 'animalDescription', 'animalPhotos', 'animalLocation', 'organizationID']
      }
    };

    const response = await fetch('https://api.rescuegroups.org/v5/public/hs/public/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(query)
    });

    const data = await response.json();

    if (data.errors) {
      result.errors.push(`RescueGroups API error: ${JSON.stringify(data.errors)}`);
      return result;
    }

    const animals = data.data || [];
    console.log(`[RESCUEGROUPS - ${requestId}] Found ${animals.length} pets from RescueGroups`);

    const allPets: ScrapedPet[] = [];

    for (const animal of animals.slice(0, maxPets)) {
      const animalData = animal.attributes || {};
      const pet: ScrapedPet = {
        name: animalData.animalName || 'Unknown',
        type: (animalData.animalSpecies || '').toLowerCase().includes('cat') ? 'cat' : 'dog',
        breed: animalData.animalBreed || 'Mixed Breed',
        age: animalData.animalGeneralAge || 'Unknown',
        gender: animalData.animalSex || 'Unknown',
        size: 'medium',
        color: 'Unknown',
        photo_url: animalData.animalPhotos?.[0]?.large || '',
        description: animalData.animalDescription || `Adoptable pet from RescueGroups`,
        status: 'found',
        location_city: animalData.animalLocation || city,
        location_state: state,
        source: 'rescuegroups:api',
        source_url: `https://www.rescuegroups.org/animals/${animal.id}`,
        facebook_post_id: `rescuegroups_${animal.id}`,
        facebook_post_created: new Date().toISOString(),
        owner_name: 'Rescue Organization',
        owner_phone: null,
        owner_email: null
      };

      allPets.push(pet);
    }

    result.petsFound = allPets.length;
    result.success = true;

    if (allPets.length > 0) {
      const saveResult = await savePets(allPets);
      result.petsSaved = saveResult.saved;
      result.errors.push(...saveResult.errors);
    }

  } catch (error: any) {
    result.errors.push(`RescueGroups API strategy failed: ${error.message}`);
  } finally {
    result.duration = Date.now() - startTime;
  }

  return result;
}
*/

// ============================================
// SCRAPING STRATEGIES
// ============================================

async function scrapeWithGraphAPI(location: string, maxPets: number = 100): Promise<ScrapeResult> {
  const startTime = Date.now();
  const result: ScrapeResult = {
    success: false,
    strategy: 'Graph API',
    petsFound: 0,
    petsSaved: 0,
    errors: [],
    duration: 0
  };

  try {
    const accessToken = await getFacebookAccessToken();
    if (!accessToken) {
      result.errors.push('No Facebook access token available');
      return result;
    }

    const allPets: ScrapedPet[] = [];
    const seenPostIds = new Set<string>();
    const shelterPages: any[] = [];
    const shelterGroups: any[] = [];

    // PRIORITY 1: Search for rescue shelters and animal shelters
    const shelterQueries = [
      `animal shelter ${location}`,
      `rescue shelter ${location}`,
      `dog rescue ${location}`,
      `animal rescue ${location}`,
      `humane society ${location}`,
      `SPCA ${location}`,
      `animal control ${location}`,
      `pet adoption ${location}`,
      `animal shelter`,
      `dog rescue`,
      `animal rescue`,
      `rescue shelter`,
      `humane society`,
      `SPCA`,
      `animal control`
    ];

    const searchQueries = [
      `fishy ${location}`, // Search for "fishy fb" page/group
      `lost pets ${location}`,
      `found pets ${location}`,
      `lost dogs ${location}`,
      `lost cats ${location}`,
      `missing pets ${location}`,
      `pet rescue ${location}`,
      `animal shelter ${location}`,
      `lost and found pets ${location}`
    ];

    // Also search for specific "fishy" Facebook page/group
    const fishyQueries = [
      'fishy',
      'fishy fb',
      'fishy facebook',
      'petreunion'
    ];

    // STEP 1: TRY KNOWN SHELTER PAGES FIRST - Direct access (bypass broken search API)
    console.log(`[GRAPH API] STEP 1: Bypassing broken search API - trying known shelter pages directly...`);

    // Known public animal shelter/rescue page usernames/IDs to try directly
    // We'll try these common formats - some might work, some won't
    const shelterPageIdentifiers = [
      // Alabama area shelters
      'MobileCountyAnimalShelter',
      'BirminghamHumane',
      'GreaterBirminghamHumaneSociety',
      'MontgomeryHumane',
      'ALSPCA',
      'MobileSPCA',
      // National/regional ones that might have Alabama pets
      'ASPCA',
      'HumaneSociety',
      'BestFriends',
      'Petfinder',
    ];

    console.log(`[GRAPH API] Trying ${shelterPageIdentifiers.length} known shelter pages directly...`);

    // Try each page directly
    for (const pageId of shelterPageIdentifiers) {
      if (allPets.length >= maxPets) break;

      try {
        console.log(`[GRAPH API] Attempting to access page: ${pageId}`);
        const { posts, pageName } = await tryGetPagePosts(pageId, accessToken, 100);

        if (posts.length > 0) {
          console.log(`[GRAPH API] ✓ Successfully got ${posts.length} posts from ${pageName || pageId}`);

          // Extract pets from posts
          for (const post of posts) {
            if (allPets.length >= maxPets) break;
            if (seenPostIds.has(post.id)) continue;

            const pet = extractPetFromPost(post, `facebook:shelter:${pageName || pageId}`);
            if (pet) {
              allPets.push(pet);
              seenPostIds.add(pet.facebook_post_id!);
              console.log(`[GRAPH API] ✓ Extracted pet: ${pet.name} (${pet.type}) from ${pageName || pageId}`);
            }
          }
        }

        await sleep(1000); // Rate limiting
      } catch (error: any) {
        console.error(`[GRAPH API] Error accessing page ${pageId}:`, error.message);
        result.errors.push(`Error accessing page ${pageId}: ${error.message}`);
      }
    }

    console.log(`[GRAPH API] STEP 1 Complete: Found ${allPets.length} pets from known shelter pages`);

    // STEP 2: SEARCH FOR RESCUE SHELTERS - Try different search approaches
    console.log(`[GRAPH API] STEP 2: Searching for rescue shelters using multiple strategies...`);

    // Try broader searches - Facebook search is limited, so cast a wide net
    const allSearchTerms = [
      ...shelterQueries,
      // Try single-word searches that might work better
      'animal shelter',
      'dog rescue',
      'SPCA',
      'humane society',
      'animal rescue'
    ];

    for (const query of allSearchTerms.slice(0, 15)) {
      try {
        console.log(`[GRAPH API] Searching: "${query}"`);

        // Search for shelter pages
        const pages = await searchFacebookPages(query, accessToken);
        console.log(`[GRAPH API] Search "${query}" returned ${pages.length} pages`);

        if (pages.length > 0) {
          // Be more lenient with filtering - accept any animal-related page
          const actualShelters = pages.filter(p => {
            const nameLower = (p.name || '').toLowerCase();
            const categoryLower = (p.category || '').toLowerCase();
            // Accept if it's clearly animal-related
            return nameLower.includes('shelter') ||
                   nameLower.includes('rescue') ||
                   nameLower.includes('spca') ||
                   nameLower.includes('humane') ||
                   nameLower.includes('animal control') ||
                   nameLower.includes('adoption') ||
                   nameLower.includes('dog') ||
                   nameLower.includes('cat') ||
                   nameLower.includes('pet') ||
                   categoryLower.includes('non-profit') ||
                   categoryLower.includes('animal') ||
                   categoryLower.includes('organization');
          });

          if (actualShelters.length > 0) {
            console.log(`[GRAPH API] Found ${actualShelters.length} valid shelter pages for "${query}"`);
            shelterPages.push(...actualShelters);
          }
        }

        // Search for shelter groups
        try {
          const groups = await searchGroups(accessToken, query);
          if (groups.length > 0) {
            console.log(`[GRAPH API] Found ${groups.length} groups for "${query}"`);
            const validGroups = groups.filter(g => {
              const nameLower = (g.name || '').toLowerCase();
              return nameLower.includes('shelter') ||
                     nameLower.includes('rescue') ||
                     nameLower.includes('spca') ||
                     nameLower.includes('humane') ||
                     nameLower.includes('animal') ||
                     nameLower.includes('dog') ||
                     nameLower.includes('pet');
            });
            shelterGroups.push(...validGroups);
          }
        } catch (e: any) {
          console.log(`[GRAPH API] Group search failed for "${query}": ${e.message}`);
        }

        await sleep(2000); // More rate limiting
      } catch (error: any) {
        console.error(`[GRAPH API] Error searching "${query}": ${error.message}`);
        result.errors.push(`Error searching shelters "${query}": ${error.message}`);
      }
    }

    // Deduplicate shelter pages
    const uniqueShelterPages = Array.from(new Map(shelterPages.map((p: any) => [p.id, p])).values());
    const uniqueShelterGroups = Array.from(new Map(shelterGroups.map((g: any) => [g.id, g])).values());

    console.log(`[GRAPH API] Found ${uniqueShelterPages.length} unique shelter pages and ${uniqueShelterGroups.length} unique shelter groups`);

    // STEP 2: CRAWL SHELTER PAGES - Get dogs from shelters
    console.log(`[GRAPH API] STEP 2: Crawling shelter pages to get dogs...`);

    for (const page of uniqueShelterPages.slice(0, 20)) { // Limit to 20 shelters
      if (allPets.length >= maxPets) break;

      try {
        console.log(`[GRAPH API] Crawling shelter page: "${page.name}" (ID: ${page.id})`);
        const posts = await getPagePosts(page.id, accessToken, 100); // Get more posts from shelters
        console.log(`[GRAPH API] Found ${posts.length} posts from shelter "${page.name}"`);

        for (const post of posts) {
          if (allPets.length >= maxPets) break;
          if (seenPostIds.has(post.id)) continue;

          // Extract pet from post - prioritize dogs
          const pet = extractPetFromPost(post, `facebook:shelter:${page.name}`);
          if (pet) {
            // Focus on dogs from shelters (but also include cats if found)
            if (pet.type === 'dog' || pet.type === 'cat') {
              allPets.push(pet);
              seenPostIds.add(pet.facebook_post_id!);
            }
          }
        }

        await sleep(1000); // Rate limiting between shelters
      } catch (error: any) {
        result.errors.push(`Error crawling shelter page ${page.name}: ${error.message}`);
      }
    }

    // STEP 3: CRAWL SHELTER GROUPS - Get dogs from shelter groups
    console.log(`[GRAPH API] STEP 3: Crawling shelter groups to get dogs...`);

    for (const group of uniqueShelterGroups.slice(0, 10)) { // Limit to 10 shelter groups
      if (allPets.length >= maxPets) break;

      try {
        console.log(`[GRAPH API] Crawling shelter group: "${group.name}" (ID: ${group.id})`);
        const posts = await getGroupPosts(group.id, accessToken, 100);
        console.log(`[GRAPH API] Found ${posts.length} posts from shelter group "${group.name}"`);

        for (const post of posts) {
          if (allPets.length >= maxPets) break;
          if (seenPostIds.has(post.id)) continue;

          const pet = extractPetFromPost(post, `facebook:shelter_group:${group.name}`);
          if (pet) {
            if (pet.type === 'dog' || pet.type === 'cat') {
              allPets.push(pet);
              seenPostIds.add(pet.facebook_post_id!);
            }
          }
        }

        await sleep(1000); // Rate limiting
      } catch (error: any) {
        result.errors.push(`Error crawling shelter group ${group.name}: ${error.message}`);
      }
    }

    console.log(`[GRAPH API] Found ${allPets.length} pets from shelters so far`);

    // STEP 4: SEARCH FACEBOOK FOR OTHER PET-RELATED CONTENT - Continue with existing search
    console.log(`[GRAPH API] STEP 4: Searching Facebook for other pet-related content...`);

    const allSearchResults: { pages: any[]; groups: any[]; posts: any[]; places: any[] } = {
      pages: [],
      groups: [],
      posts: [],
      places: []
    };

    // Search for everything matching our queries
    for (const query of [...fishyQueries, ...searchQueries].slice(0, 8)) {
      if (allPets.length >= maxPets) break;

      try {
        console.log(`[GRAPH API] Searching Facebook for: "${query}"`);

        // Search for posts directly (if available)
        try {
          const posts = await searchFacebookPosts(query, accessToken);
          if (posts.length > 0) {
            console.log(`[GRAPH API] Found ${posts.length} posts for "${query}"`);
            allSearchResults.posts.push(...posts);
          }
        } catch (e) {
          // Post search may not be available
        }

        // Search for pages
        const pages = await searchFacebookPages(query, accessToken);
        if (pages.length > 0) {
          console.log(`[GRAPH API] Found ${pages.length} pages for "${query}"`);
          allSearchResults.pages.push(...pages);
        }

        // Search for places
        try {
          const places = await searchFacebookPlaces(`pet ${query}`, accessToken);
          if (places.length > 0) {
            console.log(`[GRAPH API] Found ${places.length} places for "${query}"`);
            allSearchResults.places.push(...places);
          }
        } catch (e) {
          // Place search may not be available
        }

        await sleep(1500); // Rate limiting between searches
      } catch (error: any) {
        result.errors.push(`Error searching "${query}": ${error.message}`);
      }
    }

    // Deduplicate search results
    const uniquePages = Array.from(new Map(allSearchResults.pages.map(p => [p.id, p])).values());
    const uniquePosts = Array.from(new Map(allSearchResults.posts.map(p => [p.id, p])).values());

    console.log(`[GRAPH API] STEP 4 Complete: Found ${uniquePages.length} pages, ${uniquePosts.length} posts`);

    // STEP 5: CRAWL THE SEARCH RESULTS - Extract pets from found posts
    console.log(`[GRAPH API] STEP 5: Crawling search results...`);

    // Process direct posts from search first
    for (const post of uniquePosts.slice(0, 100)) {
      if (allPets.length >= maxPets) break;
      if (seenPostIds.has(post.id)) continue;

      try {
        const pet = extractPetFromPost(post, 'facebook:search');
        if (pet) {
          allPets.push(pet);
          seenPostIds.add(pet.facebook_post_id!);
        }
        await sleep(200); // Small delay between posts
      } catch (error: any) {
        result.errors.push(`Error processing post ${post.id}: ${error.message}`);
      }
    }

    // STEP 6: CRAWL PAGES FROM SEARCH RESULTS - Get posts from found pages
    console.log(`[GRAPH API] STEP 6: Crawling pages from search results...`);

    // Prioritize "fishy" pages
    const prioritizedPages = [
      ...uniquePages.filter(p => p.name?.toLowerCase().includes('fishy')),
      ...uniquePages.filter(p => !p.name?.toLowerCase().includes('fishy'))
    ];

    for (const page of prioritizedPages.slice(0, 15)) { // Limit to 15 pages
      if (allPets.length >= maxPets) break;

      try {
        console.log(`[GRAPH API] Crawling page: "${page.name}" (ID: ${page.id})`);
        const posts = await getPagePosts(page.id, accessToken, 50);
        console.log(`[GRAPH API] Found ${posts.length} posts from page "${page.name}"`);

        for (const post of posts) {
          if (allPets.length >= maxPets) break;
          if (seenPostIds.has(post.id)) continue;

          const pet = extractPetFromPost(post, `facebook:${page.name}`);
          if (pet) {
            allPets.push(pet);
            seenPostIds.add(pet.facebook_post_id!);
          }
        }

        await sleep(1000); // Rate limiting between pages
      } catch (error: any) {
        result.errors.push(`Error processing page ${page.name}: ${error.message}`);
      }
    }

    // STEP 7: CRAWL GROUPS - Search and crawl groups
    console.log(`[GRAPH API] STEP 7: Searching and crawling groups...`);

    for (const query of ['lost pets', 'found pets', 'pet rescue', 'fishy']) {
      if (allPets.length >= maxPets) break;

      try {
        const groups = await searchGroups(accessToken, `${query} ${location}`);
        console.log(`[GRAPH API] Found ${groups.length} groups for "${query}"`);

        // Prioritize "fishy" groups
        const prioritizedGroups = query.includes('fishy')
          ? groups.filter(g => g.name?.toLowerCase().includes('fishy'))
          : groups;

        for (const group of prioritizedGroups.slice(0, 5)) { // Limit to 5 groups per query
          if (allPets.length >= maxPets) break;

          try {
            console.log(`[GRAPH API] Crawling group: "${group.name}" (ID: ${group.id})`);
            const posts = await getGroupPosts(group.id, accessToken, 50);
            console.log(`[GRAPH API] Found ${posts.length} posts from group "${group.name}"`);

            for (const post of posts) {
              if (allPets.length >= maxPets) break;
              if (seenPostIds.has(post.id)) continue;

              const pet = extractPetFromPost(post, `facebook:group:${group.name}`);
              if (pet) {
                allPets.push(pet);
                seenPostIds.add(pet.facebook_post_id!);
              }
            }

            await sleep(1000); // Rate limiting
          } catch (error: any) {
            result.errors.push(`Error processing group ${group.name}: ${error.message}`);
          }
        }

        await sleep(2000); // Rate limiting between queries
      } catch (error: any) {
        result.errors.push(`Error searching groups "${query}": ${error.message}`);
      }
    }

    console.log(`[GRAPH API] Crawling complete. Total pets found: ${allPets.length}`);

    // REMOVED: Sample pet creation - using live data only
    // If no pets found, return empty array (no mock data)
    if (allPets.length === 0) {
      console.log(`[GRAPH API] No pets found via API. Returning empty results (live data only).`);
    }

    result.petsFound = allPets.length;
    result.success = true;

    // Save pets
    console.log(`[GRAPH API] About to save ${allPets.length} pets to database...`);
    if (allPets.length > 0) {
      console.log(`[GRAPH API] Calling savePets function with ${allPets.length} pets`);
      const saveResult = await savePets(allPets);
      console.log(`[GRAPH API] Save result: saved=${saveResult.saved}, skipped=${saveResult.skipped}, errors=${saveResult.errors}`);
      result.petsSaved = saveResult.saved;
      result.errors.push(...saveResult.errors.map((e: string) => `Save error: ${e}`));
    } else {
      console.log(`[GRAPH API] No pets to save (allPets.length = 0)`);
    }

  } catch (error: any) {
    result.errors.push(`Graph API strategy failed: ${error.message}`);
  } finally {
    result.duration = Date.now() - startTime;
  }

  return result;
}

// ============================================
// BROWSER-BASED SCRAPING (Puppeteer)
// ============================================

// Lazy load Puppeteer
let puppeteer: any = null;
try {
  puppeteer = require('puppeteer');
  console.log('[BROWSER] Puppeteer loaded successfully');
} catch (e) {
  console.log('[BROWSER] Puppeteer not available:', (e as Error).message);
}

async function scrapeWithBrowser(location: string, maxPets: number = 100): Promise<ScrapeResult> {
  const startTime = Date.now();
  const requestId = `browser_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const result: ScrapeResult = {
    success: false,
    strategy: 'Browser (Puppeteer)',
    petsFound: 0,
    petsSaved: 0,
    errors: [],
    duration: 0,
    requestId: requestId
  };

  try {
    if (!puppeteer) {
      result.errors.push('Puppeteer not available');
      return result;
    }

    if (!FACEBOOK_EMAIL || !FACEBOOK_PASSWORD) {
      result.errors.push('Facebook credentials not configured (need FACEBOOK_EMAIL and FACEBOOK_PASSWORD)');
      return result;
    }

    console.log(`[BROWSER - ${requestId}] Starting browser-based Facebook scraping...`);

    const browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const allPets: ScrapedPet[] = [];

    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      // Login to Facebook
      console.log(`[BROWSER - ${requestId}] Logging in to Facebook...`);
      await page.goto('https://www.facebook.com/login', { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Enter email
      await page.type('input[name="email"], input[type="email"], input[id="email"]', FACEBOOK_EMAIL, { delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Enter password
      await page.type('input[name="pass"], input[type="password"], input[id="pass"]', FACEBOOK_PASSWORD, { delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Click login
      await page.click('button[type="submit"], button[name="login"], button[id="loginbutton"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log(`[BROWSER - ${requestId}] Logged in successfully`);

      // Search for rescue shelters and animal shelters in the location
      const searchQueries = [
        `animal shelter ${location}`,
        `dog rescue ${location}`,
        `lost pets ${location}`,
        `found pets ${location}`,
        `pet adoption ${location}`,
        'animal shelter',
        'dog rescue',
        'lost pets',
        'found pets'
      ];

      for (const query of searchQueries.slice(0, 5)) {
        if (allPets.length >= maxPets) break;

        try {
          console.log(`[BROWSER - ${requestId}] Searching for: "${query}"`);

          // Navigate to Facebook search
          await page.goto(`https://www.facebook.com/search/pages/?q=${encodeURIComponent(query)}`, {
            waitUntil: 'networkidle2',
            timeout: 30000
          });
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Scroll to load more results
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Extract page/group links from search results
          const resultLinks = await page.evaluate(() => {
            const links: string[] = [];
            const selectors = [
              'a[href*="/pages/"]',
              'a[href*="/groups/"]',
              'a[href*="/profile.php"]',
              'a[role="link"][href*="facebook.com"]'
            ];

            selectors.forEach(selector => {
              document.querySelectorAll(selector).forEach((link: any) => {
                const href = link.getAttribute('href') || link.href;
                if (href && href.includes('facebook.com') && !links.includes(href)) {
                  links.push(href);
                }
              });
            });

            return links.slice(0, 10); // Limit to 10 results per query
          });

          console.log(`[BROWSER - ${requestId}] Found ${resultLinks.length} results for "${query}"`);

          // Visit each page and extract posts
          for (const link of resultLinks.slice(0, 5)) {
            if (allPets.length >= maxPets) break;

            try {
              console.log(`[BROWSER - ${requestId}] Visiting: ${link.substring(0, 80)}...`);
              await page.goto(link, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
              await new Promise(resolve => setTimeout(resolve, 2000));

              // Scroll to load posts
              for (let i = 0; i < 3; i++) {
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await new Promise(resolve => setTimeout(resolve, 1000));
              }

              // Extract post data from the page
              const posts = await page.evaluate(() => {
                const postElements = Array.from(document.querySelectorAll('[data-pagelet*="FeedUnit"], [role="article"], div[data-testid*="post"]'));
                const posts: any[] = [];

                postElements.slice(0, 20).forEach((postEl: any) => {
                  const text = postEl.textContent || '';
                  const lowerText = text.toLowerCase();

                  // Check if this post is about pets
                  if (lowerText.includes('dog') || lowerText.includes('cat') ||
                      lowerText.includes('puppy') || lowerText.includes('kitten') ||
                      lowerText.includes('lost') || lowerText.includes('found') ||
                      lowerText.includes('missing') || lowerText.includes('pet')) {

                    // Try to find post ID
                    const postId = postEl.getAttribute('data-ft') ||
                                  postEl.getAttribute('data-pagelet') ||
                                  postEl.id ||
                                  '';

                    // Try to find post link
                    const linkEl = postEl.querySelector('a[href*="/posts/"], a[href*="/permalink/"]');
                    const postUrl = linkEl ? linkEl.getAttribute('href') : '';

                    posts.push({
                      id: postId || `post_${Date.now()}_${Math.random()}`,
                      message: text.substring(0, 1000),
                      fullText: text,
                      url: postUrl,
                      timestamp: new Date().toISOString()
                    });
                  }
                });

                return posts;
              });

              console.log(`[BROWSER - ${requestId}] Extracted ${posts.length} pet-related posts from page`);

              // Convert posts to pets
              for (const post of posts) {
                if (allPets.length >= maxPets) break;

                const pet = extractPetFromPost(post, `facebook:browser:${link}`);
                if (pet) {
                  allPets.push(pet);
                }
              }

              await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting

            } catch (error: any) {
              console.error(`[BROWSER - ${requestId}] Error visiting page:`, error.message);
              result.errors.push(`Error visiting ${link}: ${error.message}`);
            }
          }

          await new Promise(resolve => setTimeout(resolve, 3000)); // Rate limiting between searches

        } catch (error: any) {
          console.error(`[BROWSER - ${requestId}] Error searching "${query}":`, error.message);
          result.errors.push(`Error searching "${query}": ${error.message}`);
        }
      }

      result.petsFound = allPets.length;
      result.success = true;

      // Save pets
      if (allPets.length > 0) {
        const saveResult = await savePets(allPets);
        result.petsSaved = saveResult.saved;
        result.errors.push(...saveResult.errors);
      }

    } finally {
      await browser.close();
    }

  } catch (error: any) {
    result.errors.push(`Browser scraping failed: ${error.message}`);
    console.error(`[BROWSER - ${requestId}] Top-level error:`, error);
  } finally {
    result.duration = Date.now() - startTime;
  }

  return result;
}

// ============================================
// DATABASE OPERATIONS
// ============================================

async function savePets(pets: ScrapedPet[]): Promise<{ saved: number; skipped: number; errors: string[] }> {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  let saved = 0;
  let skipped = 0;
  const errorMessages: string[] = [];

  for (const pet of pets) {
    try {
      // Check for duplicates by Facebook post ID (most reliable)
      if (pet.facebook_post_id) {
        const { data: existing } = await supabase
          .from('lost_pets')
          .select('id')
          .eq('facebook_post_id', pet.facebook_post_id)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }
      }

      // Also check by name + location + status (fallback deduplication)
      // Always check for duplicates (live data only)
      {
        const { data: existingByName } = await supabase
          .from('lost_pets')
          .select('id')
          .eq('pet_name', pet.name)
          .eq('location_city', pet.location_city || 'Unknown')
          .eq('location_state', pet.location_state || '')
          .eq('status', pet.status)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Within 30 days
          .maybeSingle();

        if (existingByName) {
          console.log(`[SAVE] Skipping duplicate: ${pet.name} in ${pet.location_city}`);
          skipped++;
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
        description: pet.description || `Found via Facebook scraper`,
        photo_url: pet.photo_url || null,
        status: pet.status,
        location_city: pet.location_city || 'Unknown',
        location_state: pet.location_state || '',
        date_lost: pet.facebook_post_created
          ? new Date(pet.facebook_post_created).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        owner_name: pet.owner_name || 'Community',
        owner_email: pet.owner_email || null,
        owner_phone: pet.owner_phone || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Note: facebook_post_id column might not exist - we'll skip it for now
      // The migration to add it needs to be run: add_facebook_tracking_to_lost_pets.sql

      // Insert pet (without facebook_post_id for now to avoid schema errors)
      const { error: insertError, data: insertedData } = await supabase
        .from('lost_pets')
        .insert(insertData)
        .select();

      if (insertError) {
        const errorMsg = `Error saving ${pet.name}: ${insertError.message}`;
        console.error(`[SAVE] ${errorMsg}`);
        console.error(`[SAVE] Error details:`, JSON.stringify(insertError, null, 2));
        console.error(`[SAVE] Insert data attempted:`, JSON.stringify(insertData, null, 2));
        errorMessages.push(errorMsg);
      } else {
        saved++;
        console.log(`[SAVE] ✓ Successfully saved pet: ${pet.name} (${pet.type})`);
      }
    } catch (error: any) {
      const errorMsg = `Exception saving ${pet.name}: ${error.message}`;
      console.error(`[SAVE] ${errorMsg}`);
      console.error(`[SAVE] Exception stack:`, error.stack);
      errorMessages.push(errorMsg);
    }
  }

  console.log(`[SAVE] Final stats: saved=${saved}, skipped=${skipped}, errors=${errorMessages.length}`);
  return { saved, skipped, errors: errorMessages };
}

// ============================================
// MAIN API HANDLER
// ============================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`[BULLETPROOF SCRAPER] [${requestId}] Starting Facebook scraper request...`);

    if (!supabase) {
      console.error(`[BULLETPROOF SCRAPER] [${requestId}] Database not configured - missing Supabase credentials`);
      return NextResponse.json(
        {
          error: 'Database not configured',
          details: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
        },
        { status: 500 }
      );
    }

    // Test database connection and create table if needed
    const { error: dbTestError } = await supabase.from('lost_pets').select('id').limit(1);
    if (dbTestError && dbTestError.code === 'PGRST116') { // PGRST116 = table not found
      console.log(`[BULLETPROOF SCRAPER] [${requestId}] lost_pets table not found. Attempting to create...`);

      // Try to create table via setup endpoint
      try {
        const setupResponse = await fetch(`${request.nextUrl.origin}/api/petreunion/setup-table`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!setupResponse.ok) {
          console.error(`[BULLETPROOF SCRAPER] [${requestId}] Failed to create table`);
          return NextResponse.json(
            {
              error: 'lost_pets table not found',
              details: 'Please run CREATE_LOST_PETS_TABLE.sql in Supabase SQL Editor',
              fix: 'Go to: https://supabase.com/dashboard/project/nqkbqtiramecvmmpaxzk/sql/new'
            },
            { status: 500 }
          );
        }
      } catch (setupError: any) {
        console.error(`[BULLETPROOF SCRAPER] [${requestId}] Setup error:`, setupError);
        return NextResponse.json(
          {
            error: 'lost_pets table not found',
            details: 'Please run CREATE_LOST_PETS_TABLE.sql in Supabase SQL Editor',
            fix: 'Go to: https://supabase.com/dashboard/project/nqkbqtiramecvmmpaxzk/sql/new'
          },
          { status: 500 }
        );
      }
    } else if (dbTestError && dbTestError.code !== 'PGRST116') {
      console.error(`[BULLETPROOF SCRAPER] [${requestId}] Database connection test failed:`, dbTestError);
      return NextResponse.json(
        {
          error: 'Database connection failed',
          details: dbTestError.message,
          code: dbTestError.code
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch((parseError: any) => {
      console.warn(`[BULLETPROOF SCRAPER] [${requestId}] Failed to parse JSON body:`, parseError.message);
      return {};
    });

    const {
      location = 'Alabama',
      maxPets = 100,
      strategies = ['browser', 'graph-api'] // Browser scraping and Facebook Graph API
    } = body;

    console.log(`[BULLETPROOF SCRAPER] [${requestId}] Configuration:`, { location, maxPets, strategies });
    console.log(`[BULLETPROOF SCRAPER] [${requestId}] Location: ${location}`);
    console.log(`[BULLETPROOF SCRAPER] [${requestId}] Max pets: ${maxPets}`);
    console.log(`[BULLETPROOF SCRAPER] [${requestId}] Strategies: ${strategies.join(', ')}`);

    const results: ScrapeResult[] = [];
    let totalPetsFound = 0;
    let totalPetsSaved = 0;

    // Petfinder API removed - discontinued Dec 2025
    // RescueGroups API commented out - keys not available
    /*
    // Try RescueGroups API (if Petfinder didn't find enough)
    if (strategies.includes('rescuegroups-api') && totalPetsFound < maxPets) {
      try {
        console.log(`[BULLETPROOF SCRAPER] [${requestId}] Starting RescueGroups API scrape...`);
        const result = await scrapeWithRescueGroupsAPI(location, maxPets - totalPetsFound);
        console.log(`[BULLETPROOF SCRAPER] [${requestId}] RescueGroups API scrape completed:`, {
          success: result.success,
          petsFound: result.petsFound,
          petsSaved: result.petsSaved,
          errors: result.errors.length
        });
        results.push(result);
        totalPetsFound += result.petsFound;
        totalPetsSaved += result.petsSaved;
      } catch (error: any) {
        console.error(`[BULLETPROOF SCRAPER] [${requestId}] RescueGroups API scrape failed:`, error);
        results.push({
          success: false,
          strategy: 'RescueGroups API',
          petsFound: 0,
          petsSaved: 0,
          errors: [error.message || 'Unknown error'],
          duration: 0
        });
      }
    }
    */

    // Try Browser strategy (if APIs didn't find enough)
    if (strategies.includes('browser') && totalPetsFound < maxPets) {
      try {
        console.log(`[BULLETPROOF SCRAPER] [${requestId}] Starting Browser scrape...`);
        const result = await scrapeWithBrowser(location, maxPets);
        console.log(`[BULLETPROOF SCRAPER] [${requestId}] Browser scrape completed:`, {
          success: result.success,
          petsFound: result.petsFound,
          petsSaved: result.petsSaved,
          errors: result.errors.length
        });
        results.push(result);
        totalPetsFound += result.petsFound;
        totalPetsSaved += result.petsSaved;

        // If browser found pets, we can skip Graph API
        if (result.petsFound > 0) {
          console.log(`[BULLETPROOF SCRAPER] [${requestId}] Browser found ${result.petsFound} pets, skipping Graph API`);
        }
      } catch (error: any) {
        console.error(`[BULLETPROOF SCRAPER] [${requestId}] Browser scrape failed:`, error);
        results.push({
          success: false,
          strategy: 'Browser',
          petsFound: 0,
          petsSaved: 0,
          errors: [error.message || 'Unknown error'],
          duration: 0
        });
      }
    }

    // Try Graph API strategy (if browser didn't find enough pets)
    if (strategies.includes('graph-api') && totalPetsFound < maxPets) {
      try {
        console.log(`[BULLETPROOF SCRAPER] [${requestId}] Starting Graph API scrape...`);
        const result = await scrapeWithGraphAPI(location, maxPets);
        console.log(`[BULLETPROOF SCRAPER] [${requestId}] Graph API scrape completed:`, {
          success: result.success,
          petsFound: result.petsFound,
          petsSaved: result.petsSaved,
          errors: result.errors.length
        });
        results.push(result);
      } catch (error: any) {
        console.error(`[BULLETPROOF SCRAPER] [${requestId}] Graph API scrape failed:`, error);
        console.error(`[BULLETPROOF SCRAPER] [${requestId}] Error stack:`, error.stack);
        results.push({
          success: false,
          strategy: 'Graph API',
          petsFound: 0,
          petsSaved: 0,
          errors: [error.message || 'Unknown error'],
          duration: Date.now() - startTime
        });
      }
    }

    // Try Browser strategy (more reliable for getting real pets)
    if (strategies.includes('browser')) {
      try {
        console.log(`[BULLETPROOF SCRAPER] [${requestId}] Starting Browser scrape...`);
        const result = await scrapeWithBrowser(location, maxPets);
        console.log(`[BULLETPROOF SCRAPER] [${requestId}] Browser scrape completed:`, {
          success: result.success,
          petsFound: result.petsFound,
          petsSaved: result.petsSaved,
          errors: result.errors.length
        });
        results.push(result);
      } catch (error: any) {
        console.error(`[BULLETPROOF SCRAPER] [${requestId}] Browser scrape failed:`, error);
        results.push({
          success: false,
          strategy: 'Browser',
          petsFound: 0,
          petsSaved: 0,
          errors: [error.message || 'Unknown error'],
          duration: 0
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const summary = {
      totalFound: results.reduce((sum, r) => sum + r.petsFound, 0),
      totalSaved: results.reduce((sum, r) => sum + r.petsSaved, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      duration: totalDuration,
      strategies: results.length
    };

    console.log(`[BULLETPROOF SCRAPER] [${requestId}] Summary:`, summary);

    // Save to scrape_logs table
    try {
      if (supabase) {
        await supabase.from('scrape_logs').insert({
          location: location,
          pets_found: summary.totalFound,
          pets_saved: summary.totalSaved,
          errors: summary.totalErrors > 0 ? results.flatMap(r => r.errors) : [],
          duration_ms: totalDuration,
          success: summary.totalErrors === 0,
          strategy: strategies.join(','),
          metadata: {
            requestId,
            maxPets,
            results
          }
        });
        console.log(`[BULLETPROOF SCRAPER] [${requestId}] Logged to scrape_logs table`);
      }
    } catch (logError: any) {
      console.error(`[BULLETPROOF SCRAPER] [${requestId}] Failed to log to scrape_logs:`, logError.message);
    }

    return NextResponse.json({
      success: summary.totalErrors === 0,
      requestId,
      summary,
      results,
      message: `Scraped ${summary.totalFound} pets, saved ${summary.totalSaved} to database`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    const errorId = `err_${Date.now()}`;
    console.error(`[BULLETPROOF SCRAPER] [${requestId}] [${errorId}] Fatal error:`, error);
    console.error(`[BULLETPROOF SCRAPER] [${requestId}] [${errorId}] Error stack:`, error.stack);

    return NextResponse.json(
      {
        error: error.message || 'Failed to scrape Facebook',
        errorId,
        requestId,
        success: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  const hasAccessToken = !!FACEBOOK_ACCESS_TOKEN;
  const hasAppCredentials = !!(FACEBOOK_APP_ID && FACEBOOK_APP_SECRET);
  const hasEmailPassword = !!(FACEBOOK_EMAIL && FACEBOOK_PASSWORD);

  // Try to get token to test
  let tokenStatus = 'not_configured';
  if (hasAccessToken) {
    tokenStatus = 'direct_token_available';
  } else if (hasAppCredentials) {
    tokenStatus = 'app_credentials_available';
    // Test if we can get a token
    try {
      const testToken = await getFacebookAccessToken();
      tokenStatus = testToken ? 'app_token_works' : 'app_token_failed';
    } catch (e) {
      tokenStatus = 'app_token_error';
    }
  } else if (hasEmailPassword) {
    tokenStatus = 'email_password_only_note_graph_api_requires_app_credentials';
  }

  return NextResponse.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    strategies: ['graph-api'],
    database: supabase ? 'connected' : 'not configured',
    facebook_credentials: {
      has_access_token: hasAccessToken,
      has_app_credentials: hasAppCredentials,
      has_email_password: hasEmailPassword,
      token_status: tokenStatus,
      note: hasEmailPassword && !hasAppCredentials && !hasAccessToken
        ? 'Email/password found but Graph API requires FACEBOOK_APP_ID + FACEBOOK_APP_SECRET or FACEBOOK_ACCESS_TOKEN'
        : undefined
    }
  });
}
