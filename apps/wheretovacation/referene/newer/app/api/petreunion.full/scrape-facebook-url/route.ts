import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Facebook login credentials (optional - for private content)
const FACEBOOK_EMAIL = process.env.FACEBOOK_EMAIL || '';
const FACEBOOK_PASSWORD = process.env.FACEBOOK_PASSWORD || '';

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
  source: string;
  source_url?: string;
}

interface ScrapeStats {
  postsFound: number;
  postElementsScanned: number;
  imagesFound: number;
  imageElementsScanned: number;
  textLength: number;
  petsExtracted: number;
  relatedPostsFound: number;
  extractionDuration: number;
  urlType: string;
}

/**
 * Extract pet information from Facebook post text
 */
function extractPetFromText(text: string, photoUrl?: string): ScrapedPet | null {
  const textLower = text.toLowerCase();
  
  // Check if this is about pets
  const petKeywords = ['dog', 'puppy', 'cat', 'kitten', 'pet', 'lost', 'found', 'missing', 'adopt', 'adoption'];
  if (!petKeywords.some(keyword => textLower.includes(keyword))) {
    return null;
  }
  
  // Determine type
  const isCat = textLower.includes('cat') || textLower.includes('kitten');
  const type: 'dog' | 'cat' = isCat ? 'cat' : 'dog';
  
  // Determine status
  const isLost = textLower.includes('lost') || textLower.includes('missing');
  const status: 'lost' | 'found' = isLost ? 'lost' : 'found';
  
  // Extract name
  const namePatterns = [
    /(?:name|named|meet|this is|call(?:ed|s)?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is|was|has|needs)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is|was)\s+(?:a|an)\s+(?:lost|found|missing|adoptable)/i
  ];
  
  let name = 'Unknown';
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      name = match[1].trim();
      if (name.length > 1 && name.length < 30) break;
    }
  }
  
  // Extract breed
  const breedPatterns = [
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+(?:Mix|Mix Breed|Mixed|Retriever|Shepherd|Terrier|Hound|Spaniel|Setter|Pointer|Bulldog|Poodle|Collie|Husky|Malamute|Chihuahua|Dachshund|Beagle|Boxer|Rottweiler|Doberman|Labrador|Golden|German|Australian|Border|Corgi|Pomeranian|Shih Tzu|Yorkshire|Boston|French|English|American|Staffordshire|Pit|Bull|Pug|Basset|Bloodhound|Coonhound|Foxhound|Greyhound|Whippet|Shiba|Akita|Chow|Shar Pei|Lhasa|Tibetan|Maltese|Bichon|Havanese|Coton|Papillon|Pekingese|Persian|Siamese|Maine Coon|Ragdoll|British Shorthair|Scottish Fold|Bengal|Sphynx)))/i,
    /(?:breed|breed:)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  ];
  
  let breed = 'Mixed Breed';
  for (const pattern of breedPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      breed = match[1].trim();
      break;
    }
  }
  
  // Extract age
  const ageMatch = text.match(/(\d+)\s*(?:yr|year|years|mo|month|months|old|weeks?|days?)/i);
  const age = ageMatch ? ageMatch[0] : undefined;
  
  // Extract gender
  const genderMatch = text.match(/\b(male|female|m|f)\b/i);
  const gender = genderMatch ? genderMatch[1] : undefined;
  
  // Extract color
  const colorMatch = text.match(/(?:color|colour|coat):?\s*([a-z]+(?:\s+[a-z]+)?)/i);
  const color = colorMatch ? colorMatch[1] : undefined;
  
  // Extract size
  const sizeMatch = text.match(/\b(small|medium|large|xl|extra large|tiny|mini)\b/i);
  const size = sizeMatch ? sizeMatch[1] : undefined;
  
  // Extract location
  const locationMatch = text.match(/(?:in|near|from|location):?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s*([A-Z]{2})?/i);
  const location_city = locationMatch ? locationMatch[1] : undefined;
  const location_state = locationMatch && locationMatch[2] ? locationMatch[2] : undefined;
  
  // Build description (first 500 chars of text)
  const description = text.substring(0, 500).trim();
  
  if (description.length < 10) {
    return null; // Not enough information
  }
  
  return {
    name,
    type,
    breed,
    age,
    gender,
    size,
    color,
    photo_url: photoUrl,
    description,
    status,
    location_city,
    location_state,
    source: 'facebook',
    source_url: undefined
  };
}

/**
 * Scrape a single Facebook URL (post, photo, or page)
 */
async function scrapeFacebookUrl(url: string): Promise<{ pets: ScrapedPet[]; stats?: ScrapeStats; error?: string }> {
  const pets: ScrapedPet[] = [];
  
  try {
    let playwright: any = null;
    try {
      playwright = require('playwright');
    } catch (e) {
      console.log('[FB URL SCRAPER] Playwright not available');
      return { pets: [], error: 'Playwright not installed' };
    }
    
    const browser = await playwright.chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Navigate to URL
    console.log(`[FB URL SCRAPER] Loading ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000);
    
    // Check if login is required
    const pageText = await page.textContent('body') || '';
    if (pageText.includes('Log Into Facebook') || pageText.includes('You must log in')) {
      console.log('[FB URL SCRAPER] Login required, attempting login...');
      
      if (FACEBOOK_EMAIL && FACEBOOK_PASSWORD) {
        try {
          // Navigate to login
          await page.goto('https://www.facebook.com/login', { waitUntil: 'networkidle', timeout: 30000 });
          await page.waitForTimeout(2000);
          
          // Enter email
          await page.fill('input[name="email"], input[type="email"], input[id="email"]', FACEBOOK_EMAIL);
          await page.waitForTimeout(1000);
          
          // Enter password
          await page.fill('input[name="pass"], input[type="password"], input[id="pass"]', FACEBOOK_PASSWORD);
          await page.waitForTimeout(1000);
          
          // Click login
          await page.click('button[type="submit"], button[name="login"], button[id="loginbutton"]');
          await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
          await page.waitForTimeout(3000);
          
          // Now navigate to the original URL
          await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
          await page.waitForTimeout(5000);
        } catch (loginError: any) {
          console.error('[FB URL SCRAPER] Login failed:', loginError.message);
          await browser.close();
          return { pets: [], error: 'Login required but login failed' };
        }
      } else {
        await browser.close();
        return { pets: [], error: 'Login required but credentials not configured' };
      }
    }
    
    // Scroll to load content
    console.log(`[FB URL SCRAPER] Scrolling to load content...`);
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    }
    
    // Extract content from the page
    console.log(`[FB URL SCRAPER] Extracting pet information...`);
    const startExtractTime = Date.now();
    
    const extractedData = await page.evaluate(() => {
      const data: any = {
        posts: [],
        images: [],
        postElements: 0,
        imageElements: 0,
        textLength: 0
      };
      
      // Try to find post text
      const textSelectors = [
        '[data-ad-preview="message"]',
        '[data-testid="post_message"]',
        '.userContent',
        '[data-ft*="message"]',
        'div[dir="auto"]',
        '[role="article"]',
        'div[data-pagelet*="FeedUnit"]'
      ];
      
      for (const selector of textSelectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        data.postElements += elements.length;
        for (const el of elements) {
          const text = (el.textContent || '').trim();
          if (text.length > 20) {
            data.posts.push(text);
            data.textLength += text.length;
          }
        }
      }
      
      // Extract images
      const imgSelectors = [
        'img[src*="scontent"]',
        'img[src*="fbcdn"]',
        'img[data-imgperflogname]',
        'img[src^="https://"]'
      ];
      
      for (const selector of imgSelectors) {
        const imgs = Array.from(document.querySelectorAll(selector));
        data.imageElements += imgs.length;
        for (const img of imgs) {
          const src = (img as HTMLImageElement).src || img.getAttribute('src');
          if (src && src.includes('scontent') && !data.images.includes(src)) {
            data.images.push(src);
          }
        }
      }
      
      return data;
    });
    
    // Process extracted posts
    const allText = extractedData.posts.join('\n\n');
    const mainImage = extractedData.images[0] || undefined;
    
    // Extract pets from the text
    let petsExtracted = 0;
    if (allText.length > 20) {
      const pet = extractPetFromText(allText, mainImage);
      if (pet) {
        pet.source_url = url;
        pets.push(pet);
        petsExtracted++;
      }
    }
    
    // Also check if this is a photo album - try to find related posts
    let relatedPostsFound = 0;
    if (url.includes('/photo/') || url.includes('/photos/')) {
      console.log('[FB URL SCRAPER] Detected photo URL, looking for related posts...');
      
      // Try to find the parent post or album
      const relatedPosts = await page.evaluate(() => {
        const posts: string[] = [];
        const postElements = Array.from(document.querySelectorAll('[role="article"], [data-pagelet*="FeedUnit"]'));
        
        for (const post of postElements.slice(0, 10)) {
          const text = (post.textContent || '').trim();
          if (text.length > 20) {
            posts.push(text);
          }
        }
        
        return posts;
      });
      
      relatedPostsFound = relatedPosts.length;
      
      for (const postText of relatedPosts) {
        const pet = extractPetFromText(postText, mainImage);
        if (pet && !pets.some(p => p.name === pet.name && p.description === pet.description)) {
          pet.source_url = url;
          pets.push(pet);
          petsExtracted++;
        }
      }
    }
    
    await browser.close();
    
    const extractDuration = Date.now() - startExtractTime;
    
    console.log(`[FB URL SCRAPER] Extracted ${pets.length} pets from ${url}`);
    
    return { 
      pets,
      stats: {
        postsFound: extractedData.posts.length,
        postElementsScanned: extractedData.postElements,
        imagesFound: extractedData.images.length,
        imageElementsScanned: extractedData.imageElements,
        textLength: extractedData.textLength,
        petsExtracted,
        relatedPostsFound,
        extractionDuration: extractDuration,
        urlType: url.includes('/photo/') ? 'photo' : url.includes('/photos/') ? 'album' : url.includes('/pages/') ? 'page' : 'post'
      }
    };
    
  } catch (error: any) {
    console.error('[FB URL SCRAPER] Error:', error);
    return { pets: [], error: error.message };
  }
}

/**
 * Save pets to database
 */
async function savePets(pets: ScrapedPet[]): Promise<{ saved: number; skipped: number; errors: string[] }> {
  if (!supabase) {
    throw new Error('Database not configured');
  }
  
  let saved = 0;
  let skipped = 0;
  const errors: string[] = [];
  
  for (const pet of pets) {
    try {
      // Check for duplicates
      const { data: existing } = await supabase
        .from('lost_pets')
        .select('id')
        .eq('pet_name', pet.name)
        .eq('breed', pet.breed)
        .limit(1)
        .maybeSingle();
      
      if (existing) {
        skipped++;
        continue;
      }
      
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
          date_lost: new Date().toISOString().split('T')[0],
          owner_name: 'Community',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        errors.push(`Error saving ${pet.name}: ${insertError.message}`);
      } else {
        saved++;
      }
    } catch (error: any) {
      errors.push(`Exception saving ${pet.name}: ${error.message}`);
    }
  }
  
  return { saved, skipped, errors };
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Facebook URL Scraper API',
    description: 'This endpoint scrapes pets from Facebook URLs (posts, photos, or pages)',
    usage: {
      method: 'POST',
      endpoint: '/api/petreunion/scrape-facebook-url',
      body: {
        url: 'https://www.facebook.com/photo/?fbid=...'
      }
    },
    features: [
      'Extracts pet information from Facebook posts',
      'Handles photos, posts, and pages',
      'Automatically saves pets to database',
      'Supports Facebook login if credentials are configured'
    ],
    requirements: {
      facebookUrl: 'Must be a valid Facebook URL',
      playwright: 'Playwright must be installed for browser automation',
      database: 'Supabase database must be configured'
    },
    example: {
      url: 'https://www.facebook.com/photo/?fbid=10241416502416305&set=a.4872182649223'
    }
  });
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
    const { url } = body;
    
    if (!url || !url.includes('facebook.com')) {
      return NextResponse.json(
        { error: 'Valid Facebook URL is required' },
        { status: 400 }
      );
    }
    
    console.log(`[FB URL SCRAPER] Scraping Facebook URL: ${url}`);
    
    const startTime = Date.now();
    
    // Scrape the URL
    const result = await scrapeFacebookUrl(url);
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error, pets: result.pets || [] },
        { status: 500 }
      );
    }
    
    // Save pets to database
    const saveResult = await savePets(result.pets);
    
    const totalDuration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      message: `Scraped ${result.pets.length} pets from Facebook URL, saved ${saveResult.saved} to database`,
      pets: result.pets,
      saved: saveResult.saved,
      skipped: saveResult.skipped,
      errors: saveResult.errors,
      stats: {
        ...result.stats,
        totalDuration,
        databaseSaveTime: totalDuration - (result.stats?.extractionDuration || 0),
        petsWithPhotos: result.pets.filter(p => p.photo_url).length,
        petsWithoutPhotos: result.pets.filter(p => !p.photo_url).length,
        petsByType: {
          dogs: result.pets.filter(p => p.type === 'dog').length,
          cats: result.pets.filter(p => p.type === 'cat').length
        },
        petsByStatus: {
          lost: result.pets.filter(p => p.status === 'lost').length,
          found: result.pets.filter(p => p.status === 'found').length
        }
      }
    });
    
  } catch (error: any) {
    console.error('[FB URL SCRAPER] Fatal error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape Facebook URL' },
      { status: 500 }
    );
  }
}

