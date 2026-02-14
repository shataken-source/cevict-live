import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Facebook credentials
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || '';

interface Shelter {
  id: string;
  name: string;
  category?: string;
  location?: string;
}

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
  location_city?: string;
  location_state?: string;
  source: string;
  source_url?: string;
  facebook_post_id?: string;
  facebook_post_created?: string;
}

// Get Facebook access token
async function getFacebookAccessToken(): Promise<string | null> {
  if (FACEBOOK_ACCESS_TOKEN) {
    return FACEBOOK_ACCESS_TOKEN;
  }

  if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
    try {
      const url = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&grant_type=client_credentials`;
      const response = await fetch(url);
      const data = await response.json();
      return data.access_token || null;
    } catch (error: any) {
      console.error('[FACEBOOK] Error getting access token:', error.message);
    }
  }

  return null;
}

// Search Facebook for shelters in a specific area
async function searchSheltersInArea(area: string, accessToken: string): Promise<Shelter[]> {
  const queries = [
    `animal shelter ${area}`,
    `pet rescue ${area}`,
    `dog shelter ${area}`,
    `cat shelter ${area}`,
    `animal rescue ${area}`,
    `humane society ${area}`,
    `SPCA ${area}`
  ];

  const allShelters: Map<string, Shelter> = new Map();

  for (const query of queries) {
    try {
      const url = `https://graph.facebook.com/v18.0/search?q=${encodeURIComponent(query)}&type=page&access_token=${accessToken}&limit=10&fields=id,name,category,location`;
      console.log(`[SHELTER SEARCH] Searching: "${query}"`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        console.error(`[SHELTER SEARCH] Error for "${query}":`, data.error.message);
        continue;
      }
      
      const pages = data.data || [];
      console.log(`[SHELTER SEARCH] Found ${pages.length} pages for "${query}"`);
      
      for (const page of pages) {
        // Filter for relevant categories
        const category = (page.category || '').toLowerCase();
        const name = (page.name || '').toLowerCase();
        
        if (
          category.includes('animal') || 
          category.includes('shelter') || 
          category.includes('rescue') ||
          category.includes('non-profit') ||
          name.includes('shelter') ||
          name.includes('rescue') ||
          name.includes('spca') ||
          name.includes('humane')
        ) {
          if (!allShelters.has(page.id)) {
            allShelters.set(page.id, {
              id: page.id,
              name: page.name,
              category: page.category,
              location: page.location ? `${page.location.city || ''} ${page.location.state || ''}`.trim() : undefined
            });
          }
        }
      }
      
      // Small delay between searches
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`[SHELTER SEARCH] Error searching "${query}":`, error.message);
    }
  }

  return Array.from(allShelters.values());
}

// Get posts from a Facebook page
async function getPagePosts(pageId: string, accessToken: string, limit: number = 50): Promise<any[]> {
  try {
    const url = `https://graph.facebook.com/v18.0/${pageId}/posts?access_token=${accessToken}&fields=id,message,created_time,full_picture,picture,permalink_url,attachments{media{image{src}},subattachments{media{image{image{src}}}}},place{name,location{city,state,country}}&limit=${limit}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error(`[PAGE POSTS] Error getting posts from page ${pageId}:`, data.error.message);
      return [];
    }
    
    return data.data || [];
  } catch (error: any) {
    console.error(`[PAGE POSTS] Error for page ${pageId}:`, error.message);
    return [];
  }
}

// Extract pet information from a Facebook post
function extractPetFromPost(post: any, shelterName: string, area: string): ScrapedPet | null {
  const message = (post.message || '').toLowerCase();
  const text = message;
  
  // Look for pet-related keywords
  const petKeywords = ['dog', 'puppy', 'pup', 'cat', 'kitten', 'kitty', 'adopt', 'adoption', 'rescue', 'foster', 'available', 'looking for'];
  const hasPetKeywords = petKeywords.some(keyword => text.includes(keyword));
  
  if (!hasPetKeywords && !post.full_picture && !post.picture) {
    return null; // Not a pet post
  }
  
  // Try to extract pet name
  const namePatterns = [
    /(?:name|named|call(?:ed|s)?)\s+(?:is\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is|was|needs|looking)/i,
    /meet\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  ];
  
  let name = 'Unknown';
  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      name = match[1].trim();
      break;
    }
  }
  
  // Determine type (dog or cat)
  const isDog = text.includes('dog') || text.includes('puppy') || text.includes('pup');
  const isCat = text.includes('cat') || text.includes('kitten') || text.includes('kitty');
  const type: 'dog' | 'cat' = isDog ? 'dog' : (isCat ? 'cat' : 'dog'); // Default to dog
  
  // Extract breed
  const breedPatterns = [
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Mix|Mix Breed|Mixed|Retriever|Shepherd|Terrier|Hound|Spaniel|Setter|Pointer|Bulldog|Poodle|Collie|Husky|Malamute|Chihuahua|Dachshund|Beagle|Boxer|Rottweiler|Doberman|Labrador|Golden|German|Australian|Border|Corgi|Pomeranian|Shih Tzu|Yorkshire|Boston|French|English|American|Staffordshire|Pit|Bull|Pug|Basset|Bloodhound|Coonhound|Foxhound|Greyhound|Whippet|Shiba|Akita|Chow|Shar Pei|Lhasa|Tibetan|Maltese|Bichon|Havanese|Coton|Papillon|Pekingese|Persian|Siamese|Maine Coon|Ragdoll|British Shorthair|Scottish Fold|Bengal|Sphynx))/i,
    /(?:breed|is a)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  ];
  
  let breed = 'Mixed Breed';
  for (const pattern of breedPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      breed = match[1].trim();
      break;
    }
  }
  
  // Extract age
  const ageMatch = message.match(/(\d+\s*(?:yr|year|years|mo|month|months|old|weeks?|days?))/i);
  const age = ageMatch ? ageMatch[1] : 'Unknown';
  
  // Extract gender
  const genderMatch = message.match(/(male|female|m|f)\b/i);
  const gender = genderMatch ? genderMatch[1] : 'Unknown';
  
  // Get photo
  const photo = post.full_picture || post.picture || 
    (post.attachments?.data?.[0]?.media?.image?.src) ||
    (post.attachments?.data?.[0]?.subattachments?.data?.[0]?.media?.image?.src) ||
    '';
  
  // Extract location
  const location = post.place?.location;
  const city = location?.city || area.split(',')[0]?.trim();
  const state = location?.state || area.split(',')[1]?.trim();
  
  return {
    name,
    type,
    breed,
    age,
    gender,
    size: 'medium',
    color: 'N/A',
    photo_url: photo,
    description: post.message || `${age}, ${gender} ${breed} from ${shelterName}`,
    location_city: city,
    location_state: state,
    source: `facebook:shelter:${shelterName}`,
    source_url: post.permalink_url || `https://www.facebook.com/${post.id}`,
    facebook_post_id: post.id,
    facebook_post_created: post.created_time
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    if (!supabase) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          message: 'Missing Supabase environment variables'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const areas: string[] = body.areas || [
      'New York, NY',
      'Los Angeles, CA',
      'San Diego, CA',
      'Seattle, WA',
      'Dallas, TX'
    ];
    const maxSheltersPerArea = body.maxSheltersPerArea || 5;
    const maxPostsPerShelter = body.maxPostsPerShelter || 20;

    console.log(`[SHELTER SCRAPER] Starting scrape for ${areas.length} areas`);

    const accessToken = await getFacebookAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Facebook access token not available',
          message: 'Please configure FACEBOOK_ACCESS_TOKEN or FACEBOOK_APP_ID + FACEBOOK_APP_SECRET'
        },
        { status: 500 }
      );
    }

    const allPets: ScrapedPet[] = [];
    const seenPostIds = new Set<string>();
    const results = {
      areasProcessed: 0,
      sheltersFound: 0,
      sheltersScraped: 0,
      petsFound: 0,
      petsSaved: 0,
      errors: [] as string[]
    };

    // Process each area
    for (const area of areas) {
      try {
        console.log(`\n[SHELTER SCRAPER] Processing area: ${area}`);
        
        // Search for shelters in this area
        const shelters = await searchSheltersInArea(area, accessToken);
        console.log(`[SHELTER SCRAPER] Found ${shelters.length} shelters in ${area}`);
        
        if (shelters.length === 0) {
          results.errors.push(`No shelters found in ${area}`);
          continue;
        }

        results.sheltersFound += shelters.length;
        results.areasProcessed++;

        // Limit shelters per area
        const sheltersToScrape = shelters.slice(0, maxSheltersPerArea);
        
        // Scrape each shelter's posts
        for (const shelter of sheltersToScrape) {
          try {
            console.log(`[SHELTER SCRAPER] Scraping shelter: ${shelter.name}`);
            
            const posts = await getPagePosts(shelter.id, accessToken, maxPostsPerShelter);
            console.log(`[SHELTER SCRAPER] Found ${posts.length} posts from ${shelter.name}`);
            
            if (posts.length === 0) {
              continue;
            }

            results.sheltersScraped++;

            // Extract pets from posts
            for (const post of posts) {
              if (seenPostIds.has(post.id)) {
                continue; // Skip duplicates
              }

              const pet = extractPetFromPost(post, shelter.name, area);
              if (pet) {
                seenPostIds.add(post.id);
                allPets.push(pet);
                results.petsFound++;
              }
            }

            // Delay between shelters
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (shelterError: any) {
            console.error(`[SHELTER SCRAPER] Error scraping shelter ${shelter.name}:`, shelterError.message);
            results.errors.push(`Error scraping ${shelter.name}: ${shelterError.message}`);
          }
        }

        // Delay between areas
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (areaError: any) {
        console.error(`[SHELTER SCRAPER] Error processing area ${area}:`, areaError.message);
        results.errors.push(`Error processing ${area}: ${areaError.message}`);
      }
    }

    // Save pets to database
    console.log(`[SHELTER SCRAPER] Saving ${allPets.length} pets to database...`);
    
    for (const pet of allPets) {
      try {
        // Check for duplicates
        const { data: existing } = await supabase
          .from('lost_pets')
          .select('id')
          .eq('pet_name', pet.name)
          .eq('location_city', pet.location_city || '')
          .single();

        if (existing) {
          continue; // Skip duplicates
        }

        // Save pet
        const { data: newPet, error: petError } = await supabase
          .from('lost_pets')
          .insert({
            pet_name: pet.name,
            pet_type: pet.type,
            breed: pet.breed,
            color: pet.color,
            size: pet.size,
            description: pet.description,
            photo_url: pet.photo_url || null,
            status: 'found',
            location_city: pet.location_city || 'Unknown',
            location_state: pet.location_state || 'AL',
            date_lost: pet.facebook_post_created 
              ? new Date(pet.facebook_post_created).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0]
          })
          .select()
          .single();

        if (petError) {
          console.error(`[SHELTER SCRAPER] Error saving pet ${pet.name}:`, petError.message);
          results.errors.push(`Error saving ${pet.name}: ${petError.message}`);
        } else if (newPet) {
          results.petsSaved++;
        }
      } catch (petError: any) {
        console.error(`[SHELTER SCRAPER] Error processing pet ${pet.name}:`, petError.message);
        results.errors.push(`Error processing ${pet.name}: ${petError.message}`);
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      areasProcessed: results.areasProcessed,
      sheltersFound: results.sheltersFound,
      sheltersScraped: results.sheltersScraped,
      petsFound: results.petsFound,
      petsSaved: results.petsSaved,
      duration,
      errors: results.errors.length > 0 ? results.errors : undefined,
      message: `Scraped ${results.sheltersScraped} shelters, found ${results.petsFound} pets, saved ${results.petsSaved} to database`
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[SHELTER SCRAPER] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        duration
      },
      { status: 500 }
    );
  }
}


