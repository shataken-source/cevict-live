// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const FACEBOOK_ACCESS_TOKEN = Deno.env.get('FACEBOOK_ACCESS_TOKEN') || '';
const FACEBOOK_PAGE_TOKEN = Deno.env.get('FACEBOOK_PAGE_TOKEN') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  full_picture?: string;
  picture?: string;
  attachments?: {
    data: Array<{
      media?: { image?: { src: string } };
      subattachments?: { data: Array<{ media?: { image?: { src: string } }> }>;
    }>;
  };
  place?: {
    name?: string;
    location?: {
      city?: string;
      state?: string;
      country?: string;
    };
  };
}

interface PetInfo {
  name: string;
  type: string; // 'dog' or 'cat'
  breed: string;
  color: string;
  size: string;
  gender: string;
  age: string;
  description: string;
  photo_url: string;
  location_city: string;
  location_state: string;
  date_lost: string;
  status: 'lost' | 'found';
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  facebook_post_id: string;
  facebook_post_url: string;
}

// Extract pet information from Facebook post text
function extractPetInfo(post: FacebookPost): PetInfo | null {
  const message = (post.message || '').toLowerCase();
  const fullMessage = post.message || '';
  
  // Skip if doesn't seem like a pet post
  const petKeywords = ['lost', 'found', 'missing', 'dog', 'cat', 'puppy', 'kitten', 'pet', 'animal'];
  if (!petKeywords.some(keyword => message.includes(keyword))) {
    return null;
  }
  
  // Determine if lost or found
  let status: 'lost' | 'found' = 'lost';
  if (message.includes('found') || message.includes('rescued') || message.includes('at shelter')) {
    status = 'found';
  } else if (message.includes('lost') || message.includes('missing')) {
    status = 'lost';
  }
  
  // Extract pet type
  let petType = 'dog'; // Default
  if (message.includes('cat') || message.includes('kitten')) {
    petType = 'cat';
  } else if (message.includes('dog') || message.includes('puppy')) {
    petType = 'dog';
  }
  
  // Extract name (look for patterns like "Name: Fluffy" or "My dog Fluffy")
  let petName = 'Unknown';
  const namePatterns = [
    /(?:name|called|named)[\s:]+([A-Z][a-z]+)/i,
    /(?:my|our)\s+(?:dog|cat|pet)\s+([A-Z][a-z]+)/i,
    /([A-Z][a-z]+)\s+(?:is|was)\s+(?:lost|missing|found)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = fullMessage.match(pattern);
    if (match && match[1]) {
      petName = match[1];
      break;
    }
  }
  
  // Extract breed
  let breed = 'Mixed';
  const breedPatterns = [
    /(?:breed|type)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:mix|breed)/i
  ];
  
  for (const pattern of breedPatterns) {
    const match = fullMessage.match(pattern);
    if (match && match[1]) {
      breed = match[1];
      break;
    }
  }
  
  // Extract color
  const colors = ['black', 'white', 'brown', 'tan', 'gray', 'grey', 'orange', 'red', 'yellow', 'brindle', 'spotted', 'striped'];
  let color = 'Unknown';
  for (const c of colors) {
    if (message.includes(c)) {
      color = c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }
  
  // Extract size
  let size = 'medium';
  if (message.includes('small') || message.includes('tiny') || message.includes('puppy') || message.includes('kitten')) {
    size = 'small';
  } else if (message.includes('large') || message.includes('big')) {
    size = 'large';
  }
  
  // Extract gender
  let gender = 'unknown';
  if (message.includes('male') || message.includes('boy')) {
    gender = 'male';
  } else if (message.includes('female') || message.includes('girl')) {
    gender = 'female';
  }
  
  // Extract age
  let age = 'Unknown';
  const ageMatch = fullMessage.match(/(\d+)\s*(?:year|yr|month|mo|week|wk|old)/i);
  if (ageMatch) {
    age = ageMatch[0];
  }
  
  // Extract location
  let locationCity = '';
  let locationState = '';
  
  if (post.place?.location) {
    locationCity = post.place.location.city || '';
    locationState = post.place.location.state || '';
  } else {
    // Try to extract from message
    const stateMatch = fullMessage.match(/\b([A-Z]{2})\b/);
    if (stateMatch) {
      locationState = stateMatch[1];
    }
    
    // Common city patterns
    const cityPatterns = [
      /(?:in|near|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /([A-Z][a-z]+),\s*[A-Z]{2}/i
    ];
    
    for (const pattern of cityPatterns) {
      const match = fullMessage.match(pattern);
      if (match && match[1]) {
        locationCity = match[1];
        break;
      }
    }
  }
  
  // Extract contact info
  let ownerName = 'Unknown';
  let ownerEmail = '';
  let ownerPhone = '';
  
  // Email pattern
  const emailMatch = fullMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    ownerEmail = emailMatch[1];
  }
  
  // Phone pattern
  const phoneMatch = fullMessage.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
  if (phoneMatch) {
    ownerPhone = phoneMatch[1];
  }
  
  // Get photo URL
  let photoUrl = '';
  if (post.full_picture) {
    photoUrl = post.full_picture;
  } else if (post.picture) {
    photoUrl = post.picture;
  } else if (post.attachments?.data?.[0]?.media?.image?.src) {
    photoUrl = post.attachments.data[0].media.image.src;
  } else if (post.attachments?.data?.[0]?.subattachments?.data?.[0]?.media?.image?.src) {
    photoUrl = post.attachments.data[0].subattachments.data[0].media.image.src;
  }
  
  // Facebook post URL
  const facebookPostUrl = `https://www.facebook.com/${post.id}`;
  
  // Parse date
  const dateLost = new Date(post.created_time).toISOString().split('T')[0];
  
  return {
    name: petName,
    type: petType,
    breed: breed,
    color: color,
    size: size,
    gender: gender,
    age: age,
    description: fullMessage.substring(0, 500), // Limit description
    photo_url: photoUrl,
    location_city: locationCity,
    location_state: locationState,
    date_lost: dateLost,
    status: status,
    owner_name: ownerName,
    owner_email: ownerEmail,
    owner_phone: ownerPhone,
    facebook_post_id: post.id,
    facebook_post_url: facebookPostUrl
  };
}

// Fetch posts from Facebook page/group
async function fetchFacebookPosts(pageIdOrName: string, limit: number = 25): Promise<FacebookPost[]> {
  const accessToken = FACEBOOK_PAGE_TOKEN || FACEBOOK_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('Facebook access token is required. Set FACEBOOK_PAGE_TOKEN or FACEBOOK_ACCESS_TOKEN.');
  }
  
  // Facebook Graph API endpoint
  const url = `https://graph.facebook.com/v18.0/${pageIdOrName}/posts?fields=id,message,created_time,full_picture,picture,attachments{media{image{src}},subattachments{media{image{src}}}},place{name,location{city,state,country}}&limit=${limit}&access_token=${accessToken}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Facebook API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Facebook API error: ${data.error.message}`);
    }
    
    return data.data || [];
  } catch (error) {
    console.error('Error fetching Facebook posts:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  try {
    // Validate environment variables
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({
        error: 'Configuration error',
        message: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set',
        code: 'CONFIG_ERROR'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      return new Response(JSON.stringify({
        error: 'Invalid request',
        message: 'Request body must be valid JSON',
        code: 'INVALID_REQUEST'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { pageId, pageName, limit = 25 } = requestBody;
    
    if (!pageId && !pageName) {
      return new Response(JSON.stringify({
        error: 'Missing parameter',
        message: 'Either pageId or pageName is required',
        code: 'MISSING_PARAMETER'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const pageIdentifier = pageId || pageName;

    // Fetch posts from Facebook
    let posts: FacebookPost[];
    try {
      posts = await fetchFacebookPosts(pageIdentifier, limit);
    } catch (fetchError: any) {
      console.error('Error fetching Facebook posts:', fetchError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch Facebook posts',
        message: fetchError.message || 'Unknown error',
        code: 'FACEBOOK_API_ERROR'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract pet info from posts
    const pets: PetInfo[] = [];
    const skippedPosts: string[] = [];
    
    for (const post of posts) {
      const petInfo = extractPetInfo(post);
      if (petInfo) {
        pets.push(petInfo);
      } else {
        skippedPosts.push(post.id);
      }
    }

    // Save pets to database
    const savedPets = [];
    const petErrors: string[] = [];
    
    for (const pet of pets) {
      try {
        // Check if pet already exists (by Facebook post ID)
        const { data: existingPet } = await supabase
          .from('lost_pets')
          .select('id')
          .eq('facebook_post_id', pet.facebook_post_id)
          .single();
        
        if (existingPet) {
          skippedPosts.push(`Pet from post ${pet.facebook_post_id} already exists`);
          continue;
        }
        
        // Insert new pet
        const { data: newPet, error: petError } = await supabase
          .from('lost_pets')
          .insert({
            pet_name: pet.name,
            pet_type: pet.type,
            breed: pet.breed,
            color: pet.color,
            size: pet.size,
            description: pet.description,
            photo_url: pet.photo_url,
            status: pet.status,
            location_city: pet.location_city,
            location_state: pet.location_state,
            date_lost: pet.date_lost,
            owner_name: pet.owner_name,
            owner_email: pet.owner_email,
            owner_phone: pet.owner_phone,
            facebook_post_id: pet.facebook_post_id,
            facebook_post_url: pet.facebook_post_url
          })
          .select()
          .single();
        
        if (petError) {
          console.error(`Error saving pet ${pet.name}:`, petError);
          petErrors.push(`Pet ${pet.name}: ${petError.message}`);
        } else if (newPet) {
          savedPets.push(newPet);
        }
      } catch (petError: any) {
        console.error(`Error processing pet ${pet.name}:`, petError);
        petErrors.push(`Pet ${pet.name}: ${petError.message}`);
      }
    }

    // Return results
    return new Response(JSON.stringify({
      success: true,
      postsFetched: posts.length,
      petsExtracted: pets.length,
      petsSaved: savedPets.length,
      petsSkipped: skippedPosts.length,
      pets: savedPets,
      warnings: {
        petErrors: petErrors,
        skippedPosts: skippedPosts.slice(0, 10) // Limit to first 10
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Facebook scraper error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message || 'Unknown error',
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});













