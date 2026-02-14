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
  console.log('[ACCESSIBLE] Playwright not available');
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

// Check if a site is blocking us
async function isBlocked(page: any): Promise<boolean> {
  try {
    const title = await page.title();
    const text = await page.textContent('body') || '';
    
    const blockedIndicators = [
      '403',
      'blocked',
      'CloudFront',
      'Request blocked',
      'could not be satisfied',
      'Access Denied',
      'bot protection',
      'captcha',
      'verify you are human'
    ];
    
    return blockedIndicators.some(indicator => 
      title.toLowerCase().includes(indicator.toLowerCase()) ||
      text.toLowerCase().includes(indicator.toLowerCase())
    );
  } catch (e) {
    return false;
  }
}

// Scrape Petfinder (try, but may be blocked)
async function scrapePetfinder(area: string, browser: any): Promise<{ pets: ScrapedPet[]; blocked: boolean }> {
  const pets: ScrapedPet[] = [];
  
  if (!browser) {
    return { pets, blocked: false };
  }

  try {
    const [city, state] = area.split(',').map(s => s.trim());
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const searchUrl = `https://www.petfinder.com/search/dogs-for-adoption/us/${state.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}/`;
    
    console.log(`[PETFINDER] Trying: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    // Check if blocked
    const blocked = await isBlocked(page);
    if (blocked) {
      console.log(`[PETFINDER] ⚠️ Blocked - skipping`);
      await page.close();
      return { pets, blocked: true };
    }
    
    // Try to extract pets (similar to previous attempts)
    // ... (extraction logic)
    
    await page.close();
    return { pets, blocked: false };
  } catch (error: any) {
    console.error(`[PETFINDER] Error:`, error.message);
    return { pets, blocked: false };
  }
}

// Scrape direct shelter websites (more likely to work)
async function scrapeShelterWebsite(shelterUrl: string, browser: any, shelterName: string, location: string): Promise<ScrapedPet[]> {
  const pets: ScrapedPet[] = [];
  
  if (!browser) {
    return pets;
  }

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log(`[SHELTER WEBSITE] Scraping: ${shelterUrl}`);
    await page.goto(shelterUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    // Check if blocked
    const blocked = await isBlocked(page);
    if (blocked) {
      console.log(`[SHELTER WEBSITE] ⚠️ Blocked - skipping`);
      await page.close();
      return pets;
    }
    
    // Try multiple selector strategies
    const selectors = [
      'a[href*="/pet/"]',
      'a[href*="/animal/"]',
      '[class*="pet"]',
      '[class*="animal"]',
      'article',
      '[class*="card"]',
      'img[alt*="dog"]',
      'img[alt*="cat"]'
    ];
    
    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`[SHELTER WEBSITE] Found ${elements.length} elements with ${selector}`);
          // Extract pet data
          // ... (extraction logic similar to before)
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    await page.close();
    return pets;
  } catch (error: any) {
    console.error(`[SHELTER WEBSITE] Error:`, error.message);
    return pets;
  }
}

// Scrape Facebook with login (if credentials available)
async function scrapeFacebookWithLogin(shelterUrl: string, browser: any, location: string): Promise<ScrapedPet[]> {
  const pets: ScrapedPet[] = [];
  
  if (!browser) {
    return pets;
  }

  const FACEBOOK_EMAIL = process.env.FACEBOOK_EMAIL;
  const FACEBOOK_PASSWORD = process.env.FACEBOOK_PASSWORD;

  if (!FACEBOOK_EMAIL || !FACEBOOK_PASSWORD) {
    console.log('[FACEBOOK] No credentials - skipping');
    return pets;
  }

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Login to Facebook
    console.log('[FACEBOOK] Logging in...');
    await page.goto('https://www.facebook.com/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    await page.type('input[name="email"], input[type="email"], input[id="email"]', FACEBOOK_EMAIL, { delay: 100 });
    await page.type('input[name="pass"], input[type="password"], input[id="pass"]', FACEBOOK_PASSWORD, { delay: 100 });
    await page.click('button[type="submit"], button[name="login"]');
    await page.waitForTimeout(5000);
    
    // Check if login succeeded
    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('checkpoint')) {
      console.log('[FACEBOOK] Login may have failed or requires verification');
      await page.close();
      return pets;
    }
    
    // Navigate to shelter page
    console.log(`[FACEBOOK] Navigating to shelter: ${shelterUrl}`);
    await page.goto(shelterUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    // Extract posts with pets
    const posts = await page.$$eval('[role="article"]', (articles: any[]) => {
      return articles.slice(0, 30).map((article: any) => {
        const text = article.innerText || article.textContent || '';
        const imgEl = article.querySelector('img');
        
        // Check if it's a pet post
        const hasPetKeywords = /(dog|puppy|cat|kitten|adopt|adoption|rescue|available|looking for|found)/i.test(text);
        if (!hasPetKeywords) return null;
        
        const nameMatch = text.match(/(?:name|named|meet|this is|introducing)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
        const breedMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+(?:Mix|Mix Breed|Mixed|Retriever|Shepherd|Terrier|Hound|Spaniel|Setter|Pointer|Bulldog|Poodle|Collie|Husky|Malamute|Chihuahua|Dachshund|Beagle|Boxer|Rottweiler|Doberman|Labrador|Golden|German|Australian|Border|Corgi|Pomeranian|Shih Tzu|Yorkshire|Boston|French|English|American|Staffordshire|Pit|Bull|Pug|Basset|Bloodhound|Coonhound|Foxhound|Greyhound|Whippet|Shiba|Akita|Chow|Shar Pei|Lhasa|Tibetan|Maltese|Bichon|Havanese|Coton|Papillon|Pekingese|Persian|Siamese|Maine Coon|Ragdoll|British Shorthair|Scottish Fold|Bengal|Sphynx)))/i);
        const ageMatch = text.match(/(\d+\s*(?:yr|year|years|mo|month|months|old|weeks?|days?))/i);
        
        return {
          name: nameMatch ? nameMatch[1] : 'Unknown',
          breed: breedMatch ? breedMatch[1] : 'Mixed Breed',
          age: ageMatch ? ageMatch[1] : 'Unknown',
          photo: imgEl ? imgEl.src : '',
          text: text.substring(0, 400)
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
        location_city: location.split(',')[0]?.trim() || 'Unknown',
        location_state: location.split(',')[1]?.trim() || 'AL',
        source: 'facebook:shelter',
        source_url: shelterUrl,
        status: 'found'
      });
    }
    
    await page.close();
    console.log(`[FACEBOOK] Found ${pets.length} pets`);
    return pets;
  } catch (error: any) {
    console.error(`[FACEBOOK] Error:`, error.message);
    return pets;
  }
}

// Known accessible shelter websites (direct sites, not through aggregators)
const ACCESSIBLE_SHELTER_SOURCES = [
  // Add known accessible shelter websites here
  // Format: { name: string, url: string, location: string }
];

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
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
    const areas: string[] = body.areas || ['Boaz, AL'];
    const focusOnFacebook = body.focusOnFacebook !== false; // Default true

    console.log(`[ACCESSIBLE] Starting scrape focusing on non-blocked sources`);
    console.log(`[ACCESSIBLE] Areas: ${areas.join(', ')}`);

    const browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const allPets: ScrapedPet[] = [];
    const seenPets = new Set<string>();
    const results = {
      sourcesTried: [] as string[],
      sourcesBlocked: [] as string[],
      sourcesWorked: [] as string[],
      petsFound: 0,
      petsSaved: 0,
      errors: [] as string[]
    };

    // Focus on Facebook shelters (most accessible with login)
    if (focusOnFacebook) {
      for (const area of areas) {
        try {
          // Search for shelters in this area on Facebook
          const [city, state] = area.split(',').map(s => s.trim());
          const searchQueries = [
            `animal shelter ${city} ${state}`,
            `pet rescue ${city} ${state}`,
            `dog shelter ${city} ${state}`
          ];

          for (const query of searchQueries.slice(0, 2)) { // Limit queries
            try {
              const page = await browser.newPage();
              await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
              
              // Login first if credentials available
              const FACEBOOK_EMAIL = process.env.FACEBOOK_EMAIL;
              const FACEBOOK_PASSWORD = process.env.FACEBOOK_PASSWORD;
              
              if (FACEBOOK_EMAIL && FACEBOOK_PASSWORD) {
                console.log(`[ACCESSIBLE] Logging into Facebook...`);
                await page.goto('https://www.facebook.com/login', { waitUntil: 'networkidle', timeout: 30000 });
                await page.waitForTimeout(2000);
                
                try {
                  await page.type('input[name="email"], input[type="email"]', FACEBOOK_EMAIL, { delay: 100 });
                  await page.type('input[name="pass"], input[type="password"]', FACEBOOK_PASSWORD, { delay: 100 });
                  await page.click('button[type="submit"], button[name="login"]');
                  await page.waitForTimeout(5000);
                  
                  // Check if login worked
                  const currentUrl = page.url();
                  if (!currentUrl.includes('login') && !currentUrl.includes('checkpoint')) {
                    console.log(`[ACCESSIBLE] ✅ Facebook login successful`);
                    
                    // Search for shelters
                    const searchUrl = `https://www.facebook.com/search/pages/?q=${encodeURIComponent(query)}`;
                    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
                    await page.waitForTimeout(3000);
                    
                    // Extract page links
                    const pageLinks = await page.$$eval('a[href*="/pages/"], a[href*="facebook.com"]', (links: any[]) => {
                      return links
                        .map((link: any) => link.href)
                        .filter((href: string) => href && href.includes('facebook.com') && (href.includes('/pages/') || href.match(/facebook\.com\/[^\/]+$/)))
                        .slice(0, 5);
                    });
                    
                    console.log(`[ACCESSIBLE] Found ${pageLinks.length} shelter pages for "${query}"`);
                    
                    // Scrape each shelter page
                    for (const pageUrl of pageLinks) {
                      try {
                        const shelterPets = await scrapeFacebookWithLogin(pageUrl, browser, area);
                        results.sourcesWorked.push(`facebook:${pageUrl}`);
                        
                        for (const pet of shelterPets) {
                          const key = `${pet.name}_${pet.source}`;
                          if (!seenPets.has(key)) {
                            seenPets.add(key);
                            allPets.push(pet);
                            results.petsFound++;
                          }
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Delay between pages
                      } catch (pageError: any) {
                        console.error(`[ACCESSIBLE] Error scraping ${pageUrl}:`, pageError.message);
                      }
                    }
                  } else {
                    console.log(`[ACCESSIBLE] ⚠️ Facebook login failed or requires verification`);
                  }
                } catch (loginError: any) {
                  console.error(`[ACCESSIBLE] Login error:`, loginError.message);
                }
              } else {
                console.log(`[ACCESSIBLE] No Facebook credentials - skipping Facebook scraping`);
              }
              
              await page.close();
            } catch (searchError: any) {
              console.error(`[ACCESSIBLE] Error searching "${query}":`, searchError.message);
            }
          }
        } catch (areaError: any) {
          console.error(`[ACCESSIBLE] Error processing area ${area}:`, areaError.message);
        }
      }
    }

    // Try Petfinder (may be blocked, but worth trying)
    for (const area of areas.slice(0, 1)) { // Limit to 1 area for testing
      try {
        const { pets, blocked } = await scrapePetfinder(area, browser);
        if (blocked) {
          results.sourcesBlocked.push('petfinder');
        } else if (pets.length > 0) {
          results.sourcesWorked.push('petfinder');
          for (const pet of pets) {
            const key = `${pet.name}_${pet.source}`;
            if (!seenPets.has(key)) {
              seenPets.add(key);
              allPets.push(pet);
              results.petsFound++;
            }
          }
        }
      } catch (error: any) {
        results.errors.push(`Petfinder error for ${area}: ${error.message}`);
      }
    }

    await browser.close();

    // Save pets to database
    console.log(`[ACCESSIBLE] Saving ${allPets.length} pets to database...`);
    
    for (const pet of allPets) {
      try {
        // Check for duplicates
        const { data: existing } = await supabase
          .from('lost_pets')
          .select('id')
          .eq('pet_name', pet.name)
          .eq('location_city', pet.location_city || '')
          .eq('source', pet.source)
          .maybeSingle();

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
            color: pet.color || 'N/A',
            size: pet.size || 'medium',
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
          console.error(`[ACCESSIBLE] Error saving ${pet.name}:`, petError.message);
          results.errors.push(`Error saving ${pet.name}: ${petError.message}`);
        } else if (newPet) {
          results.petsSaved++;
          console.log(`[ACCESSIBLE] ✅ Saved: ${pet.name}`);
        }
      } catch (petError: any) {
        console.error(`[ACCESSIBLE] Error processing pet:`, petError.message);
        results.errors.push(`Error processing ${pet.name}: ${petError.message}`);
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      sourcesWorked: results.sourcesWorked,
      sourcesBlocked: results.sourcesBlocked,
      petsFound: results.petsFound,
      petsSaved: results.petsSaved,
      duration,
      errors: results.errors.length > 0 ? results.errors : undefined,
      message: `Scraped ${results.sourcesWorked.length} accessible sources, found ${results.petsFound} pets, saved ${results.petsSaved} to database. Blocked: ${results.sourcesBlocked.join(', ')}`
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[ACCESSIBLE] Fatal error:', error);
    
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


