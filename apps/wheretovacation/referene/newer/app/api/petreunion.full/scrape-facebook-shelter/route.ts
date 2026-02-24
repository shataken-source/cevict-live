import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Scrape pet posts from a Facebook shelter page
 * Extracts pet info from posts (photos, descriptions, names, etc.)
 */
async function scrapeFacebookShelterPage(fbUrl: string, shelterId?: number) {
  const pets: any[] = [];
  
  try {
    let playwright: any = null;
    try {
      playwright = require('playwright');
    } catch (e) {
      console.log('[FB SCRAPER] Playwright not available');
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
    
    // Navigate to Facebook page
    console.log(`[FB SCRAPER] Loading ${fbUrl}...`);
    await page.goto(fbUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    // Scroll to load more posts
    console.log(`[FB SCRAPER] Scrolling to load posts...`);
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    }
    
    // Extract pet posts from the page
    console.log(`[FB SCRAPER] Extracting pet posts...`);
    const petPosts = await page.evaluate(() => {
      const posts: any[] = [];
      
      // Find all post containers (Facebook uses various selectors)
      const postSelectors = [
        '[data-pagelet*="FeedUnit"]',
        '[role="article"]',
        'div[data-ad-preview="message"]',
        'div[data-testid="post_message"]',
        '.userContentWrapper',
        'div[data-ft*="top_level_post_id"]'
      ];
      
      let postElements: any[] = [];
      for (const selector of postSelectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          postElements = elements;
          break;
        }
      }
      
      // If no posts found with specific selectors, try generic approach
      if (postElements.length === 0) {
        postElements = Array.from(document.querySelectorAll('div[role="article"]'));
      }
      
      for (const post of postElements.slice(0, 50)) { // Limit to 50 posts per page
        try {
          // Get post text
          const textSelectors = [
            '[data-ad-preview="message"]',
            '[data-testid="post_message"]',
            '.userContent',
            '[data-ft*="message"]',
            'div[dir="auto"]'
          ];
          
          let postText = '';
          for (const selector of textSelectors) {
            const textEl = post.querySelector(selector);
            if (textEl) {
              postText = (textEl.textContent || '').trim();
              if (postText.length > 20) break;
            }
          }
          
          // Look for pet-related keywords
          const petKeywords = [
            'adopt', 'adoption', 'available', 'looking for', 'foster',
            'dog', 'puppy', 'cat', 'kitten', 'pet', 'rescue',
            'male', 'female', 'spayed', 'neutered', 'microchipped',
            'years old', 'months old', 'weeks old'
          ];
          
          const hasPetContent = petKeywords.some(keyword => 
            postText.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (!hasPetContent || postText.length < 20) continue;
          
          // Extract images
          const images: string[] = [];
          const imgSelectors = [
            'img[src*="scontent"]',
            'img[src*="fbcdn"]',
            'img[data-imgperflogname]',
            'img[src^="https://"]'
          ];
          
          for (const selector of imgSelectors) {
            const imgs = post.querySelectorAll(selector);
            imgs.forEach((img: any) => {
              const src = img.src || img.getAttribute('src');
              if (src && src.includes('scontent') && !images.includes(src)) {
                images.push(src);
              }
            });
          }
          
          // Extract pet name (look for patterns like "Meet [Name]" or "[Name] is available")
          let petName = '';
          const namePatterns = [
            /(?:meet|this is|say hello to|introducing)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
            /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is|needs|looking)/i,
            /adopt\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
          ];
          
          for (const pattern of namePatterns) {
            const match = postText.match(pattern);
            if (match && match[1]) {
              petName = match[1].trim();
              break;
            }
          }
          
          // Extract breed (look for common breed mentions)
          let breed = '';
          const breedPatterns = [
            /(?:labrador|lab|golden retriever|pit bull|pitbull|german shepherd|beagle|boxer|bulldog|poodle|rottweiler|doberman|husky|chihuahua|shih tzu|yorkie|yorkshire terrier|maltese|pomeranian|bichon|dachshund|basset hound|great dane|mastiff|saint bernard|border collie|australian shepherd|jack russell|terrier|mix|mixed)/i
          ];
          
          for (const pattern of breedPatterns) {
            const match = postText.match(pattern);
            if (match) {
              breed = match[0].trim();
              break;
            }
          }
          
          // Extract age
          let age = '';
          const agePattern = /(\d+)\s*(?:year|month|week|day)s?\s*old/i;
          const ageMatch = postText.match(agePattern);
          if (ageMatch) {
            age = ageMatch[0].trim();
          }
          
          // Determine pet type
          let petType = 'dog';
          if (postText.toLowerCase().includes('cat') || postText.toLowerCase().includes('kitten')) {
            petType = 'cat';
          }
          
          // Determine gender
          let gender = '';
          if (postText.toLowerCase().includes('male') && !postText.toLowerCase().includes('female')) {
            gender = 'male';
          } else if (postText.toLowerCase().includes('female')) {
            gender = 'female';
          }
          
          // Extract location if mentioned
          let location = '';
          const locationPattern = /(?:in|at|near|located in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
          const locMatch = postText.match(locationPattern);
          if (locMatch) {
            location = locMatch[1].trim();
          }
          
          // Determine status (lost, found, or available for adoption)
          // Check for lost pet keywords first (higher priority)
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
          
          const postTextLower = postText.toLowerCase();
          let status = 'found'; // Default to found (available for adoption)
          
          // Check for lost pet indicators
          const isLost = lostKeywords.some(keyword => postTextLower.includes(keyword));
          // Check for found pet indicators (but not adoption)
          const isFound = foundKeywords.some(keyword => postTextLower.includes(keyword));
          // Check for adoption indicators
          const isAdoption = adoptionKeywords.some(keyword => postTextLower.includes(keyword));
          
          if (isLost) {
            status = 'lost';
          } else if (isFound && !isAdoption) {
            status = 'found'; // Found/stray pet (not for adoption)
          } else if (isAdoption) {
            status = 'found'; // Available for adoption (still "found" status)
          }
          
          if (postText.length > 20 && (images.length > 0 || petName || breed)) {
            posts.push({
              name: petName || 'Unknown',
              description: postText.substring(0, 500),
              breed: breed || 'Mixed Breed',
              age: age || 'Unknown',
              pet_type: petType,
              gender: gender || 'unknown',
              location: location,
              images: images.slice(0, 5), // Max 5 images
              source: 'facebook',
              post_text: postText.substring(0, 1000),
              status: status // Include detected status
            });
          }
        } catch (error) {
          // Skip posts that fail to parse
          continue;
        }
      }
      
      return posts;
    });
    
    await browser.close();
    
    console.log(`[FB SCRAPER] Found ${petPosts.length} pet posts`);
    return { pets: petPosts, error: null };
    
  } catch (error: any) {
    console.error(`[FB SCRAPER] Error scraping ${fbUrl}:`, error.message);
    return { pets: [], error: error.message };
  }
}

/**
 * Save pets to database
 */
async function savePets(pets: any[], shelterId?: number) {
  if (!supabase || pets.length === 0) return { saved: 0, skipped: 0 };
  
  let saved = 0;
  let skipped = 0;
  
  for (const pet of pets) {
    try {
      // Check if pet already exists (by description hash or image URL)
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
      let fullDescription = (pet.description || pet.post_text || '').trim();
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
      
      // Determine status - use detected status from scraper, or default based on description
      let petStatus = pet.status || 'found';
      
      // If status wasn't detected, try to infer from description
      if (!pet.status) {
        const descLower = fullDescription.toLowerCase();
        if (descLower.includes('lost') || descLower.includes('missing') || 
            descLower.includes('help find') || descLower.includes('reunite')) {
          petStatus = 'lost';
        } else if (descLower.includes('found') || descLower.includes('stray') || 
                   descLower.includes('loose') || descLower.includes('wandering')) {
          petStatus = 'found';
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
              console.log(`[FB SCRAPER] Resized image: ${resizeData.size} bytes`);
            }
          }
        } catch (error) {
          console.warn(`[FB SCRAPER] Failed to resize image, using original:`, error);
        }
      }

      // Save pet
      const petData: any = {
        pet_name: pet.name || 'Unknown',
        pet_type: pet.pet_type || 'dog',
        breed: pet.breed || 'Mixed Breed',
        color: 'Unknown', // Facebook doesn't always provide color
        description: fullDescription,
        photo_url: photoUrl,
        status: petStatus, // Use detected status (lost, found, or available for adoption)
        date_lost: new Date().toISOString().split('T')[0], // Use today as default
        location_city: pet.location || '',
        location_state: '', // Will need to be parsed or set by caller
        owner_name: petStatus === 'lost' ? 'Pet Owner' : 'Shelter/Rescue', // Different default based on status
        shelter_id: shelterId || null
      };
      
      const { error } = await supabase
        .from('lost_pets')
        .insert(petData);
      
      if (error) {
        console.error(`[FB SCRAPER] Error saving pet:`, error.message);
      } else {
        saved++;
      }
    } catch (error: any) {
      console.error(`[FB SCRAPER] Error processing pet:`, error.message);
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
      facebookUrl,
      shelterId,
      maxPosts = 50
    } = body;
    
    if (!facebookUrl) {
      return NextResponse.json(
        { error: 'Facebook URL is required' },
        { status: 400 }
      );
    }
    
    console.log(`[FB SCRAPER] Scraping Facebook page: ${facebookUrl}`);
    
    // Scrape the Facebook page
    const { pets, error: scrapeError } = await scrapeFacebookShelterPage(facebookUrl, shelterId);
    
    if (scrapeError) {
      return NextResponse.json(
        { error: scrapeError, petsFound: 0, petsSaved: 0 },
        { status: 500 }
      );
    }
    
    // Limit to maxPosts
    const petsToSave = pets.slice(0, maxPosts);
    
    // Save pets to database
    const { saved, skipped } = await savePets(petsToSave, shelterId);
    
    // Update shelter's scan status and date if we saved any pets
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
    
    return NextResponse.json({
      success: true,
      petsFound: pets.length,
      petsSaved: saved,
      petsSkipped: skipped,
      message: `Found ${pets.length} pet posts, saved ${saved} new pets to database`
    });
    
  } catch (error: any) {
    console.error('[FB SCRAPER] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape Facebook page' },
      { status: 500 }
    );
  }
}

