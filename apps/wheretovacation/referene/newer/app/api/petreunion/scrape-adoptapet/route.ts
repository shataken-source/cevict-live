import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Playwright import - preferred, more modern and supports multiple browsers
let playwright: any = null;
try {
  playwright = require('playwright');
} catch (e) {
  console.log('[SCRAPER] Playwright not available, will try Puppeteer');
}

// Puppeteer import - fallback option
let puppeteer: any = null;
if (!playwright) {
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    console.log('[SCRAPER] Puppeteer not available, will use simple fetch');
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

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

// Enhanced scraper - multiple patterns to catch different HTML structures
async function scrapePetsFromHTML(html: string): Promise<PetInfo[]> {
  const pets: PetInfo[] = [];
  
  console.log(`[SCRAPER] HTML length: ${html.length} characters`);
  
  // Pattern 1: Look for pet names in various HTML structures
  // AdoptAPet uses different class names - try multiple patterns
  const namePatterns = [
    /<h[23][^>]*class="[^"]*pet-name[^"]*"[^>]*>([^<]+)<\/h[23]>/gi,
    /<a[^>]*class="[^"]*pet[^"]*"[^>]*>([^<]+)<\/a>/gi,
    /<div[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/div>/gi,
    /"name"\s*:\s*"([^"]+)"/gi,
    /<span[^>]*class="[^"]*pet-name[^"]*"[^>]*>([^<]+)<\/span>/gi
  ];
  
  // Pattern 2: Look for breed information
  const breedPatterns = [
    /"breed"\s*:\s*"([^"]+)"/gi,
    /<span[^>]*class="[^"]*breed[^"]*"[^>]*>([^<]+)<\/span>/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Mix|Mix Breed|Mixed|Breed|Retriever|Shepherd|Terrier|Hound|Spaniel|Setter|Pointer|Bulldog|Poodle|Collie|Husky|Malamute|Chihuahua|Dachshund|Beagle|Boxer|Rottweiler|Doberman|Great Dane|Mastiff|Saint Bernard|Newfoundland|Bernese|Labrador|Golden|German|Australian|Border|Corgi|Pomeranian|Shih Tzu|Yorkshire|Boston|French|English|American|Staffordshire|Pit|Bull|Pug|Basset|Bloodhound|Coonhound|Foxhound|Greyhound|Whippet|Saluki|Afghan|Borzoi|Irish|Scottish|Welsh|English|American|Cocker|Springer|Brittany|Vizsla|Weimaraner|Rhodesian|Dalmation|Shiba|Akita|Chow|Shar Pei|Lhasa|Tibetan|Maltese|Bichon|Havanese|Coton|Papillon|Pekingese|Pomeranian|Toy|Miniature|Standard|Giant|Teacup|Puppy|Kitten|Cat|Dog))/gi
  ];
  
  // Pattern 3: Look for age
  const agePatterns = [
    /"age"\s*:\s*"([^"]+)"/gi,
    /(\d+\s*(?:yr|year|years|mo|month|months|old|weeks?|days?))/gi,
    /<span[^>]*class="[^"]*age[^"]*"[^>]*>([^<]+)<\/span>/gi
  ];
  
  // Pattern 4: Look for photos
  const photoPatterns = [
    /"photo"\s*:\s*"([^"]+)"/gi,
    /"image"\s*:\s*"([^"]+)"/gi,
    /<img[^>]+src="([^"]+)"[^>]*alt="[^"]*pet[^"]*"/gi,
    /<img[^>]+src="([^"]+)"[^>]*class="[^"]*pet[^"]*"/gi
  ];
  
  // Try to find pet data in JSON format (common in modern sites)
  const jsonMatches = html.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonMatches) {
    for (const jsonScript of jsonMatches) {
      try {
        const jsonContent = jsonScript.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1];
        if (jsonContent) {
          const jsonData = JSON.parse(jsonContent);
          // Recursively search for pet data
          const findPets = (obj: any): void => {
            if (Array.isArray(obj)) {
              obj.forEach(findPets);
            } else if (typeof obj === 'object' && obj !== null) {
              if (obj.name && (obj.breed || obj.type)) {
                pets.push({
                  name: obj.name,
                  type: obj.type || (obj.species === 'cat' ? 'cat' : 'dog'),
                  breed: obj.breed || 'Mixed Breed',
                  age: obj.age || 'Unknown',
                  gender: obj.gender || 'Unknown',
                  size: obj.size || 'medium',
                  color: obj.color || 'N/A',
                  photo_url: obj.photo || obj.image || obj.photo_url || '',
                  description: obj.description || `${obj.age || 'Unknown'}, ${obj.gender || 'Unknown'} ${obj.breed || 'Mixed Breed'}`
                });
              } else {
                Object.values(obj).forEach(findPets);
              }
            }
          };
          findPets(jsonData);
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  }
  
  // If we found pets in JSON, return them
  if (pets.length > 0) {
    console.log(`[SCRAPER] Found ${pets.length} pets in JSON data`);
    return pets;
  }
  
  // Fallback: Try to extract from HTML text patterns
  // Look for common pet listing patterns
  const textPattern = /(?:Pet|Dog|Cat|Puppy|Kitten)\s+Name[^:]*:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi;
  let textMatch;
  while ((textMatch = textPattern.exec(html)) !== null && pets.length < 50) {
    const name = textMatch[1].trim();
    // Try to find associated breed/age nearby
    const context = html.substring(Math.max(0, textMatch.index - 200), textMatch.index + 500);
    const breedMatch = context.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Mix|Breed|Retriever|Shepherd))/i);
    const ageMatch = context.match(/(\d+\s*(?:yr|year|mo|month|old))/i);
    
    pets.push({
      name,
      type: context.toLowerCase().includes('cat') || context.toLowerCase().includes('kitten') ? 'cat' : 'dog',
      breed: breedMatch ? breedMatch[1] : 'Mixed Breed',
      age: ageMatch ? ageMatch[1] : 'Unknown',
      gender: 'Unknown',
      size: 'medium',
      color: 'N/A',
      photo_url: '',
      description: `${ageMatch ? ageMatch[1] : 'Unknown'}, ${breedMatch ? breedMatch[1] : 'Mixed Breed'}`
    });
  }
  
  console.log(`[SCRAPER] Found ${pets.length} pets total`);
  return pets;
}

// ============================================
// PET SCRAPER BUBBLE - Isolated Error Handling
// ============================================
/**
 * Wraps the pet scraper in a "bubble" to isolate errors and prevent crashes
 * This ensures the scraper can fail gracefully without affecting other operations
 */
async function runPetScraperInBubble(
  url: string,
  shelterId: string | undefined,
  maxPages: number
): Promise<{
  success: boolean;
  pets: any[];
  petsScraped: number;
  petsSaved: number;
  pagesScraped: number;
  totalProcessed: number;
  errors?: Array<{ pet: string; error: string }>;
  message: string;
  bubbleError?: string;
}> {
  const bubbleId = `bubble_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Starting isolated scraper execution...`);

  let browser: any = null;
  let usingPlaywright = false;

  try {
    if (!supabase) {
      throw new Error('Database not configured');
    }

    // Try to call Edge Function first (if deployed)
    try {
      const functionUrl = `${supabaseUrl}/functions/v1/scrape-adoptapet`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ url, shelterId, maxPages })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Edge Function success: ${data.petsSaved || 0} pets saved`);
        return {
          success: true,
          pets: data.pets || [],
          petsScraped: data.petsScraped || 0,
          petsSaved: data.petsSaved || 0,
          pagesScraped: data.pagesScraped || 0,
          totalProcessed: data.totalProcessed || 0,
          message: data.message || 'Scraping completed via Edge Function'
        };
      } else {
        console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Edge Function not available (${response.status}), using direct scraping...`);
      }
    } catch (edgeError: any) {
      console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Edge Function error: ${edgeError.message}, using direct scraping...`);
    }

    // Fallback: Direct scraping (isolated in bubble)
    console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Using direct scraping method...`);
    
    const allPets: PetInfo[] = [];
    let pagesScraped = 0;
    
    // Try Playwright first (preferred - more modern, supports multiple browsers)
    let browserContext: any = null;
    if (playwright) {
      try {
        console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Launching Playwright browser (Chromium)...`);
        browser = await playwright.chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        // Create context with user agent
        browserContext = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          viewport: { width: 1920, height: 1080 }
        });
        usingPlaywright = true;
      } catch (playwrightError: any) {
        console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Playwright launch failed: ${playwrightError.message}, trying Puppeteer...`);
        browser = null;
        browserContext = null;
        usingPlaywright = false;
      }
    }
    
    // Fallback to Puppeteer if Playwright not available
    if (!browser && puppeteer) {
      try {
        console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Launching Puppeteer browser...`);
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      } catch (puppeteerError: any) {
        console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Puppeteer launch failed: ${puppeteerError.message}, falling back to fetch`);
        browser = null;
      }
    }
    
    // Fetch the page
    for (let page = 1; page <= maxPages; page++) {
      try {
        let pageUrl = url;
        if (page > 1) {
          pageUrl = `${url}${url.includes('?') ? '&' : '?'}page=${page}`;
        }
        
        console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Fetching page ${page}: ${pageUrl}`);
        
        let html: string;
        
        if (browser) {
          // Use Playwright or Puppeteer for JavaScript-rendered content
          try {
            let page: any;
            if (usingPlaywright && browserContext) {
              // Playwright: create page from context
              page = await browserContext.newPage();
            } else {
              // Puppeteer: create page from browser
              page = await browser.newPage();
              await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            }
            
            // Navigate to page
            if (usingPlaywright) {
              await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 60000 });
              // Wait for React/Next.js to render
              await page.waitForTimeout(5000);
              // Wait for any pet listings to appear
              try {
                await page.waitForSelector('a[href*="/pet/"], [class*="pet"], [class*="Pet"], article, [data-testid*="pet"]', { timeout: 10000 });
              } catch (e) {
                console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] No pet selectors found, continuing...`);
              }
            } else {
              // Puppeteer
              await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
              await page.waitForTimeout(5000);
            }
            
            // Check page title and content to see if page loaded
            const pageTitle = await page.title();
            const pageText = usingPlaywright 
              ? (await page.textContent('body') || '')
              : (await page.evaluate(() => document.body.innerText) || '');
            console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Page title: ${pageTitle.substring(0, 100)}`);
            console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Page text length: ${pageText.length}, first 300 chars: ${pageText.substring(0, 300)}`);
            
            // Try multiple selectors for AdoptAPet pet listings (Next.js app)
            const selectors = [
              'a[href*="/pet/"]',  // AdoptAPet uses links to pet pages
              '[class*="pet-card"]',
              '[class*="PetCard"]',
              '[class*="petCard"]',
              '[class*="listing"]',
              'article',
              '[data-testid*="pet"]',
              '[data-pet-id]',
              'div[class*="pet"]',
              'div[class*="Pet"]'
            ];
            
            let petElements: any[] = [];
            for (const selector of selectors) {
              try {
                let elements: any[] = [];
                if (usingPlaywright) {
                  const locators = await page.locator(selector).all();
                  if (locators.length > 0) {
                    console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Found ${locators.length} elements with selector: ${selector}`);
                    // Extract data from each element
                    petElements = await Promise.all(locators.map(async (loc: any) => {
                      const text = await loc.textContent() || '';
                      const imgEl = await loc.locator('img').first().getAttribute('src').catch(() => null);
                      const linkEl = await loc.locator('a').first().getAttribute('href').catch(() => null);
                      
                      // Try to find name
                      const nameEl = await loc.locator('h2, h3, h4, h5, [class*="name"], [class*="title"]').first().textContent().catch(() => null);
                      
                      const breedMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+(?:Mix|Mix Breed|Mixed|Retriever|Shepherd|Terrier|Hound|Spaniel|Setter|Pointer|Bulldog|Poodle|Collie|Husky|Malamute|Chihuahua|Dachshund|Beagle|Boxer|Rottweiler|Doberman|Labrador|Golden|German|Australian|Border|Corgi|Pomeranian|Shih Tzu|Yorkshire|Boston|French|English|American|Staffordshire|Pit|Bull|Pug|Basset|Bloodhound|Coonhound|Foxhound|Greyhound|Whippet|Shiba|Akita|Chow|Shar Pei|Lhasa|Tibetan|Maltese|Bichon|Havanese|Coton|Papillon|Pekingese|Toy|Miniature|Standard|Giant|Teacup)))/i);
                      const ageMatch = text.match(/(\d+\s*(?:yr|year|years|mo|month|months|old|weeks?|days?))/i);
                      const genderMatch = text.match(/(Male|Female|M|F)/i);
                      
                      const name = nameEl || (text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1]) || '';
                      
                      if (name && name.length > 0) {
                        return {
                          name: name.trim(),
                          breed: breedMatch ? breedMatch[1] : 'Mixed Breed',
                          age: ageMatch ? ageMatch[1] : 'Unknown',
                          gender: genderMatch ? genderMatch[1] : 'Unknown',
                          photo: imgEl || '',
                          link: linkEl || '',
                          text: text.substring(0, 200)
                        };
                      }
                      return null;
                    }));
                    petElements = petElements.filter((p: any) => p !== null);
                    if (petElements.length > 0) break;
                  }
                } else {
                  // Puppeteer
                  elements = await page.$$(selector);
                  if (elements.length > 0) {
                    console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Found ${elements.length} elements with selector: ${selector}`);
                    petElements = await page.$$eval(selector, (els: any[]) => {
                      return els.map((el: any) => {
                        const nameEl = el.querySelector('h2, h3, h4, h5, [class*="name"], [class*="title"], a[href*="pet"]');
                        const imgEl = el.querySelector('img');
                        const linkEl = el.querySelector('a');
                        const text = el.innerText || el.textContent || '';
                        
                        const breedMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+(?:Mix|Mix Breed|Mixed|Retriever|Shepherd|Terrier|Hound|Spaniel|Setter|Pointer|Bulldog|Poodle|Collie|Husky|Malamute|Chihuahua|Dachshund|Beagle|Boxer|Rottweiler|Doberman|Labrador|Golden|German|Australian|Border|Corgi|Pomeranian|Shih Tzu|Yorkshire|Boston|French|English|American|Staffordshire|Pit|Bull|Pug|Basset|Bloodhound|Coonhound|Foxhound|Greyhound|Whippet|Shiba|Akita|Chow|Shar Pei|Lhasa|Tibetan|Maltese|Bichon|Havanese|Coton|Papillon|Pekingese|Toy|Miniature|Standard|Giant|Teacup)))/i);
                        const ageMatch = text.match(/(\d+\s*(?:yr|year|years|mo|month|months|old|weeks?|days?))/i);
                        const genderMatch = text.match(/(Male|Female|M|F)/i);
                        
                        const name = nameEl ? (nameEl.textContent || nameEl.innerText || '').trim() : (text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1] || '');
                        
                        if (name && name.length > 0) {
                          return {
                            name: name,
                            breed: breedMatch ? breedMatch[1] : 'Mixed Breed',
                            age: ageMatch ? ageMatch[1] : 'Unknown',
                            gender: genderMatch ? genderMatch[1] : 'Unknown',
                            photo: imgEl ? imgEl.src : '',
                            link: linkEl ? linkEl.href : '',
                            text: text.substring(0, 200)
                          };
                        }
                        return null;
                      }).filter((p: any) => p !== null);
                    });
                    if (petElements.length > 0) break;
                  }
                }
              } catch (selectorError: any) {
                // Continue to next selector
                console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Selector ${selector} failed: ${selectorError.message}`);
              }
            }
            
            if (petElements && petElements.length > 0) {
              console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Found ${petElements.length} pets via DOM query`);
              // Convert to PetInfo format
              const domPets: PetInfo[] = petElements.map((pet: any) => ({
                name: pet.name,
                type: url.includes('animal_type_id=1') ? 'cat' : 'dog', // 1=cat, 2=dog
                breed: pet.breed,
                age: pet.age,
                gender: pet.gender,
                size: 'medium',
                color: 'N/A',
                photo_url: pet.photo || null,
                description: `${pet.age}, ${pet.gender} ${pet.breed}`
              }));
              
              // Add to allPets
              allPets.push(...domPets);
              await page.close();
              pagesScraped++;
              if (page < maxPages) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
              continue; // Skip HTML parsing, we got pets from DOM
            } else {
              console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] No pets found via DOM query, will try HTML parsing`);
            }
            
            html = await page.content();
            await page.close();
            const browserType = usingPlaywright ? 'Playwright' : 'Puppeteer';
            console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] ${browserType} fetched ${html.length} chars`);
          } catch (browserError: any) {
            const browserType = usingPlaywright ? 'Playwright' : 'Puppeteer';
            console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] ${browserType} error: ${browserError.message}, falling back to fetch`);
            const response = await fetch(pageUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              }
            });
            if (!response.ok) {
              if (page === 1) {
                throw new Error(`Failed to fetch page: ${response.status}`);
              } else {
                break;
              }
            }
            html = await response.text();
          }
        } else {
          // Fallback to simple fetch
          const response = await fetch(pageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });

          if (!response.ok) {
            if (page === 1) {
              throw new Error(`Failed to fetch page: ${response.status}`);
            } else {
              break; // No more pages
            }
          }

          html = await response.text();
        }

        console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] HTML length: ${html.length}, first 500 chars: ${html.substring(0, 500)}`);
        const pagePets = await scrapePetsFromHTML(html);
        console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Found ${pagePets.length} pets on page ${page}`);
        
        if (pagePets.length === 0) {
          console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] No pets found on page ${page}, checking if page loaded correctly...`);
          // Check if we got actual content or an error page
          if (html.length < 1000) {
            console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] WARNING: HTML is very short (${html.length} chars), might be blocked or error page`);
          }
          break; // No pets on this page
        }
        
        allPets.push(...pagePets);
        pagesScraped++;
        
        // Small delay between pages
        if (page < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (pageError: any) {
        console.error(`[PET SCRAPER BUBBLE] [${bubbleId}] Error on page ${page}:`, pageError.message);
        if (page === 1) {
          throw pageError;
        }
        break;
      }
    }

    // Close browser if it was opened
    if (browser) {
      try {
        await browser.close();
        console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Browser closed`);
      } catch (closeError: any) {
        console.error(`[PET SCRAPER BUBBLE] [${bubbleId}] Error closing browser: ${closeError.message}`);
      }
    }

    console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Found ${allPets.length} pets across ${pagesScraped} pages`);

    // Save pets to database (isolated error handling per pet)
    const savedPets: any[] = [];
    const errors: Array<{ pet: string; error: string }> = [];

    for (const pet of allPets) {
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
            location_city: 'Unknown',
            location_state: 'AL',
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

    console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Completed successfully: ${savedPets.length} pets saved`);
    
    return {
      success: true,
      pets: savedPets,
      petsScraped: allPets.length,
      petsSaved: savedPets.length,
      pagesScraped,
      totalProcessed: allPets.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Scraped ${allPets.length} pets, saved ${savedPets.length} to database`
    };

  } catch (error: any) {
    // Close browser if it was opened
    if (browser) {
      try {
        await browser.close();
        console.log(`[PET SCRAPER BUBBLE] [${bubbleId}] Browser closed after error`);
      } catch (closeError: any) {
        console.error(`[PET SCRAPER BUBBLE] [${bubbleId}] Error closing browser: ${closeError.message}`);
      }
    }

    // Bubble catches all errors and returns them gracefully
    const errorMessage = error.message || 'Unknown error in pet scraper bubble';
    console.error(`[PET SCRAPER BUBBLE] [${bubbleId}] Error caught in bubble:`, errorMessage);
    
    return {
      success: false,
      pets: [],
      petsScraped: 0,
      petsSaved: 0,
      pagesScraped: 0,
      totalProcessed: 0,
      message: `Scraping failed: ${errorMessage}`,
      bubbleError: errorMessage
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      const missingVars = [];
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

    const body = await request.json();
    const { url, shelterId, maxPages = 5 } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    console.log(`[SCRAPER] Starting scrape of: ${url}`);
    
    // Run scraper in isolated bubble
    const result = await runPetScraperInBubble(url, shelterId, maxPages);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Scraping failed', 
          message: result.bubbleError || result.message,
          details: process.env.NODE_ENV === 'development' ? result.bubbleError : undefined,
          errors: result.errors
        },
        { status: 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[SCRAPER] Outer error handler:', error);
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
