import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Scrape pets from Pawboost
 * Pawboost aggregates lost/found pets from multiple sources
 */
async function scrapePawboost(city: string, state: string, zipcode?: string) {
  const pets: any[] = [];
  
  try {
    let playwright: any = null;
    try {
      playwright = require('playwright');
    } catch (e) {
      console.log('[PAWBOOST] Playwright not available');
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
    
    // Search Pawboost for lost/found pets in the area
    const searchUrl = `https://www.pawboost.com/lost-found-pets?location=${encodeURIComponent(`${city}, ${state}`)}`;
    
    console.log(`[PAWBOOST] Loading ${searchUrl}...`);
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    // Scroll to load more pets
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    }
    
    // Extract pet listings
    const petListings = await page.evaluate(() => {
      const pets: any[] = [];
      
      // Pawboost uses various selectors for pet cards
      const cardSelectors = [
        '.pet-card',
        '.lost-pet-card',
        '.found-pet-card',
        '[class*="pet"]',
        '[class*="listing"]',
        'div[data-pet-id]'
      ];
      
      let petCards: any[] = [];
      for (const selector of cardSelectors) {
        const cards = Array.from(document.querySelectorAll(selector));
        if (cards.length > 0) {
          petCards = cards;
          break;
        }
      }
      
      // If no specific cards found, try generic approach
      if (petCards.length === 0) {
        petCards = Array.from(document.querySelectorAll('div[class*="card"], article, [role="article"]'));
      }
      
      for (const card of petCards.slice(0, 100)) { // Limit to 100 pets
        try {
          // Get pet name
          const nameSelectors = ['h2', 'h3', '.pet-name', '[class*="name"]', 'strong'];
          let petName = '';
          for (const selector of nameSelectors) {
            const nameEl = card.querySelector(selector);
            if (nameEl) {
              const text = (nameEl.textContent || '').trim();
              if (text.length > 0 && text.length < 50) {
                petName = text;
                break;
              }
            }
          }
          
          // Get description
          const descSelectors = ['.description', '.pet-description', 'p', '[class*="desc"]'];
          let description = '';
          for (const selector of descSelectors) {
            const descEl = card.querySelector(selector);
            if (descEl) {
              description = (descEl.textContent || '').trim();
              if (description.length > 20) break;
            }
          }
          
          // Get images
          const images: string[] = [];
          const imgEls = card.querySelectorAll('img');
          imgEls.forEach((img: any) => {
            const src = img.src || img.getAttribute('src') || img.getAttribute('data-src');
            if (src && src.startsWith('http') && !images.includes(src)) {
              images.push(src);
            }
          });
          
          // Get location
          const locationSelectors = ['.location', '[class*="location"]', '[class*="city"]'];
          let location = '';
          for (const selector of locationSelectors) {
            const locEl = card.querySelector(selector);
            if (locEl) {
              location = (locEl.textContent || '').trim();
              if (location.length > 0) break;
            }
          }
          
          // Get status (lost/found)
          const cardText = card.textContent || '';
          let status = 'found';
          if (cardText.toLowerCase().includes('lost') || cardText.toLowerCase().includes('missing')) {
            status = 'lost';
          }
          
          // Determine pet type
          let petType = 'dog';
          if (cardText.toLowerCase().includes('cat') || cardText.toLowerCase().includes('kitten')) {
            petType = 'cat';
          }
          
          // Extract breed
          let breed = '';
          const breedPatterns = [
            /(?:labrador|lab|golden retriever|pit bull|pitbull|german shepherd|beagle|boxer|bulldog|poodle|rottweiler|doberman|husky|chihuahua|shih tzu|yorkie|yorkshire terrier|maltese|pomeranian|bichon|dachshund|basset hound|great dane|mastiff|saint bernard|border collie|australian shepherd|jack russell|terrier|mix|mixed)/i
          ];
          
          for (const pattern of breedPatterns) {
            const match = cardText.match(pattern);
            if (match) {
              breed = match[0].trim();
              break;
            }
          }
          
          // Extract age
          let age = '';
          const agePattern = /(\d+)\s*(?:year|month|week|day|yr|mo|wk)s?\s*old/i;
          const ageMatch = cardText.match(agePattern);
          if (ageMatch) {
            age = ageMatch[0].trim();
          }
          
          // Extract gender
          let gender = '';
          if (cardText.toLowerCase().includes('male') && !cardText.toLowerCase().includes('female')) {
            gender = 'male';
          } else if (cardText.toLowerCase().includes('female')) {
            gender = 'female';
          }
          
          if ((petName || description.length > 20) && (images.length > 0 || description.length > 30)) {
            pets.push({
              name: petName || 'Unknown',
              description: description || cardText.substring(0, 500),
              breed: breed || 'Mixed Breed',
              age: age || 'Unknown',
              pet_type: petType,
              gender: gender || 'unknown',
              location: location,
              images: images.slice(0, 5),
              status: status,
              source: 'pawboost'
            });
          }
        } catch (error) {
          continue;
        }
      }
      
      return pets;
    });
    
    await browser.close();
    
    console.log(`[PAWBOOST] Found ${petListings.length} pets`);
    return { pets: petListings, error: null };
    
  } catch (error: any) {
    console.error(`[PAWBOOST] Error scraping ${city}, ${state}:`, error.message);
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
      
      // Extract city/state from location if available, otherwise use passed values
      let locationCity = city || null;
      let locationState = state || null;
      if (pet.location) {
        const parts = pet.location.split(',').map((p: string) => p.trim());
        if (parts.length >= 2) {
          locationCity = parts[0];
          locationState = parts[1];
        } else {
          locationCity = parts[0] || city || null;
        }
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
        fullDescription = `${pet.breed || 'Mixed Breed'} ${pet.pet_type || 'pet'} - ${pet.status === 'lost' ? 'Lost' : 'Found'}`;
        if (pet.age && pet.age !== 'Unknown') {
          fullDescription = `Age: ${pet.age}. ${fullDescription}`;
        }
      }
      
      // Resize image if available
      let photoUrl = pet.images && pet.images.length > 0 ? pet.images[0] : null;
      if (photoUrl) {
        try {
          // Resize image via API
          const resizeResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://petreunion-final.vercel.app'}/api/petreunion/resize-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: photoUrl, maxWidth: 800, maxHeight: 800, quality: 0.85, format: 'jpeg' })
          });
          if (resizeResponse.ok) {
            const resizeData = await resizeResponse.json();
            if (resizeData.success && resizeData.dataUrl) {
              photoUrl = resizeData.dataUrl;
              console.log(`[PAWBOOST] Resized image: ${resizeData.size} bytes`);
            }
          }
        } catch (error) {
          console.warn(`[PAWBOOST] Failed to resize image, using original:`, error);
        }
      }

      const petData: any = {
        pet_name: pet.name || 'Unknown',
        pet_type: pet.pet_type || 'dog',
        breed: pet.breed || 'Mixed Breed',
        color: 'Unknown', // Pawboost doesn't always provide color
        description: fullDescription,
        photo_url: photoUrl,
        status: pet.status || 'found',
        date_lost: new Date().toISOString().split('T')[0], // Use today as default
        location_city: locationCity || '',
        location_state: locationState || '',
        owner_name: 'Public Report' // Default for Pawboost posts
      };
      
      const { error } = await supabase
        .from('lost_pets')
        .insert(petData);
      
      if (error) {
        console.error(`[PAWBOOST] Error saving pet:`, error.message);
      } else {
        saved++;
      }
    } catch (error: any) {
      console.error(`[PAWBOOST] Error processing pet:`, error.message);
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
      maxPets = 100
    } = body;
    
    if (!city || !state) {
      return NextResponse.json(
        { error: 'City and state are required' },
        { status: 400 }
      );
    }
    
    console.log(`[PAWBOOST] Scraping Pawboost for ${city}, ${state}...`);
    
    // Scrape Pawboost
    const { pets, error: scrapeError } = await scrapePawboost(city, state, zipcode);
    
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
      message: `Found ${pets.length} pets on Pawboost, saved ${saved} new pets to database`
    });
    
  } catch (error: any) {
    console.error('[PAWBOOST] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape Pawboost' },
      { status: 500 }
    );
  }
}

