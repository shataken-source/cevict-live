// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ShelterInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  hours: string;
}

interface PetInfo {
  name: string;
  type: string; // 'dog', 'cat', etc.
  breed: string;
  age: string;
  gender: string;
  size: string;
  color: string;
  photo_url: string;
  description: string;
  good_with_kids: boolean;
  good_with_dogs: boolean;
  good_with_cats: boolean;
  spayed_neutered: boolean;
  housetrained: boolean;
}

// Scrape shelter information from AdoptAPet page
async function scrapeShelterInfo(html: string): Promise<ShelterInfo> {
  const shelter: ShelterInfo = {
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    hours: ''
  };

  // Extract shelter name (from h1 or title)
  const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || 
                    html.match(/<title>([^<]+)<\/title>/i);
  if (nameMatch) {
    shelter.name = nameMatch[1].trim().replace(/\s+/g, ' ');
  }

  // Extract address
  const addressMatch = html.match(/Address[^>]*>([^<]+)<\/[^>]*>/i) ||
                       html.match(/(\d+\s+[^,]+,\s*[^,]+,\s*[A-Z]{2}\s+\d{5})/);
  if (addressMatch) {
    shelter.address = addressMatch[1].trim();
  }

  // Extract phone
  const phoneMatch = html.match(/Phone[^>]*>([^<]+)<\/[^>]*>/i) ||
                     html.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
  if (phoneMatch) {
    shelter.phone = phoneMatch[1].trim();
  }

  // Extract email
  const emailMatch = html.match(/Email[^>]*>([^<]+)<\/[^>]*>/i) ||
                      html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    shelter.email = emailMatch[1].trim();
  }

  // Extract website
  const websiteMatch = html.match(/Website[^>]*>([^<]+)<\/[^>]*>/i) ||
                       html.match(/href="(https?:\/\/[^"]+secondchanceshelter[^"]+)"/i);
  if (websiteMatch) {
    shelter.website = websiteMatch[1].trim();
  }

  // Extract hours
  const hoursMatch = html.match(/Hours of Operation[^>]*>([\s\S]*?)<\/[^>]*>/i);
  if (hoursMatch) {
    shelter.hours = hoursMatch[1].replace(/<[^>]+>/g, ' ').trim();
  }

  return shelter;
}

// Scrape pets from AdoptAPet page
async function scrapePets(html: string): Promise<PetInfo[]> {
  const pets: PetInfo[] = [];

  // AdoptAPet uses specific patterns - look for pet cards
  // Pattern: Photo of [Name] [Name] [Breed] [Gender], [Age] [Location]
  const petPattern = /Photo of\s+([A-Za-z]+)\s+([A-Za-z]+)[\s\S]*?([A-Za-z\s]+(?:Breed|Mixed Breed)[^<]*)[\s\S]*?(Male|Female)[\s\S]*?(\d+\s+(?:yr|mos|mo|year|month)[^<]*)/gi;
  
  let match;
  while ((match = petPattern.exec(html)) !== null) {
    const petName = match[1] || match[2] || 'Unknown';
    const breedText = match[3] || 'Unknown';
    const gender = match[4] || 'Unknown';
    const age = match[5] || 'Unknown';

    // Extract photo URL
    const photoMatch = html.substring(match.index).match(/<img[^>]+src="([^"]+)"[^>]*>/i);
    const photoUrl = photoMatch ? photoMatch[1] : '';

    // Extract size
    const sizeMatch = html.substring(match.index).match(/Size[^>]*>([^<]+)<\/[^>]*>/i);
    const size = sizeMatch ? sizeMatch[1].trim() : '';

    // Extract color
    const colorMatch = html.substring(match.index).match(/Color[^>]*>([^<]+)<\/[^>]*>/i);
    const color = colorMatch ? colorMatch[1].trim() : '';

    // Extract details
    const goodWithKids = html.substring(match.index).includes('Good with kids') || 
                         html.substring(match.index).includes('Good With Kids');
    const goodWithDogs = html.substring(match.index).includes('Good with dogs') || 
                         html.substring(match.index).includes('Good With Dogs');
    const goodWithCats = html.substring(match.index).includes('Good with cats') || 
                         html.substring(match.index).includes('Good With Cats');
    const spayedNeutered = html.substring(match.index).includes('Spayed/Neutered');
    const housetrained = html.substring(match.index).includes('Housetrained') || 
                         html.substring(match.index).includes('House-trained');

    // Clean breed text - remove HTML artifacts and extra characters
    let cleanBreed = breedText
      .replace(/[<>]/g, '') // Remove HTML brackets
      .replace(/Breed|Mixed Breed/gi, '')
      .replace(/^[^a-zA-Z]+/, '') // Remove leading non-letters
      .trim() || 'Mixed';

    // Determine pet type - look for actual pet type indicators in the HTML
    // Check for "Dog" or "Cat" labels near the pet info
    const petContext = html.substring(Math.max(0, match.index - 200), match.index + 500).toLowerCase();
    let petType = 'dog'; // Default to dog
    
    // If human provides override, use it (but still validate)
    if (petTypeOverride && (petTypeOverride.toLowerCase() === 'dog' || petTypeOverride.toLowerCase() === 'cat')) {
      petType = petTypeOverride.toLowerCase();
    } else {
      // Auto-detect from HTML context
      // Look for explicit pet type indicators
      if (petContext.includes('cat') && !petContext.includes('dog')) {
        petType = 'cat';
      } else if (petContext.includes('kitten')) {
        petType = 'cat';
      } else if (petContext.includes('puppy') || petContext.includes('dog')) {
        petType = 'dog';
      }
      
      // Fallback: check breed for cat-specific breeds
      const catBreeds = ['persian', 'siamese', 'maine coon', 'ragdoll', 'british shorthair', 'abyssinian', 'bengal', 'russian blue'];
      if (catBreeds.some(breed => cleanBreed.toLowerCase().includes(breed))) {
        petType = 'cat';
      }
    }

    pets.push({
      name: petName,
      type: petType,
      breed: cleanBreed,
      age: age,
      gender: gender.toLowerCase(),
      size: size || 'medium',
      color: color || 'N/A',
      photo_url: photoUrl,
      description: '',
      good_with_kids: goodWithKids,
      good_with_dogs: goodWithDogs,
      good_with_cats: goodWithCats,
      spayed_neutered: spayedNeutered,
      housetrained: housetrained
    });
  }

  // Alternative: Look for structured data or JSON-LD
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const jsonData = JSON.parse(jsonLdMatch[1]);
      // Parse structured data if available
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  return pets;
}

// Main scraper function - now handles pagination
async function scrapeAdoptAPetPage(url: string, petTypeOverride?: string, maxPages: number = 25) {
  try {
    const allPets: PetInfo[] = [];
    let shelterInfo: ShelterInfo | null = null;
    let currentPage = 1;
    let hasMorePages = true;

    // Extract base URL (remove hash and page params)
    const baseUrl = url.split('#')[0].split('?')[0];
    
    while (hasMorePages && currentPage <= maxPages) {
      // Build URL for current page
      let pageUrl = baseUrl;
      if (currentPage > 1) {
        // AdoptAPet pagination: add ?page=X parameter
        pageUrl += `?page=${currentPage}`;
      } else {
        pageUrl += '#available-pets';
      }

      // Fetch the page
      const response = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        if (currentPage === 1) {
          throw new Error(`Failed to fetch page: ${response.status}`);
        } else {
          // If page 2+ fails, we've probably reached the end
          hasMorePages = false;
          break;
        }
      }

      const html = await response.text();

      // Scrape shelter info (only on first page)
      if (currentPage === 1) {
        shelterInfo = await scrapeShelterInfo(html);
      }

      // Scrape pets from this page
      const pagePets = await scrapePets(html, petTypeOverride);
      
      if (pagePets.length === 0) {
        // No pets found on this page, we're done
        hasMorePages = false;
        break;
      }

      allPets.push(...pagePets);

      // Check if there are more pages by looking for pagination indicators
      // AdoptAPet shows "Showing 1-12 of 263 available pets"
      const totalMatch = html.match(/(\d+)\s+available\s+pets/i);
      const showingMatch = html.match(/Showing\s+\d+-\d+\s+of\s+(\d+)/i);
      
      if (totalMatch || showingMatch) {
        const totalPets = parseInt(totalMatch?.[1] || showingMatch?.[1] || '0');
        if (totalPets > 0 && allPets.length >= totalPets) {
          hasMorePages = false;
        }
      }

      // Check for "Next" button or page numbers
      const nextPageMatch = html.match(/page[^>]*>(\d+)</i);
      if (!nextPageMatch && currentPage > 1) {
        hasMorePages = false;
      }

      currentPage++;
      
      // Small delay to be respectful
      if (hasMorePages && currentPage <= maxPages) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return {
      shelter: shelterInfo || { name: '', address: '', phone: '', email: '', website: '', hours: '' },
      pets: allPets,
      totalPets: allPets.length,
      pagesScraped: currentPage - 1
    };

  } catch (error) {
    console.error('Scraping error:', error);
    throw error;
  }
}

serve(async (req) => {
  // CORS handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing environment variables');
    return new Response(JSON.stringify({
      error: 'Server configuration error',
      message: 'Missing required environment variables',
      code: 'CONFIG_ERROR'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      return new Response(JSON.stringify({
        error: 'Invalid request format',
        message: 'Request body must be valid JSON',
        code: 'INVALID_JSON'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { url, action, petTypeOverride, maxPages, shelterId } = requestBody;

    // Validate URL
    if (!url) {
      return new Response(JSON.stringify({
        error: 'URL is required',
        code: 'MISSING_URL'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (urlError) {
      return new Response(JSON.stringify({
        error: 'Invalid URL format',
        message: 'URL must be a valid HTTP/HTTPS URL',
        code: 'INVALID_URL'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Scrape the page with error handling
    let scrapedData;
    try {
      scrapedData = await scrapeAdoptAPetPage(url, petTypeOverride);
    } catch (scrapeError: any) {
      console.error('Scraping failed:', scrapeError);
      return new Response(JSON.stringify({
        error: 'Scraping failed',
        message: scrapeError.message || 'Failed to scrape the provided URL',
        code: 'SCRAPE_ERROR',
        details: process.env.NODE_ENV === 'development' ? scrapeError.stack : undefined
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Save shelter to database with error handling
    let finalShelterId = shelterId || null; // Use provided shelterId if available
    let shelterErrors: string[] = [];
    
    // If shelterId was provided, verify it exists and update info
    if (finalShelterId) {
      try {
        const { data: existingShelter, error: checkError } = await supabase
          .from('shelters')
          .select('id')
          .eq('id', finalShelterId)
          .single();

        if (checkError) {
          console.error('Shelter verification error:', checkError);
          shelterErrors.push(`Shelter verification failed: ${checkError.message}`);
          finalShelterId = null; // Reset if verification failed
        } else if (existingShelter) {
          // Update shelter info with scraped data
          const { error: updateError } = await supabase
            .from('shelters')
            .update({
              shelter_name: scrapedData.shelter.name || existingShelter.shelter_name,
              address: scrapedData.shelter.address || existingShelter.address,
              phone: scrapedData.shelter.phone || existingShelter.phone,
              updated_at: new Date().toISOString()
            })
            .eq('id', finalShelterId);

          if (updateError) {
            console.error('Shelter update error:', updateError);
            shelterErrors.push(`Shelter update failed: ${updateError.message}`);
          }
        }
      } catch (shelterError: any) {
        console.error('Shelter verification error:', shelterError);
        shelterErrors.push(`Shelter verification failed: ${shelterError.message}`);
      }
    }
    
    // If no shelterId provided, try to find/create by email
    if (!finalShelterId && scrapedData.shelter.email) {
      try {
        // Check if shelter exists
        const { data: existingShelter, error: checkError } = await supabase
          .from('shelters')
          .select('id')
          .eq('email', scrapedData.shelter.email)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Shelter check error:', checkError);
          shelterErrors.push(`Shelter lookup failed: ${checkError.message}`);
        }

        if (existingShelter) {
          finalShelterId = existingShelter.id;
          // Update shelter info
          const { error: updateError } = await supabase
            .from('shelters')
            .update({
              shelter_name: scrapedData.shelter.name,
              address: scrapedData.shelter.address,
              phone: scrapedData.shelter.phone,
              email: scrapedData.shelter.email,
              updated_at: new Date().toISOString()
            })
            .eq('id', finalShelterId);

          if (updateError) {
            console.error('Shelter update error:', updateError);
            shelterErrors.push(`Shelter update failed: ${updateError.message}`);
          }
        } else {
          // Create new shelter
          const { data: newShelter, error: shelterError } = await supabase
            .from('shelters')
            .insert({
              shelter_name: scrapedData.shelter.name,
              address: scrapedData.shelter.address,
              phone: scrapedData.shelter.phone,
              email: scrapedData.shelter.email
            })
            .select()
            .single();

          if (shelterError) {
            console.error('Shelter insert error:', shelterError);
            shelterErrors.push(`Shelter creation failed: ${shelterError.message}`);
          } else {
            finalShelterId = newShelter?.id;
          }
        }
      } catch (shelterError: any) {
        console.error('Shelter operation error:', shelterError);
        shelterErrors.push(`Shelter operation failed: ${shelterError.message}`);
      }
    }

    // Save pets to database (as "found" pets at shelter) with error handling
    const savedPets = [];
    const petErrors: Array<{ pet: string; error: string }> = [];
    const skippedPets: string[] = [];

    for (const pet of scrapedData.pets) {
      try {
        // Validate pet data before saving
        if (!pet.name || !pet.type || !pet.breed) {
          petErrors.push({
            pet: pet.name || 'Unknown',
            error: 'Missing required fields (name, type, or breed)'
          });
          continue;
        }

        // Check if pet already exists (by name + shelter)
        const { data: existingPet, error: checkError } = await supabase
          .from('lost_pets')
          .select('id')
          .eq('pet_name', pet.name)
          .eq('shelter_id', finalShelterId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          petErrors.push({
            pet: pet.name,
            error: `Check failed: ${checkError.message}`
          });
          continue;
        }

        if (existingPet) {
          skippedPets.push(pet.name);
          continue; // Skip duplicates
        }

        // Parse address properly
        const addressParts = scrapedData.shelter.address?.split(',') || [];
        const city = addressParts[0]?.trim() || '';
        const state = addressParts[1]?.trim() || addressParts[addressParts.length - 1]?.trim() || 'AL';

        // Insert as "found" pet at shelter
        const { data: newPet, error: petError } = await supabase
          .from('lost_pets')
          .insert({
            pet_name: pet.name,
            pet_type: pet.type,
            breed: pet.breed,
            color: pet.color || 'N/A',
            size: pet.size || 'medium',
            description: `Available for adoption. ${pet.age}, ${pet.gender}. ${pet.description || ''}`,
            photo_url: pet.photo_url || null,
            status: 'found', // Available at shelter
            shelter_id: finalShelterId,
            owner_name: 'Shelter',
            owner_email: scrapedData.shelter.email || null,
            location_city: city,
            location_state: state,
            date_lost: new Date().toISOString().split('T')[0] // Today as found date
          })
          .select()
          .single();

        if (petError) {
          console.error(`Error saving pet ${pet.name}:`, petError);
          petErrors.push({
            pet: pet.name,
            error: petError.message
          });
        } else if (newPet) {
          savedPets.push(newPet);
          
          // Check for matching alerts (async, don't wait)
          supabase.functions.invoke('check-pet-alerts', {
            body: { petId: newPet.id }
          }).catch(err => {
            console.error(`Error checking alerts for pet ${newPet.id}:`, err);
          });
        }
      } catch (petError: any) {
        console.error(`Error processing pet ${pet.name}:`, petError);
        petErrors.push({
          pet: pet.name || 'Unknown',
          error: petError.message || 'Unknown error'
        });
      }
    }

    // Return comprehensive response with error details
    return new Response(JSON.stringify({
      success: true,
      shelter: scrapedData.shelter,
      shelterId: finalShelterId,
      petsScraped: scrapedData.pets.length,
      petsSaved: savedPets.length,
      petsSkipped: skippedPets.length,
      pets: savedPets,
      warnings: {
        shelterErrors: shelterErrors.length > 0 ? shelterErrors : undefined,
        petErrors: petErrors.length > 0 ? petErrors : undefined,
        skippedPets: skippedPets.length > 0 ? skippedPets : undefined
      },
      summary: {
        totalProcessed: scrapedData.pets.length,
        successful: savedPets.length,
        failed: petErrors.length,
        skipped: skippedPets.length
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    // Comprehensive error logging and response
    console.error('Scraper error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    });

    // Determine error type and status code
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    
    if (error.message?.includes('fetch')) {
      statusCode = 502;
      errorCode = 'NETWORK_ERROR';
    } else if (error.message?.includes('parse') || error.message?.includes('JSON')) {
      statusCode = 400;
      errorCode = 'PARSE_ERROR';
    }

    return new Response(JSON.stringify({
      error: 'Scraping operation failed',
      message: error.message || 'An unexpected error occurred',
      code: errorCode,
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        name: error.name
      } : undefined
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

