import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Playwright for human-like browsing
let playwright: any = null;
try {
  playwright = require('playwright');
} catch (e) {
  console.log('[AUTONOMOUS CRAWLER] Playwright not available');
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

// Human-like delays
const humanDelay = (min: number = 1000, max: number = 3000) => 
  new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));

const scrollLikeHuman = async (page: any) => {
  const scrollAmount = Math.random() * 500 + 300;
  await page.evaluate((amount: number) => {
    window.scrollBy(0, amount);
  }, scrollAmount);
  await humanDelay(500, 1500);
};

// Login to Facebook (human-like)
async function loginToFacebook(page: any): Promise<boolean> {
  const FACEBOOK_EMAIL = process.env.FACEBOOK_EMAIL;
  const FACEBOOK_PASSWORD = process.env.FACEBOOK_PASSWORD;

  if (!FACEBOOK_EMAIL || !FACEBOOK_PASSWORD) {
    console.log('[AUTONOMOUS] No Facebook credentials');
    return false;
  }

  try {
    console.log('[AUTONOMOUS] Logging into Facebook...');
    await page.goto('https://www.facebook.com/login', { waitUntil: 'networkidle', timeout: 30000 });
    await humanDelay(2000, 4000);

    // Type email slowly (human-like)
    const emailInput = await page.$('input[name="email"], input[type="email"], input[id="email"]');
    if (emailInput) {
      await emailInput.type(FACEBOOK_EMAIL, { delay: Math.random() * 100 + 50 });
      await humanDelay(1000, 2000);
    }

    // Type password slowly
    const passwordInput = await page.$('input[name="pass"], input[type="password"], input[id="pass"]');
    if (passwordInput) {
      await passwordInput.type(FACEBOOK_PASSWORD, { delay: Math.random() * 100 + 50 });
      await humanDelay(1000, 2000);
    }

    // Click login
    await page.click('button[type="submit"], button[name="login"]');
    await humanDelay(3000, 6000);

    // Check if login succeeded
    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('checkpoint')) {
      console.log('[AUTONOMOUS] ⚠️ Login may have failed or requires verification');
      return false;
    }

    console.log('[AUTONOMOUS] ✅ Facebook login successful');
    return true;
  } catch (error: any) {
    console.error('[AUTONOMOUS] Login error:', error.message);
    return false;
  }
}

// Search for shelters in an area (human-like)
async function searchForShelters(page: any, area: string): Promise<string[]> {
  const shelterUrls: string[] = [];
  
  try {
    const [city, state] = area.split(',').map(s => s.trim());
    const queries = [
      `animal shelter ${city} ${state}`,
      `pet rescue ${city} ${state}`,
      `dog shelter ${city} ${state}`,
      `animal rescue ${city} ${state}`
    ];

    for (const query of queries.slice(0, 2)) { // Limit to 2 queries per area
      try {
        console.log(`[AUTONOMOUS] Searching: "${query}"`);
        
        // Go to Facebook search
        const searchUrl = `https://www.facebook.com/search/pages/?q=${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await humanDelay(2000, 4000);

        // Scroll to load more results (human-like)
        for (let i = 0; i < 3; i++) {
          await scrollLikeHuman(page);
        }

        // Extract page links
        const links = await page.$$eval('a[href*="facebook.com"]', (elements: any[]) => {
          return elements
            .map((el: any) => {
              const href = el.href || '';
              // Match Facebook pages (not profiles)
              if (href.includes('/pages/') || (href.match(/facebook\.com\/[^\/]+$/) && !href.includes('/people/'))) {
                return href.split('?')[0].split('#')[0]; // Clean URL
              }
              return null;
            })
            .filter((url: string | null): url is string => url !== null && url.length > 0);
        });

        // Deduplicate
        const uniqueLinks: string[] = Array.from(new Set(links));
        console.log(`[AUTONOMOUS] Found ${uniqueLinks.length} potential shelter pages`);
        
        shelterUrls.push(...uniqueLinks);
        await humanDelay(2000, 4000); // Delay between searches
      } catch (searchError: any) {
        console.error(`[AUTONOMOUS] Error searching "${query}":`, searchError.message);
      }
    }
  } catch (error: any) {
    console.error('[AUTONOMOUS] Error in searchForShelters:', error.message);
  }

  return Array.from(new Set(shelterUrls)); // Return unique URLs
}

// Search for community pages/groups
async function searchForCommunityPages(page: any, area: string): Promise<string[]> {
  const communityUrls: string[] = [];
  
  try {
    const [city, state] = area.split(',').map(s => s.trim());
    const queries = [
      `${city} ${state} community`,
      `${city} ${state} lost and found`,
      `${city} ${state} neighborhood`,
      `lost pets ${city} ${state}`
    ];

    for (const query of queries.slice(0, 2)) {
      try {
        console.log(`[AUTONOMOUS] Searching community: "${query}"`);
        
        // Search for groups and pages
        const searchUrl = `https://www.facebook.com/search/groups/?q=${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await humanDelay(2000, 4000);

        // Scroll to load more
        for (let i = 0; i < 2; i++) {
          await scrollLikeHuman(page);
        }

        // Extract group/page links
        const links = await page.$$eval('a[href*="facebook.com"]', (elements: any[]) => {
          return elements
            .map((el: any) => {
              const href = el.href || '';
              if (href.includes('/groups/') || href.includes('/pages/')) {
                return href.split('?')[0].split('#')[0];
              }
              return null;
            })
            .filter((url: string | null): url is string => url !== null && url.length > 0);
        });

        const uniqueLinks: string[] = Array.from(new Set(links));
        console.log(`[AUTONOMOUS] Found ${uniqueLinks.length} community pages/groups`);
        
        communityUrls.push(...uniqueLinks);
        await humanDelay(2000, 4000);
      } catch (searchError: any) {
        console.error(`[AUTONOMOUS] Error searching community "${query}":`, searchError.message);
      }
    }
  } catch (error: any) {
    console.error('[AUTONOMOUS] Error in searchForCommunityPages:', error.message);
  }

  return Array.from(new Set(communityUrls));
}

// Scrape pets from a Facebook page (human-like)
async function scrapePetsFromPage(page: any, pageUrl: string, shelterName: string, location: string, isCommunity: boolean = false): Promise<{ pets: ScrapedPet[]; blocked: boolean }> {
  const pets: ScrapedPet[] = [];
  
  try {
    console.log(`[AUTONOMOUS] Scraping: ${pageUrl}`);
    await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await humanDelay(3000, 5000);

    // Check if blocked
    const title = await page.title();
    const text = await page.textContent('body') || '';
    const blocked = /403|blocked|CloudFront|Request blocked|captcha|verify you are human/i.test(title + text);
    
    if (blocked) {
      console.log(`[AUTONOMOUS] ⚠️ Blocked on ${pageUrl}`);
      return { pets, blocked: true };
    }

    // Scroll to load posts (human-like)
    for (let i = 0; i < 5; i++) {
      await scrollLikeHuman(page);
    }

    // Extract posts
    const posts = await page.$$eval('[role="article"]', (articles: any[], isCommunityPage: boolean) => {
      return articles.slice(0, 50).map((article: any) => {
        const text = article.innerText || article.textContent || '';
        const imgEl = article.querySelector('img');
        const linkEl = article.querySelector('a[href*="/posts/"], a[href*="/permalink/"]');
        
        // Check if it's a pet post
        const petKeywords = /(dog|puppy|cat|kitten|adopt|adoption|rescue|available|looking for|found|loose|stray|missing|lost)/i;
        if (!petKeywords.test(text)) return null;
        
        // Extract name
        let name = 'Unknown';
        const namePatterns = [
          /(?:name|named|meet|this is|introducing|found|spotted)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
          /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
        ];
        for (const pattern of namePatterns) {
          const match = text.match(pattern);
          if (match && match[1] && match[1].length < 30) {
            name = match[1].trim();
            break;
          }
        }
        
        // Extract breed
        let breed = 'Mixed Breed';
        const breedMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+(?:Mix|Mixed|Retriever|Shepherd|Terrier|Hound|Spaniel|Setter|Pointer|Bulldog|Poodle|Collie|Husky|Malamute|Chihuahua|Dachshund|Beagle|Boxer|Rottweiler|Doberman|Labrador|Golden|German|Australian|Border|Corgi|Pomeranian|Shih Tzu|Yorkshire|Boston|French|English|American|Staffordshire|Pit|Bull|Pug|Basset|Bloodhound|Coonhound|Foxhound|Greyhound|Whippet|Shiba|Akita|Chow|Shar Pei|Lhasa|Tibetan|Maltese|Bichon|Havanese|Coton|Papillon|Pekingese|Persian|Siamese|Maine Coon|Ragdoll|British Shorthair|Scottish Fold|Bengal|Sphynx)))/i);
        if (breedMatch) breed = breedMatch[1].trim();
        
        // Extract age
        let age = 'Unknown';
        const ageMatch = text.match(/(\d+\s*(?:yr|year|years|mo|month|months|old|weeks?|days?|wks?))/i);
        if (ageMatch) age = ageMatch[1].trim();
        
        // Extract gender
        let gender = 'Unknown';
        if (/male|boy|he\s+is/i.test(text)) gender = 'Male';
        else if (/female|girl|she\s+is/i.test(text)) gender = 'Female';
        
        // Determine type
        const isCat = /(cat|kitten|kitty)/i.test(text);
        const type = isCat ? 'cat' : 'dog';
        
        // Determine status - check for lost vs found keywords
        const textLower = text.toLowerCase();
        const lostKeywords = [
          'lost', 'missing', 'help us find', 'please help', 'reunite', 
          'reward', 'please share', 'last seen', 'went missing', 
          'disappeared', 'ran away', 'escaped', 'help find', 'looking for'
        ];
        const foundKeywords = [
          'found', 'stray', 'loose', 'wandering', 'picked up', 'rescued',
          'found this', 'found a', 'found dog', 'found cat', 'found pet',
          'anyone missing', 'is this yours', 'does anyone know', 'found wandering'
        ];
        const adoptionKeywords = [
          'adopt', 'adoption', 'available for adoption', 'looking for home',
          'foster', 'foster home', 'forever home', 'shelter', 'rescue',
          'up for adoption', 'adoptable', 'ready for adoption'
        ];
        
        const isLost = lostKeywords.some(keyword => textLower.includes(keyword));
        const isFound = foundKeywords.some(keyword => textLower.includes(keyword));
        const isAdoption = adoptionKeywords.some(keyword => textLower.includes(keyword));
        
        let status: 'lost' | 'found' = 'found'; // Default to found
        if (isLost) {
          status = 'lost';
        } else if (isFound && !isAdoption) {
          status = 'found'; // Found/stray pet (not for adoption)
        } else if (isAdoption) {
          status = 'found'; // Available for adoption (still "found" status)
        }
        
        if (name !== 'Unknown' && name.length > 0) {
          return {
            name,
            breed,
            age,
            gender,
            photo: imgEl ? imgEl.src : '',
            text: text.substring(0, 500),
            type,
            postUrl: linkEl ? linkEl.href : pageUrl,
            status
          };
        }
        return null;
      }).filter((post: any) => post !== null && post.name !== 'Unknown');
    }, isCommunity);

    // Convert to ScrapedPet format
    for (const post of posts) {
      pets.push({
        name: post.name,
        type: post.type,
        breed: post.breed,
        age: post.age,
        gender: post.gender,
        size: 'medium',
        color: 'N/A',
        photo_url: post.photo,
        description: post.text,
        location_city: location.split(',')[0]?.trim() || 'Unknown',
        location_state: location.split(',')[1]?.trim() || 'AL',
        source: isCommunity ? 'facebook:community' : 'facebook:shelter',
        source_url: post.postUrl,
        status: post.status
      });
    }

    console.log(`[AUTONOMOUS] Found ${pets.length} pets from ${pageUrl}`);
    return { pets, blocked: false };
  } catch (error: any) {
    console.error(`[AUTONOMOUS] Error scraping ${pageUrl}:`, error.message);
    return { pets, blocked: false };
  }
}

// Save or update shelter in tracking table
async function trackShelter(
  facebookUrl: string,
  shelterName: string,
  locationCity: string,
  locationState: string,
  shelterType: 'shelter' | 'rescue' | 'community_page' | 'community_group' = 'shelter',
  petsFound: number = 0
): Promise<void> {
  if (!supabase) return;

  try {
    // Check if exists
    const { data: existing } = await supabase
      .from('shelter_tracking')
      .select('id, scan_count, total_pets_found')
      .eq('facebook_url', facebookUrl)
      .maybeSingle();

    if (existing) {
      // Update
      await supabase
        .from('shelter_tracking')
        .update({
          last_scanned_at: new Date().toISOString(),
          next_scan_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
          scan_count: (existing.scan_count || 0) + 1,
          last_pets_found: petsFound,
          total_pets_found: (existing.total_pets_found || 0) + petsFound,
          is_active: true,
          is_blocked: false,
          last_error: null
        })
        .eq('id', existing.id);
    } else {
      // Insert
      await supabase
        .from('shelter_tracking')
        .insert({
          shelter_name: shelterName,
          facebook_url: facebookUrl,
          location_city: locationCity,
          location_state: locationState,
          shelter_type: shelterType,
          first_discovered_at: new Date().toISOString(),
          last_scanned_at: new Date().toISOString(),
          next_scan_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          scan_count: 1,
          last_pets_found: petsFound,
          total_pets_found: petsFound,
          is_active: true
        });
    }
  } catch (error: any) {
    console.error('[AUTONOMOUS] Error tracking shelter:', error.message);
  }
}

// Save pets to database
async function savePets(pets: ScrapedPet[]): Promise<number> {
  if (!supabase) return 0;

  let saved = 0;
  const seenPets = new Set<string>();

  for (const pet of pets) {
    try {
      const key = `${pet.name}_${pet.location_city}_${pet.source_url}`;
      if (seenPets.has(key)) continue;
      seenPets.add(key);

      // Check for duplicates
      const { data: existing } = await supabase
        .from('lost_pets')
        .select('id')
        .eq('pet_name', pet.name)
        .eq('location_city', pet.location_city || 'Unknown')
        .eq('location_state', pet.location_state || 'AL')
        .maybeSingle();

      if (existing) continue;

      // Save pet
      const { error: petError } = await supabase
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
          date_lost: new Date().toISOString().split('T')[0],
          owner_name: 'Facebook Crawler' // Required field
        });

      if (!petError) {
        saved++;
        console.log(`[AUTONOMOUS] ✅ Saved: ${pet.name}`);
      }
    } catch (error: any) {
      console.error(`[AUTONOMOUS] Error saving pet:`, error.message);
    }
  }

  return saved;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    if (!playwright) {
      return NextResponse.json(
        { error: 'Playwright not available. Run: npx playwright install chromium' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const areas: string[] = body.areas || ['Boaz, AL'];
    const maxSheltersPerArea = body.maxSheltersPerArea || 10;
    const maxCommunityPagesPerArea = body.maxCommunityPagesPerArea || 5;
    const continuous = body.continuous !== false; // Default true

    console.log(`[AUTONOMOUS] Starting autonomous Facebook crawler`);
    console.log(`[AUTONOMOUS] Areas: ${areas.join(', ')}`);
    console.log(`[AUTONOMOUS] Continuous mode: ${continuous}`);

    const browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Login
    const loggedIn = await loginToFacebook(page);
    if (!loggedIn) {
      await browser.close();
      return NextResponse.json(
        { error: 'Facebook login failed' },
        { status: 500 }
      );
    }

    const results = {
      sheltersFound: 0,
      sheltersScraped: 0,
      communityPagesFound: 0,
      communityPagesScraped: 0,
      petsFound: 0,
      petsSaved: 0,
      errors: [] as string[]
    };

    // Main crawling loop
    do {
      for (const area of areas) {
        try {
          // 1. Search for shelters
          console.log(`[AUTONOMOUS] Searching for shelters in ${area}...`);
          const shelterUrls = await searchForShelters(page, area);
          results.sheltersFound += shelterUrls.length;

          // Scrape each shelter
          for (const shelterUrl of shelterUrls.slice(0, maxSheltersPerArea)) {
            try {
              const shelterName = shelterUrl.split('/').pop() || 'Unknown Shelter';
              const { pets, blocked } = await scrapePetsFromPage(page, shelterUrl, shelterName, area, false);
              
              if (blocked) {
                // Mark as blocked in tracking
                await supabase
                  .from('shelter_tracking')
                  .update({ is_blocked: true, last_error: 'Blocked by Facebook' })
                  .eq('facebook_url', shelterUrl);
                continue;
              }

              const saved = await savePets(pets);
              results.petsFound += pets.length;
              results.petsSaved += saved;

              // Track shelter
              await trackShelter(
                shelterUrl,
                shelterName,
                area.split(',')[0]?.trim() || 'Unknown',
                area.split(',')[1]?.trim() || 'AL',
                'shelter',
                pets.length
              );

              results.sheltersScraped++;
              await humanDelay(3000, 6000); // Delay between shelters
            } catch (shelterError: any) {
              console.error(`[AUTONOMOUS] Error scraping shelter:`, shelterError.message);
              results.errors.push(`Shelter error: ${shelterError.message}`);
            }
          }

          // 2. Search for community pages/groups
          console.log(`[AUTONOMOUS] Searching for community pages in ${area}...`);
          const communityUrls = await searchForCommunityPages(page, area);
          results.communityPagesFound += communityUrls.length;

          // Scrape each community page
          for (const communityUrl of communityUrls.slice(0, maxCommunityPagesPerArea)) {
            try {
              const pageName = communityUrl.split('/').pop() || 'Unknown Community';
              const { pets, blocked } = await scrapePetsFromPage(page, communityUrl, pageName, area, true);
              
              if (blocked) continue;

              const saved = await savePets(pets);
              results.petsFound += pets.length;
              results.petsSaved += saved;

              // Track community page
              const isGroup = communityUrl.includes('/groups/');
              await trackShelter(
                communityUrl,
                pageName,
                area.split(',')[0]?.trim() || 'Unknown',
                area.split(',')[1]?.trim() || 'AL',
                isGroup ? 'community_group' : 'community_page',
                pets.length
              );

              results.communityPagesScraped++;
              await humanDelay(3000, 6000);
            } catch (communityError: any) {
              console.error(`[AUTONOMOUS] Error scraping community:`, communityError.message);
              results.errors.push(`Community error: ${communityError.message}`);
            }
          }

        } catch (areaError: any) {
          console.error(`[AUTONOMOUS] Error processing area ${area}:`, areaError.message);
          results.errors.push(`Area error: ${areaError.message}`);
        }
      }

      // If continuous, wait before next cycle
      if (continuous) {
        console.log(`[AUTONOMOUS] Cycle complete. Waiting 30 minutes before next cycle...`);
        await humanDelay(30 * 60 * 1000, 30 * 60 * 1000); // 30 minutes
      }
    } while (continuous);

    await browser.close();

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      ...results,
      duration,
      message: `Crawled ${results.sheltersScraped} shelters and ${results.communityPagesScraped} community pages. Found ${results.petsFound} pets, saved ${results.petsSaved}.`
    });

  } catch (error: any) {
    console.error('[AUTONOMOUS] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}


