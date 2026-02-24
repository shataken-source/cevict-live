import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Playwright for browser-based scraping
let playwright: any = null;
try {
  playwright = require('playwright');
} catch (e) {
  console.log('[AUTONOMOUS] Playwright not available');
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
  status: 'lost' | 'found';
}

// Try different Petfinder URL patterns
const PETFINDER_URL_PATTERNS = [
  (city: string, state: string) => `https://www.petfinder.com/search/dogs-for-adoption/us/${state.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}/`,
  (city: string, state: string) => `https://www.petfinder.com/search/?type=dog&location=${city}%2C%20${state}`,
  (city: string, state: string) => `https://www.petfinder.com/member/us/${state.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}/`,
];

// Try different selector strategies
const SELECTOR_STRATEGIES = [
  // Strategy 1: Common class names
  ['[class*="petCard"]', '[class*="PetCard"]', '[class*="pet-card"]'],
  // Strategy 2: Article tags
  ['article[class*="pet"]', 'article[class*="animal"]', 'article[class*="adopt"]'],
  // Strategy 3: Links to pet pages
  ['a[href*="/pet/"]', 'a[href*="/animal/"]', 'a[href*="/dog/"]'],
  // Strategy 4: Data attributes
  ['[data-testid*="pet"]', '[data-testid*="animal"]', '[data-id*="pet"]'],
  // Strategy 5: Generic cards
  ['[class*="card"]', '[class*="Card"]', '[class*="result"]'],
  // Strategy 6: Any element with pet-related classes
  ['[class*="pet"]', '[class*="animal"]', '[class*="adopt"]'],
];

// Scrape with a specific strategy
async function scrapeWithStrategy(
  url: string, 
  selectors: string[], 
  page: any, 
  area: string
): Promise<ScrapedPet[]> {
  const pets: ScrapedPet[] = [];
  
  try {
    console.log(`[AUTONOMOUS] Trying URL: ${url}`);
    console.log(`[AUTONOMOUS] Using selectors: ${selectors.join(', ')}`);
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Try different wait times
    const waitTimes = [3000, 5000, 8000];
    for (const waitTime of waitTimes) {
      await page.waitForTimeout(waitTime);
      
      for (const selector of selectors) {
        try {
          const elements = await page.$$(selector);
          console.log(`[AUTONOMOUS] Selector "${selector}" found ${elements.length} elements`);
          
          if (elements.length > 0) {
            const petData = await page.$$eval(selector, (cards: any[], sel: string) => {
              return cards.slice(0, 30).map((card: any) => {
                // Try multiple ways to get name
                let name = '';
                const nameSelectors = ['h2', 'h3', 'h4', '[class*="name"]', '[class*="title"]', 'a'];
                for (const nameSel of nameSelectors) {
                  const nameEl = card.querySelector(nameSel);
                  if (nameEl) {
                    name = (nameEl.textContent || nameEl.innerText || '').trim();
                    if (name && name.length > 0 && name.length < 50) break;
                  }
                }
                
                // If no name found, try extracting from text
                if (!name) {
                  const text = card.innerText || card.textContent || '';
                  const nameMatch = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
                  if (nameMatch) name = nameMatch[1];
                }
                
                // Get image
                const imgEl = card.querySelector('img');
                const photo = imgEl ? imgEl.src : '';
                
                // Get full text
                const text = card.innerText || card.textContent || '';
                
                // Extract breed
                const breedMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+(?:Mix|Mix Breed|Mixed|Retriever|Shepherd|Terrier|Hound|Spaniel|Setter|Pointer|Bulldog|Poodle|Collie|Husky|Malamute|Chihuahua|Dachshund|Beagle|Boxer|Rottweiler|Doberman|Labrador|Golden|German|Australian|Border|Corgi|Pomeranian|Shih Tzu|Yorkshire|Boston|French|English|American|Staffordshire|Pit|Bull|Pug|Basset|Bloodhound|Coonhound|Foxhound|Greyhound|Whippet|Shiba|Akita|Chow|Shar Pei|Lhasa|Tibetan|Maltese|Bichon|Havanese|Coton|Papillon|Pekingese|Persian|Siamese|Maine Coon|Ragdoll|British Shorthair|Scottish Fold|Bengal|Sphynx)))/i);
                
                // Extract age
                const ageMatch = text.match(/(\d+\s*(?:yr|year|years|mo|month|months|old|weeks?|days?))/i);
                
                // Extract gender
                const genderMatch = text.match(/(Male|Female|M|F)\b/i);
                
                // Determine type
                const isCat = /(cat|kitten|kitty)/i.test(text);
                const isDog = /(dog|puppy|pup)/i.test(text);
                const type = isCat ? 'cat' : (isDog ? 'dog' : 'dog');
                
                if (name && name.length > 0 && name.length < 50) {
                  return {
                    name,
                    breed: breedMatch ? breedMatch[1] : 'Mixed Breed',
                    age: ageMatch ? ageMatch[1] : 'Unknown',
                    gender: genderMatch ? genderMatch[1] : 'Unknown',
                    photo,
                    text: text.substring(0, 300),
                    type
                  };
                }
                return null;
              }).filter((pet: any) => pet !== null);
            }, selector);
            
            if (petData && petData.length > 0) {
              console.log(`[AUTONOMOUS] ✅ Found ${petData.length} pets with selector "${selector}"!`);
              
              const [city, state] = area.split(',').map(s => s.trim());
              for (const data of petData) {
                pets.push({
                  name: data.name,
                  type: data.type,
                  breed: data.breed,
                  age: data.age,
                  gender: data.gender,
                  size: 'medium',
                  color: 'N/A',
                  photo_url: data.photo,
                  description: `${data.age}, ${data.gender} ${data.breed} - ${data.text.substring(0, 100)}`,
                  location_city: city,
                  location_state: state,
                  source: 'petfinder:autonomous',
                  source_url: url,
                  status: 'found'
                });
              }
              
              // If we found pets, return them
              if (pets.length > 0) {
                return pets;
              }
            }
          }
        } catch (selError: any) {
          // Try next selector
        }
      }
    }
    
    // Fallback: Try to extract from page text
    const pageText = await page.textContent('body') || '';
    const petNameMatches = pageText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is|was|needs|looking|available|adopt|adoption)/gi);
    
    if (petNameMatches && petNameMatches.length > 0) {
      console.log(`[AUTONOMOUS] Found ${petNameMatches.length} potential pet names in text`);
      const [city, state] = area.split(',').map(s => s.trim());
      
      for (const match of petNameMatches.slice(0, 10)) {
        const name = match.split(/\s+/).slice(0, 2).join(' ');
        if (name && name.length > 0 && name.length < 50) {
          pets.push({
            name,
            type: 'dog',
            breed: 'Mixed Breed',
            age: 'Unknown',
            gender: 'Unknown',
            size: 'medium',
            color: 'N/A',
            photo_url: '',
            description: `Found via text extraction: ${match.substring(0, 100)}`,
            location_city: city,
            location_state: state,
            source: 'petfinder:text-extraction',
            source_url: url,
            status: 'found'
          });
        }
      }
    }
    
  } catch (error: any) {
    console.error(`[AUTONOMOUS] Error with strategy:`, error.message);
  }
  
  return pets;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const maxIterations = 20; // Maximum iterations before giving up
  const targetPets = 5; // Minimum pets to find before stopping
  const scraperId = `autonomous-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  let browser: any = null;
  
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    if (!playwright) {
      return NextResponse.json(
        { error: 'Playwright not available. Run: npx playwright install chromium' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const areas: string[] = body.areas || ['New York, NY', 'Los Angeles, CA'];
    
    console.log(`[AUTONOMOUS] Starting autonomous scraper loop`);
    console.log(`[AUTONOMOUS] Target: ${targetPets} pets, Max iterations: ${maxIterations}`);
    console.log(`[AUTONOMOUS] Scraper ID: ${scraperId}`);
    
    // Register this scraper
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'}/api/petreunion/check-running-scrapers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', scraperId, type: 'autonomous-loop' })
      });
      console.log(`[AUTONOMOUS] Registered scraper: ${scraperId}`);
    } catch (e) {
      console.log(`[AUTONOMOUS] Could not register scraper (non-fatal)`);
    }
    
    browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const allPets: ScrapedPet[] = [];
    const seenPets = new Set<string>();
    let iteration = 0;
    let totalSaved = 0;
    const logs: string[] = [];

    // Loop until we get pets or hit max iterations
    while (totalSaved < targetPets && iteration < maxIterations) {
      iteration++;
      console.log(`\n[AUTONOMOUS] ===== ITERATION ${iteration} =====`);
      logs.push(`Iteration ${iteration}`);
      
      for (const area of areas) {
        const [city, state] = area.split(',').map(s => s.trim());
        console.log(`[AUTONOMOUS] Processing area: ${area}`);
        logs.push(`Processing: ${area}`);
        
        // Try each URL pattern
        for (const urlPattern of PETFINDER_URL_PATTERNS) {
          const url = urlPattern(city, state);
          
          // Try each selector strategy
          for (const selectors of SELECTOR_STRATEGIES) {
            try {
              const page = await browser.newPage();
              const pets = await scrapeWithStrategy(url, selectors, page, area);
              await page.close();
              
              if (pets.length > 0) {
                console.log(`[AUTONOMOUS] ✅ Found ${pets.length} pets!`);
                logs.push(`Found ${pets.length} pets from ${url}`);
                
                // Add unique pets
                for (const pet of pets) {
                  const key = `${pet.name}_${pet.location_city}_${pet.source}`;
                  if (!seenPets.has(key)) {
                    seenPets.add(key);
                    allPets.push(pet);
                  }
                }
                
                // If we have enough pets, try to save them
                if (allPets.length >= targetPets) {
                  break;
                }
              }
              
              // Small delay between attempts
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error: any) {
              console.error(`[AUTONOMOUS] Error:`, error.message);
              logs.push(`Error: ${error.message}`);
            }
          }
          
          if (allPets.length >= targetPets) break;
        }
        
        if (allPets.length >= targetPets) break;
      }
      
      // Try to save pets to database
      if (allPets.length > 0) {
        console.log(`[AUTONOMOUS] Attempting to save ${allPets.length} pets to database...`);
        
        for (const pet of allPets) {
          try {
            // Check for duplicates
            const { data: existing } = await supabase
              .from('lost_pets')
              .select('id')
              .eq('pet_name', pet.name)
              .eq('location_city', pet.location_city || '')
              .eq('source', pet.source)
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
                status: pet.status,
                location_city: pet.location_city || 'Unknown',
                location_state: pet.location_state || 'AL',
                date_lost: new Date().toISOString().split('T')[0]
              })
              .select()
              .single();

            if (petError) {
              console.error(`[AUTONOMOUS] Error saving ${pet.name}:`, petError.message);
              logs.push(`Error saving ${pet.name}: ${petError.message}`);
            } else if (newPet) {
              totalSaved++;
              console.log(`[AUTONOMOUS] ✅ Saved pet: ${pet.name} (${totalSaved}/${targetPets})`);
              logs.push(`✅ Saved: ${pet.name}`);
            }
          } catch (petError: any) {
            console.error(`[AUTONOMOUS] Error processing pet:`, petError.message);
          }
        }
        
        // Clear saved pets from array to avoid re-saving
        allPets.length = 0;
      }
      
      // If we've saved enough, break
      if (totalSaved >= targetPets) {
        console.log(`[AUTONOMOUS] ✅ SUCCESS! Saved ${totalSaved} pets!`);
        logs.push(`✅ SUCCESS! Saved ${totalSaved} pets!`);
        break;
      }
      
      // Wait before next iteration
      console.log(`[AUTONOMOUS] Waiting before next iteration... (saved: ${totalSaved}/${targetPets})`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    await browser.close();

    // Unregister scraper
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'}/api/petreunion/check-running-scrapers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unregister', scraperId })
      });
      console.log(`[AUTONOMOUS] Unregistered scraper: ${scraperId}`);
    } catch (e) {
      // Ignore unregistration errors
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: totalSaved >= targetPets,
      iterations: iteration,
      petsFound: seenPets.size,
      petsSaved: totalSaved,
      targetPets,
      duration,
      logs: logs.slice(-50), // Last 50 log entries
      message: totalSaved >= targetPets 
        ? `✅ SUCCESS! Saved ${totalSaved} pets in ${iteration} iterations!`
        : `⚠️ Saved ${totalSaved} pets in ${iteration} iterations (target: ${targetPets})`
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[AUTONOMOUS] Fatal error:', error);
    
    // Unregister scraper on error
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'}/api/petreunion/check-running-scrapers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unregister', scraperId })
      });
    } catch (e) {
      // Ignore unregistration errors
    }
    
    // Ensure browser is closed
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore
      }
    }
    
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

