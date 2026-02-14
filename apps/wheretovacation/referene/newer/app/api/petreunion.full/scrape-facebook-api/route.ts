import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Facebook Graph API credentials
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || '';

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
}

// Get Facebook access token (app token or user token)
async function getFacebookAccessToken(): Promise<string | null> {
  // If we have a user access token, use it
  if (FACEBOOK_ACCESS_TOKEN) {
    return FACEBOOK_ACCESS_TOKEN;
  }
  
  // Otherwise, get an app access token
  if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/oauth/access_token?client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&grant_type=client_credentials`
      );
      const data = await response.json();
      return data.access_token || null;
    } catch (error: any) {
      console.error('[FACEBOOK API] Error getting app token:', error.message);
      return null;
    }
  }
  
  return null;
}

// Search for pages using Facebook Graph API
async function searchFacebookPages(query: string, accessToken: string): Promise<any[]> {
  try {
    const url = `https://graph.facebook.com/v18.0/search?q=${encodeURIComponent(query)}&type=page&access_token=${accessToken}&limit=25`;
    console.log(`[FACEBOOK API] Searching for pages: ${query}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error(`[FACEBOOK API] Error:`, data.error);
      return [];
    }
    
    return data.data || [];
  } catch (error: any) {
    console.error(`[FACEBOOK API] Search error:`, error.message);
    return [];
  }
}

// Get posts from a Facebook page
async function getPagePosts(pageId: string, accessToken: string): Promise<any[]> {
  try {
    const url = `https://graph.facebook.com/v18.0/${pageId}/posts?access_token=${accessToken}&fields=id,message,created_time,full_picture,permalink_url&limit=50`;
    console.log(`[FACEBOOK API] Getting posts from page: ${pageId}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error(`[FACEBOOK API] Error getting posts:`, data.error);
      return [];
    }
    
    return data.data || [];
  } catch (error: any) {
    console.error(`[FACEBOOK API] Posts error:`, error.message);
    return [];
  }
}

// Extract pet info from Facebook post
function extractPetFromPost(post: any, pageName: string): ScrapedPet | null {
  const message = post.message || '';
  const messageLower = message.toLowerCase();
  
  // Look for pet-related keywords
  const hasPetKeywords = messageLower.includes('lost') || 
                        messageLower.includes('found') ||
                        messageLower.includes('missing') ||
                        messageLower.includes('adopt') ||
                        messageLower.includes('dog') ||
                        messageLower.includes('cat') ||
                        messageLower.includes('puppy') ||
                        messageLower.includes('kitten');
  
  if (!hasPetKeywords) {
    return null;
  }
  
  // Extract name
  const namePatterns = [
    /(?:lost|found|missing)\s+(?:dog|cat|puppy|kitten)\s+named\s+([A-Z][a-z]+)/i,
    /(?:dog|cat|puppy|kitten)\s+named\s+([A-Z][a-z]+)/i,
    /name[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ];
  
  let name = 'Unknown';
  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      name = match[1].trim();
      break;
    }
  }
  
  // Extract breed
  const breedPatterns = [
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Mix|Breed|Retriever|Shepherd|Terrier|Hound|Spaniel|Bulldog|Poodle|Labrador|Golden|German|Pit|Boxer|Beagle|Chihuahua|Dachshund|Rottweiler|Siberian|Border|Australian|Collie|Great|Saint|Mastiff|Newfoundland|Bernese|Akita|Shiba|Husky|Malamute|Samoyed|Chow|Shar|Pug|Boston|French|English|American|Staffordshire|Bull|Jack|Russell|Yorkshire|West|Scottish|Cairn|Norfolk|Norwich|Schnauzer|Shih|Lhasa|Maltese|Pomeranian|Papillon|Pekingese|Tibetan|Bichon|Cocker|Springer|Brittany|Pointer|Setter|Weimaraner|Vizsla|Rhodesian|Basenji))/i,
  ];
  
  let breed = 'Mixed Breed';
  for (const pattern of breedPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      breed = match[1].trim();
      break;
    }
  }
  
  // Determine type
  let type: 'dog' | 'cat' = 'dog';
  if (messageLower.includes('cat') || messageLower.includes('kitten')) {
    type = 'cat';
  }
  
  // Determine status
  let status: 'lost' | 'found' = 'found';
  if (messageLower.includes('lost') || messageLower.includes('missing')) {
    status = 'lost';
  }
  
  // Extract location
  const locationPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*[A-Z]{2})/;
  const locationMatch = message.match(locationPattern);
  let location_city = 'Unknown';
  let location_state = 'AL';
  if (locationMatch) {
    const [city, state] = locationMatch[1].split(',').map(s => s.trim());
    location_city = city;
    location_state = state;
  }
  
  const pet: ScrapedPet = {
    name,
    type,
    breed,
    description: message.substring(0, 500),
    status,
    location_city,
    location_state,
    photo_url: post.full_picture || undefined,
    source: 'facebook',
    source_url: post.permalink_url || undefined,
  };
  
  return pet;
}

// Save pets to database
async function savePets(pets: ScrapedPet[]): Promise<{ saved: number; skipped: number; errors: number }> {
  if (!supabase) {
    throw new Error('Database not configured');
  }
  
  let saved = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const pet of pets) {
    try {
      // Check for duplicates
      const { data: existing } = await supabase
        .from('lost_pets')
        .select('id')
        .eq('pet_name', pet.name)
        .ilike('location_city', pet.location_city || '')
        .eq('status', pet.status)
        .limit(1)
        .single();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Determine date
      const dateField = pet.status === 'lost' ? 'date_lost' : 'date_found';
      const dateValue = new Date().toISOString().split('T')[0];
      
      // Save pet
      const { error: insertError } = await supabase
        .from('lost_pets')
        .insert({
          pet_name: pet.name,
          pet_type: pet.type,
          breed: pet.breed,
          color: pet.color || 'N/A',
          size: pet.size || 'medium',
          description: pet.description,
          photo_url: pet.photo_url || null,
          status: pet.status,
          location_city: pet.location_city || 'Unknown',
          location_state: pet.location_state || 'AL',
          [dateField]: dateValue,
          owner_name: 'Community',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error(`[SAVE] Error saving ${pet.name}:`, insertError.message);
        errors++;
      } else {
        saved++;
      }
    } catch (error: any) {
      console.error(`[SAVE] Error processing ${pet.name}:`, error.message);
      errors++;
    }
  }
  
  return { saved, skipped, errors };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      queries = ['animal shelters', 'pet rescue', 'lost and found pets'],
      location = 'Alabama',
      durationMinutes = 10
    } = body;

    console.log(`[FACEBOOK API] Starting Facebook Graph API scraper...`);
    console.log(`[FACEBOOK API] Queries: ${queries.join(', ')}`);
    console.log(`[FACEBOOK API] Location: ${location}`);
    console.log(`[FACEBOOK API] Duration: ${durationMinutes} minutes`);

    // Get access token
    const accessToken = await getFacebookAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { 
          error: 'Facebook API credentials not configured. Need FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, or FACEBOOK_ACCESS_TOKEN',
          success: false 
        },
        { status: 500 }
      );
    }

    console.log(`[FACEBOOK API] Got access token`);

    const allPets: ScrapedPet[] = [];
    const results: any[] = [];
    const startTime = Date.now();
    const endTime = startTime + (durationMinutes * 60 * 1000);
    let processedPages = 0;

    // Search for pages
    for (const query of queries) {
      if (Date.now() >= endTime) {
        break;
      }
      
      const pages = await searchFacebookPages(`${query} ${location}`, accessToken);
      console.log(`[FACEBOOK API] Found ${pages.length} pages for "${query}"`);
      
      // Get posts from each page
      for (const page of pages.slice(0, 10)) { // Limit to 10 pages per query
        if (Date.now() >= endTime) {
          break;
        }
        
        try {
          const posts = await getPagePosts(page.id, accessToken);
          console.log(`[FACEBOOK API] Got ${posts.length} posts from ${page.name}`);
          
          // Extract pets from posts
          for (const post of posts) {
            const pet = extractPetFromPost(post, page.name);
            if (pet) {
              allPets.push(pet);
            }
          }
          
          processedPages++;
          
          // Rate limiting - wait 1 second between pages
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error: any) {
          console.error(`[FACEBOOK API] Error processing page ${page.name}:`, error.message);
        }
      }
    }

    console.log(`[FACEBOOK API] Found ${allPets.length} pets total`);

    // Save pets
    const saveResult = await savePets(allPets);

    const totalDuration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      summary: {
        totalFound: allPets.length,
        totalSaved: saveResult.saved,
        totalSkipped: saveResult.skipped,
        totalErrors: saveResult.errors,
        duration: totalDuration,
        pagesProcessed: processedPages
      },
      pets: allPets.slice(0, 50), // Return first 50 pets for reference
      message: `Scraped ${allPets.length} pets using Facebook Graph API, saved ${saveResult.saved} to database`
    });

  } catch (error: any) {
    console.error('[FACEBOOK API] Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to scrape Facebook',
        success: false 
      },
      { status: 500 }
    );
  }
}

