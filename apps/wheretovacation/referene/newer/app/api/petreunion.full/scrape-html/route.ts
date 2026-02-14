import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

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
  location_detail?: string;
  date_lost?: string;
  date_found?: string;
  source: string;
  source_url?: string;
  contact_info?: string;
  microchip?: string;
  collar?: string;
  special_notes?: string;
}

// Comprehensive HTML parser - extracts all possible pet information
function parsePetFromHTML(html: string, source: string = 'unknown'): ScrapedPet[] {
  const pets: ScrapedPet[] = [];
  
  console.log(`[HTML PARSER] Parsing HTML (${html.length} chars) from source: ${source}`);
  
  // Remove script and style tags to clean HTML
  const cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Pattern 1: Look for pet listings (common patterns)
  // AdoptAPet, Petfinder, shelter sites often use cards/divs with pet info
  const petCardPatterns = [
    /<div[^>]*class="[^"]*pet[^"]*card[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    /<div[^>]*class="[^"]*animal[^"]*card[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    /<div[^>]*class="[^"]*listing[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    /<article[^>]*class="[^"]*pet[^"]*"[^>]*>[\s\S]*?<\/article>/gi,
  ];
  
  // Pattern 2: Look for JSON-LD structured data (common on modern sites)
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
  
  // Extract pets from JSON-LD
  jsonLdData.forEach((item: any) => {
    if (item['@type'] === 'Product' || item['@type'] === 'ItemList' || item.name) {
      const pet: Partial<ScrapedPet> = {
        name: item.name || item.headline || 'Unknown',
        type: (item.category || '').toLowerCase().includes('cat') ? 'cat' : 'dog',
        breed: item.brand?.name || item.breed || 'Mixed Breed',
        description: item.description || '',
        photo_url: item.image || item.thumbnailUrl,
        source,
      };
      
      if (pet.name && pet.name !== 'Unknown') {
        pets.push(pet as ScrapedPet);
      }
    }
  });
  
  // Pattern 3: Extract from common HTML structures
  // Name patterns
  const namePatterns = [
    /<h[1-4][^>]*>([^<]+(?:dog|cat|puppy|kitten|pet)[^<]*)<\/h[1-4]>/gi,
    /<h[1-4][^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/h[1-4]>/gi,
    /<span[^>]*class="[^"]*pet-name[^"]*"[^>]*>([^<]+)<\/span>/gi,
    /<div[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/div>/gi,
    /"name"\s*:\s*"([^"]+)"/gi,
    /Name[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
  ];
  
  // Breed patterns
  const breedPatterns = [
    /"breed"\s*:\s*"([^"]+)"/gi,
    /<span[^>]*class="[^"]*breed[^"]*"[^>]*>([^<]+)<\/span>/gi,
    /Breed[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+Mix)?)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Mix|Breed|Retriever|Shepherd|Terrier|Hound|Spaniel|Bulldog|Poodle|Labrador|Golden|German|Pit|Boxer|Beagle|Chihuahua|Dachshund|Rottweiler|Siberian|Border|Australian|Collie|Great|Saint|Mastiff|Newfoundland|Bernese|Akita|Shiba|Husky|Malamute|Samoyed|Chow|Shar|Pug|Boston|French|English|American|Staffordshire|Bull|Jack|Russell|Yorkshire|West|Scottish|Cairn|Norfolk|Norwich|Schnauzer|Shih|Lhasa|Maltese|Pomeranian|Papillon|Pekingese|Tibetan|Bichon|Cocker|Springer|Brittany|Pointer|Setter|Weimaraner|Vizsla|Rhodesian|Basenji|Shiba|Akita|Chow|Shar|Pug|Boston|French|English|American|Staffordshire|Bull|Jack|Russell|Yorkshire|West|Scottish|Cairn|Norfolk|Norwich|Schnauzer|Shih|Lhasa|Maltese|Pomeranian|Papillon|Pekingese|Tibetan|Bichon|Cocker|Springer|Brittany|Pointer|Setter|Weimaraner|Vizsla|Rhodesian|Basenji))/gi,
  ];
  
  // Age patterns
  const agePatterns = [
    /"age"\s*:\s*"([^"]+)"/gi,
    /Age[:\s]+(\d+\s*(?:year|yr|month|mo|week|wk|day|old|young|senior|adult|puppy|kitten)s?)/gi,
    /(\d+\s*(?:year|yr|month|mo|week|wk|day|old|young|senior|adult|puppy|kitten)s?)/gi,
  ];
  
  // Gender patterns
  const genderPatterns = [
    /"gender"\s*:\s*"([^"]+)"/gi,
    /Gender[:\s]+(Male|Female|M|F|Spayed|Neutered)/gi,
    /(Male|Female|M|F|Spayed|Neutered)/gi,
  ];
  
  // Size patterns
  const sizePatterns = [
    /"size"\s*:\s*"([^"]+)"/gi,
    /Size[:\s]+(Small|Medium|Large|X-Large|XL|S|M|L|Tiny|Mini|Giant)/gi,
    /(Small|Medium|Large|X-Large|XL|S|M|L|Tiny|Mini|Giant)/gi,
  ];
  
  // Color patterns
  const colorPatterns = [
    /"color"\s*:\s*"([^"]+)"/gi,
    /Color[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /(Black|White|Brown|Tan|Blonde|Golden|Gray|Grey|Red|Brindle|Merle|Tricolor|Bicolor|Spotted|Striped)/gi,
  ];
  
  // Location patterns
  const locationPatterns = [
    /"location"\s*:\s*"([^"]+)"/gi,
    /Location[:\s]+([^<\n]+)/gi,
    /([A-Z][a-z]+,\s*[A-Z]{2})/g, // City, State
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New\s+Hampshire|New\s+Jersey|New\s+Mexico|New\s+York|North\s+Carolina|North\s+Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode\s+Island|South\s+Carolina|South\s+Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West\s+Virginia|Wisconsin|Wyoming)/gi,
  ];
  
  // Date patterns
  const datePatterns = [
    /"date[^"]*"\s*:\s*"([^"]+)"/gi,
    /(?:Lost|Found|Missing|Last\s+Seen)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
  ];
  
  // Photo URL patterns
  const photoPatterns = [
    /<img[^>]*src="([^"]*)"[^>]*class="[^"]*pet[^"]*"/gi,
    /<img[^>]*class="[^"]*pet[^"]*"[^>]*src="([^"]*)"/gi,
    /"image"\s*:\s*"([^"]+)"/gi,
    /"photo"\s*:\s*"([^"]+)"/gi,
    /"thumbnailUrl"\s*:\s*"([^"]+)"/gi,
  ];
  
  // Contact patterns
  const contactPatterns = [
    /"contact"\s*:\s*"([^"]+)"/gi,
    /Contact[:\s]+([^<\n]+)/gi,
    /Phone[:\s]+([\d\-\(\)\s]+)/gi,
    /Email[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
  ];
  
  // Description patterns
  const descriptionPatterns = [
    /"description"\s*:\s*"([^"]+)"/gi,
    /<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/p>/gi,
    /<div[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/div>/gi,
  ];
  
  // Extract individual pet cards/sections
  const petSections: string[] = [];
  petCardPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(cleanHtml)) !== null) {
      petSections.push(match[0]);
    }
  });
  
  // If no cards found, treat entire page as one pet listing
  if (petSections.length === 0) {
    petSections.push(cleanHtml);
  }
  
  // Extract pet info from each section
  petSections.forEach((section, index) => {
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
      const match = pattern.exec(section);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length > 1 && name.length < 50 && !name.toLowerCase().includes('adopt')) {
          pet.name = name;
          break;
        }
      }
    }
    
    // Extract breed
    for (const pattern of breedPatterns) {
      const match = pattern.exec(section);
      if (match && match[1]) {
        pet.breed = match[1].trim();
        break;
      }
    }
    
    // Extract age
    for (const pattern of agePatterns) {
      const match = pattern.exec(section);
      if (match && match[1]) {
        pet.age = match[1].trim();
        break;
      }
    }
    
    // Extract gender
    for (const pattern of genderPatterns) {
      const match = pattern.exec(section);
      if (match && match[1]) {
        pet.gender = match[1].trim();
        break;
      }
    }
    
    // Extract size
    for (const pattern of sizePatterns) {
      const match = pattern.exec(section);
      if (match && match[1]) {
        pet.size = match[1].trim().toLowerCase();
        break;
      }
    }
    
    // Extract color
    for (const pattern of colorPatterns) {
      const match = pattern.exec(section);
      if (match && match[1]) {
        pet.color = match[1].trim();
        break;
      }
    }
    
    // Extract location
    for (const pattern of locationPatterns) {
      const match = pattern.exec(section);
      if (match && match[1]) {
        const location = match[1].trim();
        if (location.includes(',')) {
          const [city, state] = location.split(',').map(s => s.trim());
          pet.location_city = city;
          pet.location_state = state;
        } else {
          pet.location_city = location;
        }
        break;
      }
    }
    
    // Extract date
    for (const pattern of datePatterns) {
      const match = pattern.exec(section);
      if (match && match[1]) {
        pet.date_lost = match[1].trim();
        break;
      }
    }
    
    // Extract photo
    for (const pattern of photoPatterns) {
      const match = pattern.exec(section);
      if (match && match[1]) {
        let photoUrl = match[1].trim();
        if (photoUrl.startsWith('//')) {
          photoUrl = 'https:' + photoUrl;
        } else if (photoUrl.startsWith('/')) {
          photoUrl = 'https://' + source + photoUrl;
        }
        pet.photo_url = photoUrl;
        break;
      }
    }
    
    // Extract contact
    for (const pattern of contactPatterns) {
      const match = pattern.exec(section);
      if (match && match[1]) {
        pet.contact_info = match[1].trim();
        break;
      }
    }
    
    // Extract description
    for (const pattern of descriptionPatterns) {
      const match = pattern.exec(section);
      if (match && match[1]) {
        pet.description = match[1].trim();
        break;
      }
    }
    
    // Determine type (dog/cat)
    const sectionLower = section.toLowerCase();
    if (sectionLower.includes('cat') || sectionLower.includes('kitten')) {
      pet.type = 'cat';
    } else if (sectionLower.includes('dog') || sectionLower.includes('puppy')) {
      pet.type = 'dog';
    }
    
    // Determine status (lost/found)
    const sectionText = section.toLowerCase();
    if (sectionText.includes('lost') || sectionText.includes('missing')) {
      pet.status = 'lost';
    } else if (sectionText.includes('found') || sectionText.includes('adopt') || sectionText.includes('available')) {
      pet.status = 'found';
    }
    
    // Build description if missing
    if (!pet.description || pet.description.length < 10) {
      const parts: string[] = [];
      if (pet.age) parts.push(pet.age);
      if (pet.breed) parts.push(pet.breed);
      if (pet.gender) parts.push(pet.gender);
      if (pet.size) parts.push(pet.size);
      if (pet.color) parts.push(pet.color);
      pet.description = parts.join(', ') || 'Pet available for adoption';
    }
    
    // Only add if we have a valid name
    if (pet.name && pet.name !== 'Unknown' && pet.name.length > 1) {
      pets.push(pet as ScrapedPet);
    }
  });
  
  console.log(`[HTML PARSER] Extracted ${pets.length} pets from HTML`);
  return pets;
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
      // Check for duplicates (by name + location + source)
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
      const dateValue = pet.date_lost || pet.date_found || new Date().toISOString().split('T')[0];
      
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
          location_detail: pet.location_detail || null,
          [dateField]: dateValue,
          owner_name: pet.contact_info || 'Community',
          owner_email: null,
          owner_phone: null,
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
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { html, source = 'html-upload', url } = body;

    if (!html) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      );
    }

    console.log(`[HTML SCRAPER] Starting HTML scrape...`);
    console.log(`[HTML SCRAPER] Source: ${source}`);
    console.log(`[HTML SCRAPER] HTML length: ${html.length} characters`);

    // Parse HTML for pets
    const pets = parsePetFromHTML(html, source);

    console.log(`[HTML SCRAPER] Found ${pets.length} pets in HTML`);

    // Save pets to database
    const saveResult = await savePets(pets);

    return NextResponse.json({
      success: true,
      petsFound: pets.length,
      petsSaved: saveResult.saved,
      petsSkipped: saveResult.skipped,
      errors: saveResult.errors,
      pets: pets.slice(0, 10), // Return first 10 for preview
      message: `Scraped ${pets.length} pets from HTML, saved ${saveResult.saved} to database`
    });

  } catch (error: any) {
    console.error('[HTML SCRAPER] Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to scrape HTML',
        success: false 
      },
      { status: 500 }
    );
  }
}












