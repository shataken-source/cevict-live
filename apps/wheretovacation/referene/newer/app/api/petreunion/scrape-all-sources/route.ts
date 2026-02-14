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
  console.log('[SCRAPER] Playwright not available');
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

// Scrape Petfinder for a location
async function scrapePetfinder(area: string, browser: any): Promise<ScrapedPet[]> {
  const pets: ScrapedPet[] = [];
  
  if (!browser) {
    console.log('[PETFINDER] Browser not available, skipping');
    return pets;
  }

  try {
    const [city, state] = area.split(',').map(s => s.trim());
    const page = await browser.newPage();
    
    // Petfinder search URL
    const searchUrl = `https://www.petfinder.com/search/dogs-for-adoption/us/${state.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}/`;
    
    console.log(`[PETFINDER] Scraping: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000); // Wait longer for content to load
    
    // Debug: Check page title and content
    const pageTitle = await page.title();
    const pageText = await page.textContent('body') || '';
    console.log(`[PETFINDER] Page title: ${pageTitle}`);
    console.log(`[PETFINDER] Page text length: ${pageText.length}`);
    console.log(`[PETFINDER] First 500 chars: ${pageText.substring(0, 500)}`);
    
    // Try multiple selector strategies
    let petCards: any[] = [];
    
    // Strategy 1: Look for common Petfinder selectors
    const selectors = [
      '[class*="petCard"]',
      '[class*="PetCard"]',
      '[class*="pet-card"]',
      'article[class*="pet"]',
      '[data-testid*="pet"]',
      '[class*="animal"]',
      '[class*="AnimalCard"]',
      'a[href*="/pet/"]',
      '[class*="search-result"]',
      '[class*="SearchResult"]'
    ];
    
    for (const selector of selectors) {
      try {
        const count = await page.$$(selector).then(els => els.length);
        console.log(`[PETFINDER] Selector "${selector}" found ${count} elements`);
        if (count > 0) {
          petCards = await page.$$eval(selector, (cards: any[]) => {
            return cards.slice(0, 20).map((card: any) => {
              const nameEl = card.querySelector('h2, h3, [class*="name"], [class*="title"]');
              const imgEl = card.querySelector('img');
              const text = card.innerText || card.textContent || '';
              
              const name = nameEl ? (nameEl.textContent || nameEl.innerText || '').trim() : '';
              const breedMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+(?:Mix|Mix Breed|Mixed|Retriever|Shepherd|Terrier|Hound|Spaniel|Setter|Pointer|Bulldog|Poodle|Collie|Husky|Malamute|Chihuahua|Dachshund|Beagle|Boxer|Rottweiler|Doberman|Labrador|Golden|German|Australian|Border|Corgi|Pomeranian|Shih Tzu|Yorkshire|Boston|French|English|American|Staffordshire|Pit|Bull|Pug|Basset|Bloodhound|Coonhound|Foxhound|Greyhound|Whippet|Shiba|Akita|Chow|Shar Pei|Lhasa|Tibetan|Maltese|Bichon|Havanese|Coton|Papillon|Pekingese|Persian|Siamese|Maine Coon|Ragdoll|British Shorthair|Scottish Fold|Bengal|Sphynx)))/i);
              const ageMatch = text.match(/(\d+\s*(?:yr|year|years|mo|month|months|old|weeks?|days?))/i);
              const genderMatch = text.match(/(Male|Female|M|F)/i);
              
              return {
                name: name || 'Unknown',
                breed: breedMatch ? breedMatch[1] : 'Mixed Breed',
                age: ageMatch ? ageMatch[1] : 'Unknown',
                gender: genderMatch ? genderMatch[1] : 'Unknown',
                photo: imgEl ? imgEl.src : '',
                text: text.substring(0, 200)
              };
            }).filter((pet: any) => pet.name && pet.name !== 'Unknown');
          });
          if (petCards.length > 0) {
            break; // Found pets with this selector
          }
        }
      } catch (selError: any) {
        // Try next selector
      }
    }
    
    // Strategy 2: If no cards found, try to find JSON data in the page
    if (petCards.length === 0) {
      try {
        const jsonData = await page.evaluate(() => {
          // Look for JSON-LD or script tags with pet data
          const scripts = Array.from(document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]'));
          for (const script of scripts) {
            try {
              const data = JSON.parse(script.textContent || '');
              // Recursively search for pet data
              const findPets = (obj: any): any[] => {
                if (Array.isArray(obj)) {
                  return obj.flatMap(findPets);
                } else if (typeof obj === 'object' && obj !== null) {
                  if (obj.name && (obj.breed || obj.type || obj.species)) {
                    return [obj];
                  }
                  return Object.values(obj).flatMap(findPets);
                }
                return [];
              };
              const found = findPets(data);
              if (found.length > 0) return found;
            } catch (e) {
              // Not valid JSON
            }
          }
          return [];
        });
        
        if (jsonData.length > 0) {
          console.log(`[PETFINDER] Found ${jsonData.length} pets in JSON data`);
          petCards = jsonData.map((pet: any) => ({
            name: pet.name || 'Unknown',
            breed: pet.breed || 'Mixed Breed',
            age: pet.age || 'Unknown',
            gender: pet.gender || 'Unknown',
            photo: pet.image || pet.photo || '',
            text: JSON.stringify(pet).substring(0, 200)
          }));
        }
      } catch (jsonError: any) {
        console.log(`[PETFINDER] JSON extraction failed: ${jsonError.message}`);
      }
    }
    
    // Strategy 3: Fallback - extract from any text that looks like pet info
    if (petCards.length === 0) {
      console.log(`[PETFINDER] Trying fallback text extraction...`);
      const allText = await page.textContent('body') || '';
      const petMatches = allText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is|was|needs|looking|available|adopt)/gi);
      if (petMatches && petMatches.length > 0) {
        console.log(`[PETFINDER] Found ${petMatches.length} potential pet names in text`);
        petCards = petMatches.slice(0, 10).map((match: string) => {
          const name = match.split(/\s+/).slice(0, 2).join(' ');
          return {
            name: name || 'Unknown',
            breed: 'Mixed Breed',
            age: 'Unknown',
            gender: 'Unknown',
            photo: '',
            text: match
          };
        });
      }
    }
    
    console.log(`[PETFINDER] Total pet cards extracted: ${petCards.length}`);
    
    for (const petData of petCards) {
      pets.push({
        name: petData.name,
        type: 'dog', // Petfinder search was for dogs
        breed: petData.breed,
        age: petData.age,
        gender: petData.gender,
        size: 'medium',
        color: 'N/A',
        photo_url: petData.photo,
        description: `${petData.age}, ${petData.gender} ${petData.breed} from Petfinder`,
        location_city: city,
        location_state: state,
        source: 'petfinder',
        source_url: searchUrl,
        status: 'found'
      });
    }
    
    await page.close();
    console.log(`[PETFINDER] Found ${pets.length} pets in ${area}`);
  } catch (error: any) {
    console.error(`[PETFINDER] Error scraping ${area}:`, error.message);
  }
  
  return pets;
}

// Scrape Petco adoption pages
async function scrapePetco(area: string, browser: any): Promise<ScrapedPet[]> {
  const pets: ScrapedPet[] = [];
  
  if (!browser) {
    return pets;
  }

  try {
    const [city, state] = area.split(',').map(s => s.trim());
    const page = await browser.newPage();
    
    // Petco adoption search
    const searchUrl = `https://www.petco.com/shop/en/petcostore/category/dog/dog-adoption`;
    
    console.log(`[PETCO] Scraping: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Similar extraction logic as Petfinder
    const petCards = await page.$$eval('[class*="pet"], [class*="adoption"], article', (cards: any[]) => {
      return cards.slice(0, 10).map((card: any) => {
        const nameEl = card.querySelector('h2, h3, [class*="name"]');
        const imgEl = card.querySelector('img');
        const text = card.innerText || card.textContent || '';
        
        const name = nameEl ? (nameEl.textContent || nameEl.innerText || '').trim() : '';
        if (!name) return null;
        
        const breedMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+(?:Mix|Mix Breed|Mixed|Retriever|Shepherd|Terrier|Hound|Spaniel|Setter|Pointer|Bulldog|Poodle|Collie|Husky|Malamute|Chihuahua|Dachshund|Beagle|Boxer|Rottweiler|Doberman|Labrador|Golden|German|Australian|Border|Corgi|Pomeranian|Shih Tzu|Yorkshire|Boston|French|English|American|Staffordshire|Pit|Bull|Pug|Basset|Bloodhound|Coonhound|Foxhound|Greyhound|Whippet|Shiba|Akita|Chow|Shar Pei|Lhasa|Tibetan|Maltese|Bichon|Havanese|Coton|Papillon|Pekingese|Persian|Siamese|Maine Coon|Ragdoll|British Shorthair|Scottish Fold|Bengal|Sphynx)))/i);
        const ageMatch = text.match(/(\d+\s*(?:yr|year|years|mo|month|months|old|weeks?|days?))/i);
        
        return {
          name,
          breed: breedMatch ? breedMatch[1] : 'Mixed Breed',
          age: ageMatch ? ageMatch[1] : 'Unknown',
          photo: imgEl ? imgEl.src : '',
        };
      }).filter((pet: any) => pet !== null);
    });
    
    for (const petData of petCards) {
      pets.push({
        name: petData.name,
        type: 'dog',
        breed: petData.breed,
        age: petData.age,
        gender: 'Unknown',
        size: 'medium',
        color: 'N/A',
        photo_url: petData.photo,
        description: `${petData.age} ${petData.breed} from Petco`,
        location_city: city,
        location_state: state,
        source: 'petco',
        source_url: searchUrl,
        status: 'found'
      });
    }
    
    await page.close();
    console.log(`[PETCO] Found ${pets.length} pets in ${area}`);
  } catch (error: any) {
    console.error(`[PETCO] Error scraping ${area}:`, error.message);
  }
  
  return pets;
}

// Scrape Facebook shelters using browser (not Graph API)
async function scrapeFacebookShelters(area: string, browser: any): Promise<ScrapedPet[]> {
  const pets: ScrapedPet[] = [];
  
  if (!browser) {
    return pets;
  }

  try {
    const [city, state] = area.split(',').map(s => s.trim());
    const page = await browser.newPage();
    
    // Search Facebook for shelters
    const searchQueries = [
      `animal shelter ${city} ${state}`,
      `pet rescue ${city} ${state}`,
      `dog shelter ${city} ${state}`
    ];
    
    for (const query of searchQueries.slice(0, 1)) { // Limit to 1 query for testing
      try {
        const searchUrl = `https://www.facebook.com/search/pages/?q=${encodeURIComponent(query)}`;
        console.log(`[FACEBOOK] Searching: ${query}`);
        
        await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);
        
        // Extract page links
        const pageLinks = await page.$$eval('a[href*="/pages/"], a[href*="facebook.com"]', (links: any[]) => {
          return links
            .map((link: any) => link.href)
            .filter((href: string) => href && href.includes('facebook.com') && (href.includes('/pages/') || href.includes('/groups/')))
            .slice(0, 5);
        });
        
        console.log(`[FACEBOOK] Found ${pageLinks.length} shelter pages`);
        
        // Visit each page and scrape posts
        for (const pageUrl of pageLinks.slice(0, 2)) { // Limit to 2 pages for testing
          try {
            await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForTimeout(2000);
            
            // Extract posts with pet information
            const posts = await page.$$eval('[role="article"], [data-pagelet]', (articles: any[]) => {
              return articles.slice(0, 10).map((article: any) => {
                const text = article.innerText || article.textContent || '';
                const imgEl = article.querySelector('img');
                
                // Check if it's a pet post
                const hasPetKeywords = /(dog|puppy|cat|kitten|adopt|adoption|rescue|available)/i.test(text);
                if (!hasPetKeywords) return null;
                
                const nameMatch = text.match(/(?:name|named|meet)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
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
                location_city: city,
                location_state: state,
                source: 'facebook:shelter',
                source_url: pageUrl,
                status: 'found'
              });
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000)); // Delay between pages
          } catch (pageError: any) {
            console.error(`[FACEBOOK] Error scraping page ${pageUrl}:`, pageError.message);
          }
        }
      } catch (searchError: any) {
        console.error(`[FACEBOOK] Error searching "${query}":`, searchError.message);
      }
    }
    
    await page.close();
    console.log(`[FACEBOOK] Found ${pets.length} pets in ${area}`);
  } catch (error: any) {
    console.error(`[FACEBOOK] Error scraping ${area}:`, error.message);
  }
  
  return pets;
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
    const areas: string[] = body.areas || [
      'New York, NY',
      'Los Angeles, CA',
      'San Diego, CA',
      'Seattle, WA',
      'Dallas, TX'
    ];
    const sources = body.sources || ['petfinder', 'facebook']; // 'petfinder', 'petco', 'petsmart', 'facebook'

    console.log(`[ALL SOURCES] Starting scrape for ${areas.length} areas from sources: ${sources.join(', ')}`);

    let browser: any = null;
    if (playwright) {
      try {
        browser = await playwright.chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('[ALL SOURCES] Browser launched');
      } catch (browserError: any) {
        console.error('[ALL SOURCES] Browser launch failed:', browserError.message);
      }
    }

    const allPets: ScrapedPet[] = [];
    const seenPets = new Set<string>(); // Track by name + location to avoid duplicates
    const results = {
      areasProcessed: 0,
      petsFound: 0,
      petsSaved: 0,
      sources: {} as Record<string, number>,
      errors: [] as string[]
    };

    // Process each area
    for (const area of areas) {
      try {
        console.log(`\n[ALL SOURCES] Processing area: ${area}`);
        results.areasProcessed++;

        // Scrape from each source
        if (sources.includes('petfinder') && browser) {
          try {
            const pets = await scrapePetfinder(area, browser);
            results.sources['petfinder'] = (results.sources['petfinder'] || 0) + pets.length;
            for (const pet of pets) {
              const key = `${pet.name}_${pet.location_city}_${pet.source}`;
              if (!seenPets.has(key)) {
                seenPets.add(key);
                allPets.push(pet);
                results.petsFound++;
              }
            }
          } catch (error: any) {
            results.errors.push(`Petfinder error for ${area}: ${error.message}`);
          }
        }

        if (sources.includes('petco') && browser) {
          try {
            const pets = await scrapePetco(area, browser);
            results.sources['petco'] = (results.sources['petco'] || 0) + pets.length;
            for (const pet of pets) {
              const key = `${pet.name}_${pet.location_city}_${pet.source}`;
              if (!seenPets.has(key)) {
                seenPets.add(key);
                allPets.push(pet);
                results.petsFound++;
              }
            }
          } catch (error: any) {
            results.errors.push(`Petco error for ${area}: ${error.message}`);
          }
        }

        if (sources.includes('facebook') && browser) {
          try {
            const pets = await scrapeFacebookShelters(area, browser);
            results.sources['facebook'] = (results.sources['facebook'] || 0) + pets.length;
            for (const pet of pets) {
              const key = `${pet.name}_${pet.location_city}_${pet.source}`;
              if (!seenPets.has(key)) {
                seenPets.add(key);
                allPets.push(pet);
                results.petsFound++;
              }
            }
          } catch (error: any) {
            results.errors.push(`Facebook error for ${area}: ${error.message}`);
          }
        }

        // Delay between areas
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (areaError: any) {
        console.error(`[ALL SOURCES] Error processing area ${area}:`, areaError.message);
        results.errors.push(`Error processing ${area}: ${areaError.message}`);
      }
    }

    // Close browser
    if (browser) {
      await browser.close();
    }

    // Save pets to database
    console.log(`[ALL SOURCES] Saving ${allPets.length} pets to database...`);
    
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
          console.error(`[ALL SOURCES] Error saving pet ${pet.name}:`, petError.message);
          results.errors.push(`Error saving ${pet.name}: ${petError.message}`);
        } else if (newPet) {
          results.petsSaved++;
        }
      } catch (petError: any) {
        console.error(`[ALL SOURCES] Error processing pet ${pet.name}:`, petError.message);
        results.errors.push(`Error processing ${pet.name}: ${petError.message}`);
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      areasProcessed: results.areasProcessed,
      petsFound: results.petsFound,
      petsSaved: results.petsSaved,
      sources: results.sources,
      duration,
      errors: results.errors.length > 0 ? results.errors : undefined,
      message: `Scraped ${results.areasProcessed} areas, found ${results.petsFound} pets, saved ${results.petsSaved} to database`
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[ALL SOURCES] Error:', error);
    
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

