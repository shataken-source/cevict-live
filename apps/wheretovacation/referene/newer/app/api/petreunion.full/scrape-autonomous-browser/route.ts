import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Facebook login credentials (from environment)
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
}

// Simple HTML parser - extracts pet info from HTML
function parsePetFromHTML(html: string, source: string = 'unknown'): ScrapedPet[] {
  const pets: ScrapedPet[] = [];
  
  console.log(`[HTML PARSER] Parsing HTML (${html.length} chars) from source: ${source}`);
  
  // Clean HTML
  const cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Extract JSON-LD structured data
  const jsonLdPattern = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  const jsonLdData: any[] = [];
  
  while ((jsonLdMatch = jsonLdPattern.exec(html)) !== null) {
    try {
      const jsonData = JSON.parse(jsonLdMatch[1]);
      if (Array.isArray(jsonData)) {
        jsonLdData.push(...jsonData);
      } else {
        jsonLdData.push(jsonData);
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  }
  
  // Extract from JSON-LD
  jsonLdData.forEach((item: any) => {
    if (item.name || item.headline) {
      const pet: ScrapedPet = {
        name: item.name || item.headline || 'Unknown',
        type: (item.category || '').toLowerCase().includes('cat') ? 'cat' : 'dog',
        breed: item.brand?.name || item.breed || 'Mixed Breed',
        description: item.description || '',
        photo_url: item.image || item.thumbnailUrl,
        status: 'found',
        source,
      };
      
      if (pet.name && pet.name !== 'Unknown') {
        pets.push(pet);
      }
    }
  });
  
  // Extract from HTML patterns - more comprehensive
  const namePatterns = [
    /<h[1-4][^>]*>([^<]+(?:dog|cat|puppy|kitten|pet)[^<]*)<\/h[1-4]>/gi,
    /"name"\s*:\s*"([^"]+)"/gi,
    /Name[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /<a[^>]*class="[^"]*pet[^"]*name[^"]*"[^>]*>([^<]+)<\/a>/gi,
    /<div[^>]*class="[^"]*pet[^"]*name[^"]*"[^>]*>([^<]+)<\/div>/gi,
    /<span[^>]*class="[^"]*pet[^"]*name[^"]*"[^>]*>([^<]+)<\/span>/gi,
  ];
  
  const breedPatterns = [
    /"breed"\s*:\s*"([^"]+)"/gi,
    /Breed[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+Mix)?)/gi,
    /<span[^>]*class="[^"]*breed[^"]*"[^>]*>([^<]+)<\/span>/gi,
    /<div[^>]*class="[^"]*breed[^"]*"[^>]*>([^<]+)<\/div>/gi,
  ];
  
  // Find pet cards/sections
  const petCardPattern = /<div[^>]*class="[^"]*pet[^"]*card[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
  const petSections: string[] = [];
  let match;
  
  while ((match = petCardPattern.exec(cleanHtml)) !== null) {
    petSections.push(match[0]);
  }
  
  // If no cards, treat entire page as one listing
  if (petSections.length === 0) {
    petSections.push(cleanHtml);
  }
  
  // Extract from each section
  petSections.forEach((section) => {
    const pet: Partial<ScrapedPet> = {
      name: 'Unknown',
      type: 'dog',
      breed: 'Mixed Breed',
      description: '',
      status: 'found',
      source,
    };
    
    // Extract name
    for (const pattern of namePatterns) {
      const nameMatch = pattern.exec(section);
      if (nameMatch && nameMatch[1] && nameMatch[1].length > 1 && nameMatch[1].length < 50) {
        pet.name = nameMatch[1].trim();
        break;
      }
    }
    
    // Extract breed
    for (const pattern of breedPatterns) {
      const breedMatch = pattern.exec(section);
      if (breedMatch && breedMatch[1]) {
        pet.breed = breedMatch[1].trim();
        break;
      }
    }
    
    // Determine type
    const sectionLower = section.toLowerCase();
    if (sectionLower.includes('cat') || sectionLower.includes('kitten')) {
      pet.type = 'cat';
    }
    
    // Determine status
    if (sectionLower.includes('lost') || sectionLower.includes('missing')) {
      pet.status = 'lost';
    }
    
    // Build description
    pet.description = `${pet.breed || 'Mixed Breed'}`;
    
    // Only add if valid name
    if (pet.name && pet.name !== 'Unknown' && pet.name.length > 1) {
      pets.push(pet as ScrapedPet);
    }
  });
  
  console.log(`[HTML PARSER] Extracted ${pets.length} pets from HTML`);
  return pets;
}

// Extract pets from visible text content
function extractPetsFromText(text: string): ScrapedPet[] {
  const pets: ScrapedPet[] = [];
  
  // Look for patterns like "Dog named Buddy" or "Lost cat: Fluffy"
  const petPatterns = [
    /(?:lost|found|adopt|looking for)\s+(?:a\s+)?(dog|cat|puppy|kitten)\s+(?:named|called)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+is\s+(?:a|an)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(dog|cat)/gi,
    /(dog|cat|puppy|kitten)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
  ];
  
  const seenNames = new Set<string>();
  
  for (const pattern of petPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const type = (match[1] || match[3] || 'dog').toLowerCase().includes('cat') ? 'cat' : 'dog';
      const name = match[2] || match[1];
      
      if (name && name.length > 1 && name.length < 30 && !seenNames.has(name)) {
        seenNames.add(name);
        pets.push({
          name: name.trim(),
          type: type as 'dog' | 'cat',
          breed: 'Mixed Breed',
          description: `Found via text extraction`,
          status: text.toLowerCase().includes('lost') ? 'lost' : 'found',
          source: 'adoptapet',
        });
      }
    }
  }
  
  return pets;
}

// Using Playwright only - puppeteer removed
// Browser automation is handled via Playwright in the main POST handler

async function scrapeAdoptAPetWithBrowser(location: string = 'Alabama'): Promise<ScrapedPet[]> {
  // DISABLED - This function used puppeteer which has been removed
  // Browser scraping now uses Playwright in other routes
  console.log('[ADOPTAPET] Browser scraping requires Playwright - function disabled');
  return [];
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
    const { source = 'all', location = 'Alabama', maxPets = 50 } = body;
    // Default to disabled unless explicitly enabled (set env var to "false" to enable)
    const DISABLE_ADOPTAPET_SCRAPER = process.env.DISABLE_ADOPTAPET_SCRAPER !== 'false';
    const DISABLE_FACEBOOK_SCRAPER = process.env.DISABLE_FACEBOOK_SCRAPER !== 'false';
    const warnings: string[] = [];
    
    let allPets: ScrapedPet[] = [];
    
    // Scrape based on source
    if ((source === 'adoptapet' || source === 'all') && !DISABLE_ADOPTAPET_SCRAPER) {
      console.log('[SCRAPER] Scraping AdoptAPet...');
      const adoptAPetPets = await scrapeAdoptAPetWithBrowser(location);
      allPets.push(...adoptAPetPets);
    } else if ((source === 'adoptapet' || source === 'all') && DISABLE_ADOPTAPET_SCRAPER) {
      const msg = '[SCRAPER] AdoptAPet scraper disabled; skipping.';
      console.log(msg);
      warnings.push(msg);
    }
    
    if ((source === 'facebook' || source === 'all') && !DISABLE_FACEBOOK_SCRAPER) {
      console.log('[SCRAPER] Scraping Facebook shelters...');
      const facebookPets = await scrapeFacebookShelters(10);
      allPets.push(...facebookPets);
    } else if ((source === 'facebook' || source === 'all') && DISABLE_FACEBOOK_SCRAPER) {
      const msg = '[SCRAPER] Facebook scraper disabled; skipping.';
      console.log(msg);
      warnings.push(msg);
    }
    
    // If all requested sources are disabled, return a clear error
    const requestedSources = source === 'all' ? ['adoptapet', 'facebook'] : [source];
    const allRequestedDisabled = requestedSources.every((s) =>
      (s === 'adoptapet' && DISABLE_ADOPTAPET_SCRAPER) ||
      (s === 'facebook' && DISABLE_FACEBOOK_SCRAPER)
    );
    if (allRequestedDisabled) {
      return NextResponse.json(
        {
          success: false,
          error: 'Requested sources are disabled',
          warnings,
        },
        { status: 503 }
      );
    }

    // Limit results
    if (allPets.length > maxPets) {
      allPets = allPets.slice(0, maxPets);
    }
    
    // Save to database
    const saveResults = await savePets(allPets);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return NextResponse.json({
      success: true,
      message: `Scraped ${allPets.length} pets in ${duration}s`,
      pets: allPets,
      saved: saveResults.saved,
      skipped: saveResults.skipped,
      errors: saveResults.errors,
      warnings
    });
    
  } catch (error: any) {
    console.error('[SCRAPER] Fatal error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to scrape pets',
        success: false
      },
      { status: 500 }
    );
  }
}

async function scrapeFacebookShelters(durationMinutes: number = 10): Promise<ScrapedPet[]> {
  // DISABLED - This function used puppeteer which has been removed
  // Browser scraping now uses Playwright in other routes
  console.log('[FACEBOOK] Browser scraping requires Playwright - function disabled');
  return [];
}

// Save pets to database
async function savePets(pets: ScrapedPet[]): Promise<{ saved: number; skipped: number; errors: number }> {
  if (!supabase) {
    throw new Error('Database not configured');
  }
  
  let saved = 0;
  let skipped = 0;
  let errors = 0;
  
  console.log(`[SAVE] Attempting to save ${pets.length} pets...`);
  
  for (const pet of pets) {
    try {
      // Validate pet data
      if (!pet.name || pet.name === 'Unknown') {
        console.log(`[SAVE] ⚠️ Skipping pet with invalid name: ${pet.name}`);
        skipped++;
        continue;
      }
      
      console.log(`[SAVE] Processing pet: ${pet.name} (${pet.type}, ${pet.breed})`);
      
      // Check for duplicates (simplified - just check name)
      const { data: existing, error: checkError } = await supabase
        .from('lost_pets')
        .select('id')
        .eq('pet_name', pet.name)
        .limit(1)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error(`[SAVE] Error checking duplicates:`, checkError.message);
      }
      
      if (existing) {
        console.log(`[SAVE] ⏭️ Skipping duplicate: ${pet.name}`);
        skipped++;
        continue;
      }
      
      // Determine date - schema requires date_lost, but we can use it for both lost and found
      const dateValue = new Date().toISOString().split('T')[0];
      
      // Prepare insert data - date_lost is required by schema
      const insertData: any = {
        pet_name: pet.name || 'Unknown',
        pet_type: pet.type || 'dog',
        breed: pet.breed || 'Mixed Breed',
        color: pet.color || 'N/A',
        size: pet.size || 'medium',
        description: pet.description || `Found via scraper`,
        photo_url: pet.photo_url || null,
        status: pet.status || 'found',
        location_city: pet.location_city || 'Unknown',
        location_state: pet.location_state || 'AL',
        date_lost: dateValue, // Required field - use for both lost and found
        owner_name: 'Community',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // If it's a found pet, we might want to add date_found if the column exists
      // But for now, use date_lost for both since it's required
      
      console.log(`[SAVE] Inserting pet data:`, JSON.stringify(insertData, null, 2));
      
      // Save pet
      const { data: insertedData, error: insertError } = await supabase
        .from('lost_pets')
        .insert(insertData)
        .select();
      
      if (insertError) {
        console.error(`[SAVE] ❌ Error saving ${pet.name}:`, insertError.message);
        console.error(`[SAVE] Error code:`, insertError.code);
        console.error(`[SAVE] Error details:`, JSON.stringify(insertError, null, 2));
        errors++;
      } else {
        saved++;
        console.log(`[SAVE] ✅ Saved: ${pet.name} (${pet.type}, ${pet.breed}) - ID: ${insertedData?.[0]?.id}`);
      }
    } catch (error: any) {
      console.error(`[SAVE] ❌ Exception processing ${pet.name}:`, error.message);
      console.error(`[SAVE] Stack:`, error.stack);
      errors++;
    }
  }
  
  console.log(`[SAVE] Summary: ${saved} saved, ${skipped} skipped, ${errors} errors`);
  
  return { saved, skipped, errors };
}

