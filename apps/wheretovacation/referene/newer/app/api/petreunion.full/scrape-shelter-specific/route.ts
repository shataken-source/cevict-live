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
  console.log('[SHELTER] Playwright not available');
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

// Scrape AdoptAPet shelter page
async function scrapeAdoptAPetShelter(url: string, browser: any): Promise<ScrapedPet[]> {
  const pets: ScrapedPet[] = [];
  
  if (!browser) {
    console.log('[ADOPTAPET] Browser not available');
    return pets;
  }

  try {
    const page = await browser.newPage();
    
    // Set realistic browser fingerprint
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set extra headers to look more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    });
    
    console.log(`[ADOPTAPET] Scraping: ${url}`);
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    } catch (navError: any) {
      console.log(`[ADOPTAPET] Navigation error, trying with domcontentloaded: ${navError.message}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
    
    await page.waitForTimeout(8000); // Wait longer for content to load
    
    // Check if we got blocked
    const pageTitle = await page.title();
    const pageText = await page.textContent('body') || '';
    
    if (pageTitle.includes('ERROR') || pageText.includes('403') || pageText.includes('blocked') || pageText.includes('CloudFront')) {
      console.log(`[ADOPTAPET] ⚠️ Page blocked by CloudFront/bot protection`);
      console.log(`[ADOPTAPET] Page title: ${pageTitle}`);
      console.log(`[ADOPTAPET] Page text preview: ${pageText.substring(0, 200)}`);
      await page.close();
      return pets; // Return empty - can't scrape if blocked
    }
    
    // Scroll to load more pets (AdoptAPet uses lazy loading)
    console.log(`[ADOPTAPET] Scrolling to load content...`);
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(3000);
    
    // Scroll back up
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(2000);
    
    // Try clicking "Load More" if it exists
    try {
      const loadMoreButton = await page.$('button:has-text("Load More"), a:has-text("Load More"), [class*="load-more"], [class*="LoadMore"]');
      if (loadMoreButton) {
        console.log(`[ADOPTAPET] Found "Load More" button, clicking...`);
        await loadMoreButton.click();
        await page.waitForTimeout(3000);
      }
    } catch (e) {
      // No load more button
    }
    
    // Try multiple selector strategies for AdoptAPet
    const selectors = [
      'a[href*="/pet/"]',  // Links to pet pages
      '[class*="pet-card"]',
      '[class*="PetCard"]',
      '[class*="pet"]',
      'article',
      '[data-pet-id]',
      '[class*="animal"]'
    ];
    
    let petElements: any[] = [];
    
    let foundPets = false;
    for (const selector of selectors) {
      if (foundPets) break; // Stop if we already found pets
      
      try {
        const count = await page.$$(selector).then(els => els.length);
        console.log(`[ADOPTAPET] Selector "${selector}" found ${count} elements`);
        
        if (count > 0) {
          try {
            // Try to extract pet data
            petElements = await page.$$eval(selector, (elements: any[]) => {
              return elements.slice(0, 50).map((el: any) => {
                // Get the link if it's an anchor
                const link = el.href || (el.querySelector('a')?.href) || '';
                const isPetLink = link.includes('/pet/');
                
                // Get text content
                const text = el.innerText || el.textContent || '';
                
                // Try to find name - AdoptAPet format: "Name (Nickname)" or just "Name"
                let name = '';
                const namePatterns = [
                  /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s*\([^)]+\))?)/,  // "Name (Nickname)"
                  /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,  // Just "Name"
                ];
                
                for (const pattern of namePatterns) {
                  const match = text.match(pattern);
                  if (match && match[1]) {
                    name = match[1].trim();
                    // Remove nickname in parentheses if present
                    name = name.replace(/\s*\([^)]+\)$/, '');
                    break;
                  }
                }
                
                // If no name found, try from heading
                if (!name) {
                  const heading = el.querySelector('h2, h3, h4, [class*="name"], [class*="title"]');
                  if (heading) {
                    name = (heading.textContent || heading.innerText || '').trim();
                    name = name.replace(/\s*\([^)]+\)$/, ''); // Remove nickname
                  }
                }
                
                // Extract breed - AdoptAPet format: "Breed (Size)"
                let breed = 'Mixed Breed';
                const breedMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s*\([^)]+\))?)/);
                if (breedMatch) {
                  breed = breedMatch[1].trim();
                  // Remove size in parentheses if present
                  breed = breed.replace(/\s*\([^)]+\)$/, '');
                }
                
                // Extract age and gender - AdoptAPet format: "Male, 2 Yrs 5 Mos" or "Female, 7 Yrs"
                let age = 'Unknown';
                let gender = 'Unknown';
                const ageGenderMatch = text.match(/(Male|Female),\s*(\d+\s*(?:Yr|Yrs|Mo|Mos|Year|Years|Month|Months|Old|Weeks?|Days?)\s*(?:\d+\s*(?:Yr|Yrs|Mo|Mos|Year|Years|Month|Months|Old|Weeks?|Days?))?)/i);
                if (ageGenderMatch) {
                  gender = ageGenderMatch[1];
                  age = ageGenderMatch[2].replace(/\s+/g, ' '); // Normalize spaces
                }
                
                // Extract size - AdoptAPet format: "Med. 26-60 lbs" or "Large 61-100 lbs"
                let size = 'medium';
                const sizeMatch = text.match(/(Small|Med\.?|Medium|Large)\s*\d+/i);
                if (sizeMatch) {
                  const sizeText = sizeMatch[1].toLowerCase();
                  if (sizeText.includes('small')) size = 'small';
                  else if (sizeText.includes('large')) size = 'large';
                  else size = 'medium';
                }
                
                // Get image
                const imgEl = el.querySelector('img');
                const photo = imgEl ? imgEl.src : '';
                
                // Determine type
                const isCat = /(cat|kitten|kitty)/i.test(text);
                const type = isCat ? 'cat' : 'dog';
                
                if (name && name.length > 0 && name.length < 50) {
                  return {
                    name,
                    breed,
                    age,
                    gender,
                    size,
                    photo,
                    text: text.substring(0, 300),
                    type,
                    link
                  };
                }
                return null;
              }).filter((pet: any) => pet !== null && pet.name);
            });
            
            if (petElements.length > 0) {
              console.log(`[ADOPTAPET] ✅ Found ${petElements.length} pets with selector "${selector}"!`);
              foundPets = true; // Mark that we found pets
              break; // Found pets, stop trying other selectors
            }
          } catch (evalError: any) {
            console.log(`[ADOPTAPET] Error evaluating selector "${selector}":`, evalError.message);
          }
        }
      } catch (selError: any) {
        console.log(`[ADOPTAPET] Error with selector "${selector}":`, selError.message);
        // Try next selector
      }
    }
    
    // Convert to ScrapedPet format
    for (const petData of petElements) {
      pets.push({
        name: petData.name,
        type: petData.type,
        breed: petData.breed,
        age: petData.age,
        gender: petData.gender,
        size: petData.size,
        color: 'N/A',
        photo_url: petData.photo,
        description: `${petData.age}, ${petData.gender} ${petData.breed} (${petData.size}) from 2nd Chance Shelter`,
        location_city: 'Boaz',
        location_state: 'AL',
        source: 'adoptapet:2nd-chance-shelter',
        source_url: petData.link || url,
        status: 'found'
      });
    }
    
    await page.close();
    console.log(`[ADOPTAPET] Found ${pets.length} pets total`);
    
  } catch (error: any) {
    console.error(`[ADOPTAPET] Error:`, error.message);
  }
  
  return pets;
}

// Scrape Facebook page (requires login, so may be limited)
async function scrapeFacebookShelter(url: string, browser: any): Promise<ScrapedPet[]> {
  const pets: ScrapedPet[] = [];
  
  if (!browser) {
    return pets;
  }

  try {
    const page = await browser.newPage();
    console.log(`[FACEBOOK] Scraping: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    // Check if login is required
    const pageText = await page.textContent('body') || '';
    if (pageText.includes('Log Into Facebook') || pageText.includes('You must log in')) {
      console.log('[FACEBOOK] Login required - skipping Facebook scraping');
      await page.close();
      return pets;
    }
    
    // Try to find posts with pet information
    const posts = await page.$$eval('[role="article"], [data-pagelet]', (articles: any[]) => {
      return articles.slice(0, 20).map((article: any) => {
        const text = article.innerText || article.textContent || '';
        const imgEl = article.querySelector('img');
        
        // Check if it's a pet post
        const hasPetKeywords = /(dog|puppy|cat|kitten|adopt|adoption|rescue|available|looking for)/i.test(text);
        if (!hasPetKeywords) return null;
        
        const nameMatch = text.match(/(?:name|named|meet|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
        const breedMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+(?:Mix|Mix Breed|Mixed|Retriever|Shepherd|Terrier|Hound|Spaniel|Setter|Pointer|Bulldog|Poodle|Collie|Husky|Malamute|Chihuahua|Dachshund|Beagle|Boxer|Rottweiler|Doberman|Labrador|Golden|German|Australian|Border|Corgi|Pomeranian|Shih Tzu|Yorkshire|Boston|French|English|American|Staffordshire|Pit|Bull|Pug|Basset|Bloodhound|Coonhound|Foxhound|Greyhound|Whippet|Shiba|Akita|Chow|Shar Pei|Lhasa|Tibetan|Maltese|Bichon|Havanese|Coton|Papillon|Pekingese|Persian|Siamese|Maine Coon|Ragdoll|British Shorthair|Scottish Fold|Bengal|Sphynx)))/i);
        const ageMatch = text.match(/(\d+\s*(?:yr|year|years|mo|month|months|old|weeks?|days?))/i);
        
        return {
          name: nameMatch ? nameMatch[1] : 'Unknown',
          breed: breedMatch ? breedMatch[1] : 'Mixed Breed',
          age: ageMatch ? ageMatch[1] : 'Unknown',
          photo: imgEl ? imgEl.src : '',
          text: text.substring(0, 300)
        };
      }).filter((post: any) => post !== null && post.name !== 'Unknown');
    });
    
    for (const post of posts) {
      pets.push({
        name: post.name,
        type: /(cat|kitten)/i.test(post.text) ? 'cat' : 'dog',
        breed: post.breed,
        age: post.age,
        gender: 'Unknown',
        size: 'medium',
        color: 'N/A',
        photo_url: post.photo,
        description: post.text,
        location_city: 'Boaz',
        location_state: 'AL',
        source: 'facebook:2nd-chance-shelter',
        source_url: url,
        status: 'found'
      });
    }
    
    await page.close();
    console.log(`[FACEBOOK] Found ${pets.length} pets`);
    
  } catch (error: any) {
    console.error(`[FACEBOOK] Error:`, error.message);
  }
  
  return pets;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const scraperId = `shelter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  let browser: any = null;
  
  try {
    // Check for active scrapers
    try {
      const checkResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://petreunion-final.vercel.app'}/api/petreunion/check-running-scrapers`);
      const checkData = await checkResponse.json();
      if (checkData.activeScrapers > 0) {
        console.log(`[SHELTER] Warning: ${checkData.activeScrapers} other scraper(s) are running`);
      }
    } catch (e) {
      // Ignore check errors
    }
    
    // Register this scraper
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003'}/api/petreunion/check-running-scrapers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', scraperId, type: 'shelter-specific' })
      });
    } catch (e) {
      // Ignore registration errors
    }
    if (!supabase) {
      const missingVars: string[] = [];
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        missingVars.push('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
      }
      return NextResponse.json(
        { 
          error: 'Database not configured',
          message: `Missing environment variables: ${missingVars.join(', ')}`,
          details: process.env.NODE_ENV === 'development' ? 'Check your .env.local file' : undefined
        },
        { status: 500 }
      );
    }

    if (!playwright) {
      return NextResponse.json(
        { 
          error: 'Playwright not available',
          message: 'Playwright is required for browser-based scraping',
          solution: 'Run: npx playwright install chromium'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const adoptapetUrl = body.adoptapetUrl || 'https://www.adoptapet.com/shelter/101983-2nd-chance-shelter-boaz-alabama#available-pets';
    const facebookUrl = body.facebookUrl || 'https://www.facebook.com/2ndchanceshelter/';

    console.log(`[SHELTER] Starting scrape for 2nd Chance Shelter`);
    console.log(`[SHELTER] AdoptAPet: ${adoptapetUrl}`);
    console.log(`[SHELTER] Facebook: ${facebookUrl}`);

    try {
      browser = await playwright.chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      console.log('[SHELTER] Browser launched successfully');
    } catch (browserError: any) {
      console.error('[SHELTER] Browser launch failed:', browserError.message);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to launch browser',
          message: browserError.message,
          solution: 'Try: npx playwright install chromium'
        },
        { status: 500 }
      );
    }

    const allPets: ScrapedPet[] = [];
    const seenPets = new Set<string>();
    const results = {
      adoptapetPets: 0,
      facebookPets: 0,
      petsSaved: 0,
      errors: [] as string[]
    };

    // Scrape AdoptAPet
    try {
      console.log('[SHELTER] Starting AdoptAPet scrape...');
      const adoptapetPets = await scrapeAdoptAPetShelter(adoptapetUrl, browser);
      results.adoptapetPets = adoptapetPets.length;
      console.log(`[SHELTER] AdoptAPet scrape completed: ${adoptapetPets.length} pets found`);
      
      for (const pet of adoptapetPets) {
        const key = `${pet.name}_${pet.source}`;
        if (!seenPets.has(key)) {
          seenPets.add(key);
          allPets.push(pet);
        }
      }
    } catch (error: any) {
      console.error('[SHELTER] AdoptAPet scrape error:', error.message);
      console.error('[SHELTER] AdoptAPet error stack:', error.stack);
      results.errors.push(`AdoptAPet error: ${error.message}`);
    }

    // Scrape Facebook (may require login)
    try {
      console.log('[SHELTER] Starting Facebook scrape...');
      const facebookPets = await scrapeFacebookShelter(facebookUrl, browser);
      results.facebookPets = facebookPets.length;
      console.log(`[SHELTER] Facebook scrape completed: ${facebookPets.length} pets found`);
      
      for (const pet of facebookPets) {
        const key = `${pet.name}_${pet.source}`;
        if (!seenPets.has(key)) {
          seenPets.add(key);
          allPets.push(pet);
        }
      }
    } catch (error: any) {
      console.error('[SHELTER] Facebook scrape error:', error.message);
      console.error('[SHELTER] Facebook error stack:', error.stack);
      results.errors.push(`Facebook error: ${error.message}`);
    }

    // Close browser
    if (browser) {
      try {
        await browser.close();
        console.log('[SHELTER] Browser closed');
      } catch (closeError: any) {
        console.error('[SHELTER] Error closing browser:', closeError.message);
      }
    }

    // Save pets to database
    console.log(`[SHELTER] Saving ${allPets.length} pets to database...`);
    
    for (const pet of allPets) {
      try {
        // Check for duplicates
        const { data: existing, error: checkError } = await supabase
          .from('lost_pets')
          .select('id')
          .eq('pet_name', pet.name)
          .eq('location_city', pet.location_city || '')
          .eq('source', pet.source)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error(`[SHELTER] Error checking duplicates for ${pet.name}:`, checkError.message);
          results.errors.push(`Error checking ${pet.name}: ${checkError.message}`);
          continue;
        }

        if (existing) {
          console.log(`[SHELTER] Skipping duplicate: ${pet.name}`);
          continue; // Skip duplicates
        }

        // Save pet
        const { data: newPet, error: petError } = await supabase
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
            location_city: pet.location_city || 'Boaz',
            location_state: pet.location_state || 'AL',
            date_lost: new Date().toISOString().split('T')[0]
          })
          .select()
          .single();

        if (petError) {
          console.error(`[SHELTER] Error saving ${pet.name}:`, petError.message);
          console.error(`[SHELTER] Error details:`, JSON.stringify(petError, null, 2));
          results.errors.push(`Error saving ${pet.name}: ${petError.message}`);
        } else if (newPet) {
          results.petsSaved++;
          console.log(`[SHELTER] ✅ Saved: ${pet.name}`);
        }
      } catch (petError: any) {
        console.error(`[SHELTER] Error processing pet ${pet.name}:`, petError.message);
        console.error(`[SHELTER] Stack:`, petError.stack);
        results.errors.push(`Error processing ${pet.name}: ${petError.message}`);
      }
    }

    // Unregister scraper
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003'}/api/petreunion/check-running-scrapers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unregister', scraperId })
      });
    } catch (e) {
      // Ignore unregistration errors
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      adoptapetPets: results.adoptapetPets,
      facebookPets: results.facebookPets,
      totalPets: allPets.length,
      petsSaved: results.petsSaved,
      duration,
      errors: results.errors.length > 0 ? results.errors : undefined,
      message: `Scraped ${results.adoptapetPets} pets from AdoptAPet, ${results.facebookPets} from Facebook, saved ${results.petsSaved} to database`
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[SHELTER] Fatal error:', error);
    console.error('[SHELTER] Error stack:', error.stack);
    
    // Unregister scraper on error
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003'}/api/petreunion/check-running-scrapers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unregister', scraperId })
      });
    } catch (e) {
      // Ignore unregistration errors
    }
    
    // Ensure browser is closed on error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError: any) {
        // Ignore close errors
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        errorType: error.constructor?.name || 'Error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        duration
      },
      { status: 500 }
    );
  }
}

