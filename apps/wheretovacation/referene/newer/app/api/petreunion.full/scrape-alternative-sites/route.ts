import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Alternative pet adoption sites with static HTML (easier to scrape)
const ALTERNATIVE_SITES = {
  'petfinder': {
    name: 'Petfinder',
    baseUrl: 'https://www.petfinder.com',
    searchUrl: (location: string) => `https://www.petfinder.com/search/dogs-for-adoption/us/${location.toLowerCase().replace(/\s+/g, '-')}/`,
    selectors: {
      petCard: '.petCard, .pet-card, [class*="pet-card"]',
      name: 'h2, h3, .pet-name, [class*="name"]',
      breed: '.breed, [class*="breed"]',
      age: '.age, [class*="age"]',
      photo: 'img'
    }
  },
  'petango': {
    name: 'Petango',
    baseUrl: 'https://www.petango.com',
    searchUrl: (location: string) => `https://www.petango.com/Adoptable-Dogs/${location}`,
    selectors: {
      petCard: '.pet-item, .pet-listing',
      name: '.pet-name, h3',
      breed: '.breed',
      age: '.age',
      photo: 'img'
    }
  },
  'shelterluv': {
    name: 'ShelterLuv',
    baseUrl: 'https://www.shelterluv.com',
    searchUrl: (location: string) => `https://www.shelterluv.com/adoptable-pets?location=${location}`,
    selectors: {
      petCard: '.pet-card, .animal-card',
      name: '.name, h3',
      breed: '.breed',
      age: '.age',
      photo: 'img'
    }
  },
  '24petconnect': {
    name: '24PetConnect',
    baseUrl: 'https://www.24petconnect.com',
    searchUrl: (location: string) => `https://www.24petconnect.com/search?location=${location}`,
    selectors: {
      petCard: '.pet-card',
      name: '.pet-name',
      breed: '.breed',
      age: '.age',
      photo: 'img'
    }
  }
};

interface PetInfo {
  name: string;
  type: string;
  breed: string;
  age: string;
  gender: string;
  size: string;
  color: string;
  photo_url: string;
  description: string;
}

async function scrapeStaticSite(url: string, siteType: keyof typeof ALTERNATIVE_SITES): Promise<PetInfo[]> {
  const pets: PetInfo[] = [];
  const site = ALTERNATIVE_SITES[siteType];
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    
    // Extract pets using regex patterns (works for static HTML)
    const petCardPattern = new RegExp(`<div[^>]*class="[^"]*${site.selectors.petCard.replace('.', '')}[^"]*"[^>]*>([\\s\\S]*?)<\\/div>`, 'gi');
    let match;
    
    while ((match = petCardPattern.exec(html)) !== null && pets.length < 100) {
      const cardHtml = match[1];
      
      // Extract name
      const nameMatch = cardHtml.match(new RegExp(`<${site.selectors.name.replace('.', '')}[^>]*>([^<]+)<\\/${site.selectors.name.replace('.', '')}>`, 'i'));
      const name = nameMatch ? nameMatch[1].trim() : '';
      
      if (!name || name.length < 2) continue;
      
      // Extract breed
      const breedMatch = cardHtml.match(new RegExp(`<${site.selectors.breed.replace('.', '')}[^>]*>([^<]+)<\\/${site.selectors.breed.replace('.', '')}>`, 'i'));
      const breed = breedMatch ? breedMatch[1].trim() : 'Mixed Breed';
      
      // Extract age
      const ageMatch = cardHtml.match(new RegExp(`<${site.selectors.age.replace('.', '')}[^>]*>([^<]+)<\\/${site.selectors.age.replace('.', '')}>`, 'i'));
      const age = ageMatch ? ageMatch[1].trim() : 'Unknown';
      
      // Extract photo
      const photoMatch = cardHtml.match(/<img[^>]+src="([^"]+)"[^>]*>/i);
      const photoUrl = photoMatch ? photoMatch[1] : '';
      
      // Determine type
      const lowerCard = cardHtml.toLowerCase();
      const type = lowerCard.includes('cat') || lowerCard.includes('kitten') ? 'cat' : 'dog';
      
      pets.push({
        name,
        type,
        breed,
        age,
        gender: 'Unknown',
        size: 'medium',
        color: 'N/A',
        photo_url: photoUrl,
        description: `${age}, ${breed}`
      });
    }
    
    console.log(`[SCRAPER] Found ${pets.length} pets from ${site.name}`);
    return pets;
  } catch (error: any) {
    console.error(`[SCRAPER] Error scraping ${site.name}:`, error.message);
    return [];
  }
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
    const { siteType, location = 'Alabama', shelterId } = body;

    if (!siteType || !(siteType in ALTERNATIVE_SITES)) {
      return NextResponse.json(
        { 
          error: 'Invalid site type',
          availableSites: Object.keys(ALTERNATIVE_SITES)
        },
        { status: 400 }
      );
    }

    const site = ALTERNATIVE_SITES[siteType as keyof typeof ALTERNATIVE_SITES];
    const url = site.searchUrl(location);

    console.log(`[SCRAPER] Scraping ${site.name}: ${url}`);

    const pets = await scrapeStaticSite(url, siteType as keyof typeof ALTERNATIVE_SITES);

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
          .eq('shelter_id', shelterId || null)
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
            shelter_id: shelterId || null,
            location_city: location.split(',')[0] || 'Unknown',
            location_state: location.split(',')[1]?.trim() || 'AL',
            date_lost: new Date().toISOString().split('T')[0]
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
      site: site.name,
      url,
      pets: savedPets,
      petsScraped: pets.length,
      petsSaved: savedPets.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Scraped ${pets.length} pets from ${site.name}, saved ${savedPets.length} to database`
    });

  } catch (error: any) {
    console.error('[SCRAPER] Error:', error);
    return NextResponse.json(
      { 
        error: 'Scraping failed', 
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

