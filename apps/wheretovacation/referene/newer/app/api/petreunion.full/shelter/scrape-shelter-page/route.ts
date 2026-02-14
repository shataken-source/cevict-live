import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Playwright for browser scraping
let playwright: any = null;
try {
  playwright = require('playwright');
} catch (e) {
  console.log('[SHELTER SCRAPER] Playwright not available');
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
  source_url?: string;
  status: 'found';
}

/**
 * Pattern-based scraper that:
 * 1. Finds the container pattern for pets on the page
 * 2. Extracts all pets using that pattern
 * 3. Works for any page with consistent pet container layout
 */
async function scrapeByPattern(page: any, url: string, shelterType: string): Promise<ScrapedPet[]> {
  const pets: ScrapedPet[] = [];

  try {
    console.log(`[PATTERN SCRAPER] Scraping: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000);

    // Scroll to load all content
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    }

    // Step 1: Find the pet container pattern
    // Try multiple strategies to find repeating pet containers
    const containerPatterns = [
      // Strategy 1: Look for repeating article/div elements with similar structure
      async () => {
        const containers = await page.$$eval('article, [class*="pet"], [class*="Pet"], [class*="card"], [class*="Card"], [class*="animal"], [class*="Animal"]', (elements: any[]) => {
          // Group elements by their class structure
          const classGroups: Record<string, any[]> = {};
          elements.forEach(el => {
            const classes = Array.from(el.classList || []).sort().join(' ');
            if (!classGroups[classes]) classGroups[classes] = [];
            classGroups[classes].push(el);
          });
          
          // Find the group with most elements (likely the pet container pattern)
          let maxGroup: any[] = [];
          let maxCount = 0;
          Object.values(classGroups).forEach(group => {
            if (group.length > maxCount && group.length >= 3) { // At least 3 pets
              maxCount = group.length;
              maxGroup = group;
            }
          });
          
          return maxGroup.slice(0, 50).map(el => ({
            html: el.outerHTML,
            text: el.innerText || el.textContent || '',
            classes: Array.from(el.classList || []).join(' '),
            tagName: el.tagName
          }));
        });
        
        if (containers.length >= 3) {
          console.log(`[PATTERN SCRAPER] Found ${containers.length} containers with pattern: ${containers[0]?.classes}`);
          return containers;
        }
        return null;
      },

      // Strategy 2: Look for links to pet pages
      async () => {
        const petLinks = await page.$$eval('a[href*="/pet/"], a[href*="/animal/"], a[href*="/dog/"], a[href*="/cat/"]', (links: any[]) => {
          // Find parent containers of these links
          const containers = new Set();
          links.forEach(link => {
            let parent = link.parentElement;
            let depth = 0;
            while (parent && depth < 5) {
              if (parent.tagName === 'ARTICLE' || parent.classList.contains('pet') || parent.classList.contains('card')) {
                containers.add(parent);
                break;
              }
              parent = parent.parentElement;
              depth++;
            }
          });
          
          return Array.from(containers).slice(0, 50).map((el: any) => ({
            html: el.outerHTML,
            text: el.innerText || el.textContent || '',
            classes: Array.from(el.classList || []).join(' '),
            tagName: el.tagName
          }));
        });
        
        if (petLinks.length >= 3) {
          console.log(`[PATTERN SCRAPER] Found ${petLinks.length} containers via pet links`);
          return petLinks;
        }
        return null;
      },

      // Strategy 3: Look for repeating image + text patterns
      async () => {
        const containers = await page.$$eval('div, article, section', (elements: any[]) => {
          // Find elements that contain both an image and text (likely pet cards)
          return elements
            .filter(el => {
              const hasImg = el.querySelector('img');
              const hasText = (el.innerText || el.textContent || '').length > 20;
              const hasPetKeywords = /(dog|cat|puppy|kitten|adopt|male|female|yr|year|month)/i.test(el.innerText || '');
              return hasImg && hasText && hasPetKeywords;
            })
            .slice(0, 50)
            .map(el => ({
              html: el.outerHTML,
              text: el.innerText || el.textContent || '',
              classes: Array.from(el.classList || []).join(' '),
              tagName: el.tagName
            }));
        });
        
        if (containers.length >= 3) {
          console.log(`[PATTERN SCRAPER] Found ${containers.length} containers via image+text pattern`);
          return containers;
        }
        return null;
      }
    ];

    // Try each strategy until we find containers
    let containers: any[] | null = null;
    for (const strategy of containerPatterns) {
      try {
        containers = await strategy();
        if (containers && containers.length >= 3) {
          break;
        }
      } catch (e) {
        console.log(`[PATTERN SCRAPER] Strategy failed:`, e);
      }
    }

    if (!containers || containers.length === 0) {
      console.log('[PATTERN SCRAPER] No pet containers found');
      return pets;
    }

    console.log(`[PATTERN SCRAPER] Found ${containers.length} pet containers. Analyzing pattern...`);

    // Step 2: Analyze the first container to understand the pattern
    const sampleContainer = containers[0];
    console.log(`[PATTERN SCRAPER] Sample container classes: ${sampleContainer.classes}`);
    console.log(`[PATTERN SCRAPER] Sample container text (first 200 chars): ${sampleContainer.text.substring(0, 200)}`);

    // Step 3: Extract pets from all containers using the pattern
    const extractedPets = await page.evaluate((containerClass: string, containerTag: string) => {
      // Find all elements matching the pattern
      const selectors = [
        containerClass ? `.${containerClass.split(' ')[0]}` : null,
        containerTag ? containerTag.toLowerCase() : null,
        '[class*="pet"]',
        '[class*="card"]',
        'article'
      ].filter((s): s is string => !!s);

      let elements: any[] = [];
      for (const selector of selectors) {
        try {
          const found = Array.from(document.querySelectorAll(selector));
          if (found.length >= 3) {
            elements = found;
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }

      return elements.slice(0, 50).map((el: any) => {
        const text = el.innerText || el.textContent || '';
        
        // Skip if doesn't look like a pet
        if (!/(dog|cat|puppy|kitten|adopt|male|female|yr|year|month|breed)/i.test(text)) {
          return null;
        }

        // Extract name
        let name = 'Unknown';
        const namePatterns = [
          /(?:name|named|meet|this is|introducing|^)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
          /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/
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
        const ageMatch = text.match(/(\d+\s*(?:yr|year|years|mo|month|months|old|wks?|days?))/i);
        if (ageMatch) age = ageMatch[1].trim();

        // Extract gender
        let gender = 'Unknown';
        if (/male|boy|he\s+is/i.test(text)) gender = 'Male';
        else if (/female|girl|she\s+is/i.test(text)) gender = 'Female';

        // Extract size
        let size = 'medium';
        const sizeMatch = text.match(/(small|medium|large|med\.?)/i);
        if (sizeMatch) {
          const sizeText = sizeMatch[1].toLowerCase();
          if (sizeText.includes('small')) size = 'small';
          else if (sizeText.includes('large')) size = 'large';
          else size = 'medium';
        }

        // Extract color
        let color = 'N/A';
        const colorMatch = text.match(/(black|white|brown|tan|gold|yellow|red|gray|grey|blue|cream|brindle|spotted|striped)/i);
        if (colorMatch) color = colorMatch[1];

        // Get image
        const imgEl = el.querySelector('img');
        const photo = imgEl ? imgEl.src : '';

        // Get link
        const linkEl = el.querySelector('a[href*="/pet/"], a[href*="/animal/"]');
        const link = linkEl ? linkEl.href : '';

        // Determine type
        const isCat = /(cat|kitten|kitty)/i.test(text);
        const type = isCat ? 'cat' : 'dog';

        if (name !== 'Unknown' && name.length > 0) {
          return {
            name,
            type,
            breed,
            age,
            gender,
            size,
            color,
            photo,
            text: text.substring(0, 500),
            link
          };
        }
        return null;
      }).filter((pet: any) => pet !== null);
    }, sampleContainer.classes.split(' ')[0] || '', sampleContainer.tagName);

    // Convert to ScrapedPet format
    for (const petData of extractedPets) {
      pets.push({
        name: petData.name,
        type: petData.type,
        breed: petData.breed,
        age: petData.age,
        gender: petData.gender,
        size: petData.size,
        color: petData.color,
        photo_url: petData.photo,
        description: petData.text,
        source_url: petData.link || url,
        status: 'found'
      });
    }

    console.log(`[PATTERN SCRAPER] Extracted ${pets.length} pets from ${containers.length} containers`);
    return pets;

  } catch (error: any) {
    console.error(`[PATTERN SCRAPER] Error:`, error.message);
    return pets;
  }
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
    const { shelterId, url, shelterType = 'adoptapet' } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 });
    }

    // Get shelter info if shelterId provided
    let shelter: any = null;
    if (shelterId) {
      const { data } = await supabase
        .from('shelters')
        .select('*')
        .eq('id', shelterId)
        .single();
      shelter = data;
    }

    const browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Scrape using pattern detection
    const pets = await scrapeByPattern(page, url, shelterType);

    await browser.close();

    // Save pets to database
    let saved = 0;
    const seenPets = new Set<string>();

    for (const pet of pets) {
      try {
        const key = `${pet.name}_${pet.source_url}`;
        if (seenPets.has(key)) continue;
        seenPets.add(key);

        // Check for duplicates
        const { data: existing } = await supabase
          .from('lost_pets')
          .select('id')
          .eq('pet_name', pet.name)
          .eq('location_city', pet.location_city || shelter?.city || 'Unknown')
          .eq('location_state', pet.location_state || shelter?.state || 'AL')
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
            status: 'found',
            location_city: pet.location_city || shelter?.city || 'Unknown',
            location_state: pet.location_state || shelter?.state || 'AL',
            date_lost: new Date().toISOString().split('T')[0],
            shelter_id: shelterId || null,
            owner_name: 'Shelter Scraper'
          });

        if (!petError) {
          saved++;
        }
      } catch (error: any) {
        console.error(`[SHELTER SCRAPER] Error saving pet:`, error.message);
      }
    }

    // Update shelter's scan status and date
    if (shelterId && saved > 0 && supabase) {
      const now = new Date().toISOString();
      await supabase
        .from('shelters')
        .update({ 
          last_scraped_at: now,
          scan_status: 'scanned',
          scanned_date: now
        })
        .eq('id', shelterId);
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      petsFound: pets.length,
      petsSaved: saved,
      duration,
      message: `Scraped ${pets.length} pets, saved ${saved} to database`
    });

  } catch (error: any) {
    console.error('[SHELTER SCRAPER] Fatal error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


