import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Scrape pets from PetHarbor
 * PetHarbor aggregates pets from multiple shelters
 */
async function scrapePetHarbor(city: string, state: string, zipcode?: string) {
  const pets: any[] = [];
  
  try {
    let playwright: any = null;
    try {
      playwright = require('playwright');
    } catch (e) {
      console.log('[PETHARBOR] Playwright not available');
      return { pets: [], error: 'Playwright not installed' };
    }
    
    const browser = await playwright.chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // PetHarbor search URL
    const searchUrl = `https://www.petharbor.com/results.asp?searchtype=ADOPT&start=4&friends=1&samaritans=1&nosurrend=1&rows=100&imght=120&imgres=detail&tWidth=200&view=sysadm.v_pet&fontface=arial&fontsize=10&zip=${zipcode || ''}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`;
    
    console.log(`[PETHARBOR] Loading ${searchUrl}...`);
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    // Extract pet listings
    const petListings = await page.evaluate(() => {
      const pets: any[] = [];
      
      // PetHarbor uses table rows or divs for pet listings
      const petSelectors = [
        'tr[class*="pet"]',
        'tr[class*="row"]',
        '.pet-listing',
        '[class*="pet-row"]',
        'table tr'
      ];
      
      let petRows: any[] = [];
      for (const selector of petSelectors) {
        const rows = Array.from(document.querySelectorAll(selector));
        if (rows.length > 5) { // Make sure we found actual pet rows
          petRows = rows;
          break;
        }
      }
      
      for (const row of petRows.slice(0, 200)) { // Limit to 200 pets
        try {
          const rowText = row.textContent || '';
          
          // Skip header rows
          if (rowText.toLowerCase().includes('pet id') || rowText.toLowerCase().includes('name') && rowText.toLowerCase().includes('breed')) {
            continue;
          }
          
          // Get pet name
          const nameSelectors = ['td:first-child', 'td:nth-child(2)', 'strong', 'b', '.pet-name'];
          let petName = '';
          for (const selector of nameSelectors) {
            const nameEl = row.querySelector(selector);
            if (nameEl) {
              const text = (nameEl.textContent || '').trim();
              if (text.length > 0 && text.length < 50 && !text.includes('Pet ID')) {
                petName = text;
                break;
              }
            }
          }
          
          // Get images
          const images: string[] = [];
          const imgEls = row.querySelectorAll('img');
          imgEls.forEach((img: any) => {
            const src = img.src || img.getAttribute('src') || img.getAttribute('data-src');
            if (src && src.startsWith('http') && !images.includes(src)) {
              images.push(src);
            }
          });
          
          // Extract breed from text
          let breed = '';
          const breedPatterns = [
            /(?:labrador|lab|golden retriever|pit bull|pitbull|german shepherd|beagle|boxer|bulldog|poodle|rottweiler|doberman|husky|chihuahua|shih tzu|yorkie|yorkshire terrier|maltese|pomeranian|bichon|dachshund|basset hound|great dane|mastiff|saint bernard|border collie|australian shepherd|jack russell|terrier|mix|mixed)/i
          ];
          
          for (const pattern of breedPatterns) {
            const match = rowText.match(pattern);
            if (match) {
              breed = match[0].trim();
              break;
            }
          }
          
          // Extract age
          let age = '';
          const agePattern = /(\d+)\s*(?:year|month|week|day|yr|mo|wk)s?\s*old/i;
          const ageMatch = rowText.match(agePattern);
          if (ageMatch) {
            age = ageMatch[0].trim();
          }
          
          // Determine pet type
          let petType = 'dog';
          if (rowText.toLowerCase().includes('cat') || rowText.toLowerCase().includes('kitten')) {
            petType = 'cat';
          }
          
          // Extract gender
          let gender = '';
          if (rowText.toLowerCase().includes('male') && !rowText.toLowerCase().includes('female')) {
            gender = 'male';
          } else if (rowText.toLowerCase().includes('female')) {
            gender = 'female';
          }
          
          // Get description (use row text as description)
          const description = rowText.substring(0, 500);
          
          if ((petName || description.length > 20) && (images.length > 0 || description.length > 30)) {
            pets.push({
              name: petName || 'Unknown',
              description: description,
              breed: breed || 'Mixed Breed',
              age: age || 'Unknown',
              pet_type: petType,
              gender: gender || 'unknown',
              images: images.slice(0, 5),
              status: 'found', // PetHarbor is typically for adoptable pets
              source: 'petharbor'
            });
          }
        } catch (error) {
          continue;
        }
      }
      
      return pets;
    });
    
    await browser.close();
    
    console.log(`[PETHARBOR] Found ${petListings.length} pets`);
    return { pets: petListings, error: null };
    
  } catch (error: any) {
    console.error(`[PETHARBOR] Error scraping ${city}, ${state}:`, error.message);
    return { pets: [], error: error.message };
  }
}

/**
 * Save pets to database
 */
async function savePets(pets: any[], city?: string, state?: string) {
  if (!supabase || pets.length === 0) return { saved: 0, skipped: 0 };
  
  let saved = 0;
  let skipped = 0;
  
  for (const pet of pets) {
    try {
      // Check if pet already exists
      const descriptionHash = pet.description?.substring(0, 100) || '';
      
      const { data: existing } = await supabase
        .from('lost_pets')
        .select('id')
        .eq('description', descriptionHash)
        .limit(1)
        .single();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Build description with age/gender info
      let fullDescription = pet.description?.trim() || '';
      if (pet.age && pet.age !== 'Unknown') {
        fullDescription = `Age: ${pet.age}. ${fullDescription}`.trim();
      }
      if (pet.gender && pet.gender !== 'unknown') {
        fullDescription = `Gender: ${pet.gender}. ${fullDescription}`.trim();
      }
      
      // Ensure we have at least a basic description
      if (!fullDescription || fullDescription.length < 10) {
        fullDescription = `${pet.breed || 'Mixed Breed'} ${pet.pet_type || 'pet'} available for adoption`;
        if (pet.age && pet.age !== 'Unknown') {
          fullDescription = `Age: ${pet.age}. ${fullDescription}`;
        }
      }
      
      // First, save pet without images to get ID
      const petData: any = {
        pet_name: pet.name || 'Unknown',
        pet_type: pet.pet_type || 'dog',
        breed: pet.breed || 'Mixed Breed',
        color: 'Unknown', // PetHarbor doesn't always provide color
        description: fullDescription,
        photo_url: pet.images && pet.images.length > 0 ? pet.images[0] : null,
        status: pet.status || 'found',
        date_lost: new Date().toISOString().split('T')[0], // Use today as default for found pets
        location_city: city || '',
        location_state: state || '',
        owner_name: 'Shelter/Rescue' // Default for scraped pets
      };
      
      const { data: insertedPet, error } = await supabase
        .from('lost_pets')
        .insert(petData)
        .select()
        .single();
      
      if (error || !insertedPet) {
        console.error(`[PETHARBOR] Error saving pet:`, error);
        continue;
      }
      
      // Now process images with the actual pet ID
      let imageVectors: number[][] = [];
      let updatedPhotoUrl = petData.photo_url;
      
      if (pet.images && pet.images.length > 0) {
        try {
          const { processPetImages } = await import('../../../../lib/pet-image-processor');
          const processedImages = await processPetImages(pet.images, insertedPet.id.toString());
          
          if (processedImages.length > 0) {
            // Use first processed image as main photo
            updatedPhotoUrl = processedImages[0].supabaseUrl;
            
            // Collect vectors
            imageVectors = processedImages
              .filter(img => img.vector !== null)
              .map(img => img.vector!);
            
            console.log(`[PETHARBOR] Processed ${processedImages.length} images, ${imageVectors.length} with vectors`);
            
            // Update pet with processed images and vectors
            await supabase
              .from('lost_pets')
              .update({
                photo_url: updatedPhotoUrl,
                image_vectors: imageVectors.length > 0 ? imageVectors : null
              })
              .eq('id', insertedPet.id);
          }
        } catch (error: any) {
          console.warn(`[PETHARBOR] Failed to process images:`, error.message);
        }
      }
      
      if (error) {
        console.error(`[PETHARBOR] Error saving pet:`, error.message);
      } else {
        saved++;
      }
    } catch (error: any) {
      console.error(`[PETHARBOR] Error processing pet:`, error.message);
    }
  }
  
  return { saved, skipped };
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
    const { 
      city,
      state,
      zipcode,
      maxPets = 200
    } = body;
    
    if (!city || !state) {
      return NextResponse.json(
        { error: 'City and state are required' },
        { status: 400 }
      );
    }
    
    console.log(`[PETHARBOR] Scraping PetHarbor for ${city}, ${state}...`);
    
    // Scrape PetHarbor
    const { pets, error: scrapeError } = await scrapePetHarbor(city, state, zipcode);
    
    if (scrapeError) {
      return NextResponse.json(
        { error: scrapeError, petsFound: 0, petsSaved: 0 },
        { status: 500 }
      );
    }
    
    // Limit to maxPets
    const petsToSave = pets.slice(0, maxPets);
    
    // Save pets to database
    const { saved, skipped } = await savePets(petsToSave, city, state);
    
    return NextResponse.json({
      success: true,
      petsFound: pets.length,
      petsSaved: saved,
      petsSkipped: skipped,
      message: `Found ${pets.length} pets on PetHarbor, saved ${saved} new pets to database`
    });
    
  } catch (error: any) {
    console.error('[PETHARBOR] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape PetHarbor' },
      { status: 500 }
    );
  }
}

