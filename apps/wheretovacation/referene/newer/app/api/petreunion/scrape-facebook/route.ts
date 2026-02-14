import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

interface FacebookPet {
  name: string;
  type: 'dog' | 'cat';
  breed: string;
  description: string;
  photo_url?: string;
  status: 'lost' | 'found';
  location_city?: string;
  location_state?: string;
  post_url?: string;
  contact_info?: string;
  date_posted?: string;
}

// Extract pet information from Facebook post text
function extractPetInfoFromText(text: string, postUrl?: string): FacebookPet | null {
  const lowerText = text.toLowerCase();
  
  // Determine if it's lost or found
  const isLost = lowerText.includes('lost') || lowerText.includes('missing') || lowerText.includes('disappeared');
  const isFound = lowerText.includes('found') || lowerText.includes('rescued') || lowerText.includes('picked up');
  
  if (!isLost && !isFound) {
    return null; // Not a pet post
  }
  
  const status: 'lost' | 'found' = isLost ? 'lost' : 'found';
  
  // Extract pet name (common patterns)
  const namePatterns = [
    /(?:name|named|called|pet)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is|was|went|got)\s+(?:lost|missing|found)/i,
    /(?:my|our)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  ];
  
  let name = 'Unknown';
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      name = match[1].trim();
      break;
    }
  }
  
  // Extract breed
  const breedPatterns = [
    /(?:breed|type)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+Mix|Mix Breed|Mixed)?)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:dog|cat|puppy|kitten)/i,
    /(Labrador|Golden|German Shepherd|Pit Bull|Beagle|Boxer|Bulldog|Poodle|Chihuahua|Dachshund|Husky|Malamute|Retriever|Terrier|Spaniel|Setter|Pointer|Collie|Corgi|Pomeranian|Shih Tzu|Yorkshire|Boston|French|English|American|Staffordshire|Pit|Bull|Pug|Basset|Bloodhound|Coonhound|Foxhound|Greyhound|Whippet|Saluki|Afghan|Borzoi|Irish|Scottish|Welsh|Persian|Siamese|Maine Coon|Ragdoll|British Shorthair|Abyssinian|Bengal|Russian Blue|Mix|Mixed|Mutt)/i
  ];
  
  let breed = 'Mixed Breed';
  for (const pattern of breedPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      breed = match[1].trim();
      break;
    }
  }
  
  // Determine type
  const isCat = lowerText.includes('cat') || lowerText.includes('kitten') || 
                lowerText.includes('feline') || breed.match(/(Persian|Siamese|Maine Coon|Ragdoll|British Shorthair|Abyssinian|Bengal|Russian Blue)/i);
  const type: 'dog' | 'cat' = isCat ? 'cat' : 'dog';
  
  // Extract location
  const locationPattern = /(?:in|near|at|location|last seen)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s*,\s*[A-Z]{2})?)/i;
  const locationMatch = text.match(locationPattern);
  const locationParts = locationMatch ? locationMatch[1].split(',').map(s => s.trim()) : [];
  const location_city = locationParts[0] || undefined;
  const location_state = locationParts[1] || 'AL';
  
  // Extract contact info
  const phonePattern = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/;
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const phoneMatch = text.match(phonePattern);
  const emailMatch = text.match(emailPattern);
  const contact_info = phoneMatch ? phoneMatch[1] : (emailMatch ? emailMatch[1] : undefined);
  
  // Extract date
  const datePattern = /(?:lost|found|missing|went missing|disappeared)[\s:]+(?:on\s+)?(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|(?:yesterday|today|last\s+(?:week|month|year)))/i;
  const dateMatch = text.match(datePattern);
  let date_posted: string | undefined;
  if (dateMatch) {
    const dateStr = dateMatch[1];
    if (dateStr.includes('today')) {
      date_posted = new Date().toISOString().split('T')[0];
    } else if (dateStr.includes('yesterday')) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      date_posted = yesterday.toISOString().split('T')[0];
    } else {
      // Try to parse date
      try {
        date_posted = new Date(dateStr).toISOString().split('T')[0];
      } catch (e) {
        date_posted = new Date().toISOString().split('T')[0];
      }
    }
  } else {
    date_posted = new Date().toISOString().split('T')[0];
  }
  
  return {
    name,
    type,
    breed,
    description: text.substring(0, 500), // First 500 chars
    status,
    location_city,
    location_state,
    post_url: postUrl,
    contact_info,
    date_posted
  };
}

// Scrape Facebook using public search or groups
async function scrapeFacebookPosts(location: string = 'Alabama', maxPosts: number = 50): Promise<FacebookPet[]> {
  const pets: FacebookPet[] = [];
  
  console.log(`[FACEBOOK] Scraping Facebook for location: ${location}`);
  
  // Facebook scraping options:
  // 1. Facebook Graph API (requires app approval and access tokens)
  // 2. Public group scraping (with rate limiting and respect for robots.txt)
  // 3. Third-party service (Apify, ScraperAPI, etc.)
  
  // For now, we'll implement a structure that can work with:
  // - Facebook Graph API (if configured)
  // - Public group URLs (if provided)
  // - Search results (if accessible)
  
  try {
    // Option 1: Try Facebook Graph API if configured
    const facebookAccessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    const facebookAppId = process.env.FACEBOOK_APP_ID;
    
    if (facebookAccessToken && facebookAppId) {
      console.log(`[FACEBOOK] Using Facebook Graph API...`);
      
      // Search for posts in public groups/pages
      const searchQueries = [
        `lost dog ${location}`,
        `lost cat ${location}`,
        `found dog ${location}`,
        `found cat ${location}`,
        `missing pet ${location}`
      ];
      
      for (const query of searchQueries) {
        try {
          // Facebook Graph API search endpoint
          const graphUrl = `https://graph.facebook.com/v18.0/search?q=${encodeURIComponent(query)}&type=post&access_token=${facebookAccessToken}&limit=10`;
          
          const response = await fetch(graphUrl);
          if (response.ok) {
            const data = await response.json();
            if (data.data && Array.isArray(data.data)) {
              for (const post of data.data) {
                if (post.message) {
                  const petInfo = extractPetInfoFromText(post.message, post.permalink_url);
                  if (petInfo) {
                    petInfo.photo_url = post.attachments?.data?.[0]?.media?.image?.src;
                    pets.push(petInfo);
                  }
                }
              }
            }
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error: any) {
          console.error(`[FACEBOOK] Graph API error for "${query}":`, error.message);
        }
      }
    } else {
      console.log(`[FACEBOOK] Facebook Graph API not configured`);
      console.log(`[FACEBOOK] Set FACEBOOK_ACCESS_TOKEN and FACEBOOK_APP_ID to enable`);
    }
    
    // Option 2: Scrape public Facebook groups (if group URLs provided)
    const facebookGroupUrls = process.env.FACEBOOK_GROUP_URLS?.split(',') || [];
    
    if (facebookGroupUrls.length > 0) {
      console.log(`[FACEBOOK] Scraping ${facebookGroupUrls.length} Facebook groups...`);
      
      for (const groupUrl of facebookGroupUrls) {
        try {
          // Note: Facebook groups require authentication or special scraping tools
          // This is a placeholder for actual implementation
          // In production, you'd use:
          // - Facebook Graph API with group access
          // - Or a service like Apify that handles Facebook scraping
          // - Or manual group URLs with proper authentication
          
          console.log(`[FACEBOOK] Group: ${groupUrl} (requires implementation)`);
        } catch (error: any) {
          console.error(`[FACEBOOK] Group scraping error:`, error.message);
        }
      }
    }
    
    // Option 3: Use third-party scraping service (if configured)
    const scraperApiKey = process.env.SCRAPER_API_KEY;
    if (scraperApiKey && pets.length === 0) {
      console.log(`[FACEBOOK] Using ScraperAPI for Facebook...`);
      // Implement ScraperAPI integration if needed
    }
    
  } catch (error: any) {
    console.error(`[FACEBOOK] Scraping error:`, error.message);
  }
  
  console.log(`[FACEBOOK] Found ${pets.length} pet posts`);
  return pets.slice(0, maxPosts);
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { location = 'Alabama', maxPosts = 50, groupUrls } = body;

    console.log(`[FACEBOOK] Starting Facebook scrape for: ${location}`);

    // Scrape Facebook posts
    const pets = await scrapeFacebookPosts(location, maxPosts);

    // Save pets to database
    const savedPets: any[] = [];
    const errors: Array<{ pet: string; error: string }> = [];

    for (const pet of pets) {
      try {
        // Check for duplicates
        const { data: existing } = await supabase
          .from('lost_pets')
          .select('id')
          .eq('pet_name', pet.name)
          .eq('status', pet.status)
          .ilike('location_city', pet.location_city || '')
          .limit(1)
          .single();

        if (existing) {
          continue; // Skip duplicates
        }

        // Determine date field
        const dateField = pet.status === 'lost' ? 'date_lost' : 'date_found';
        const dateValue = pet.date_posted || new Date().toISOString().split('T')[0];

        // Save pet
        const { data: newPet, error: petError } = await supabase
          .from('lost_pets')
          .insert({
            pet_name: pet.name,
            pet_type: pet.type,
            breed: pet.breed,
            color: 'N/A',
            size: 'medium',
            description: `${pet.description} (Source: Facebook${pet.post_url ? ` - ${pet.post_url}` : ''})`,
            photo_url: pet.photo_url || null,
            status: pet.status,
            location_city: pet.location_city || 'Unknown',
            location_state: pet.location_state || 'AL',
            [dateField]: dateValue,
            owner_name: pet.contact_info ? `Facebook: ${pet.contact_info}` : 'Facebook Community',
            owner_email: null,
            owner_phone: null,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (petError) {
          errors.push({ pet: pet.name, error: petError.message });
        } else if (newPet) {
          savedPets.push(newPet);
        }
      } catch (petError: any) {
        errors.push({ pet: pet.name, error: petError.message });
      }
    }

    return NextResponse.json({
      success: true,
      pets: savedPets,
      petsFound: pets.length,
      petsSaved: savedPets.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Found ${pets.length} pets on Facebook, saved ${savedPets.length} to database`
    });

  } catch (error: any) {
    console.error('[FACEBOOK] Error:', error);
    return NextResponse.json(
      {
        error: 'Facebook scraping failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}












