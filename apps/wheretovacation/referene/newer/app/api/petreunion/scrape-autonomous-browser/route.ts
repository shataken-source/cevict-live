import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Facebook login credentials (from environment)
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

// Simple HTML parser - extracts pet info from HTML
function parsePetFromHTML(html: string, source: string = 'unknown'): ScrapedPet[] {
  const pets: ScrapedPet[] = [];
  
  console.log(`[HTML PARSER] Parsing HTML (${html.length} chars) from source: ${source}`);
  
  // Clean HTML
  const cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Extract JSON-LD structured data
  const jsonLdPattern = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  const jsonLdData: any[] = [];
  
  while ((jsonLdMatch = jsonLdPattern.exec(html)) !== null) {
    try {
      const jsonData = JSON.parse(jsonLdMatch[1]);
      if (Array.isArray(jsonData)) {
        jsonLdData.push(...jsonData);
      } else {
        jsonLdData.push(jsonData);
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  }
  
  // Extract from JSON-LD
  jsonLdData.forEach((item: any) => {
    if (item.name || item.headline) {
      const pet: ScrapedPet = {
        name: item.name || item.headline || 'Unknown',
        type: (item.category || '').toLowerCase().includes('cat') ? 'cat' : 'dog',
        breed: item.brand?.name || item.breed || 'Mixed Breed',
        description: item.description || '',
        photo_url: item.image || item.thumbnailUrl,
        status: 'found',
        source,
      };
      
      if (pet.name && pet.name !== 'Unknown') {
        pets.push(pet);
      }
    }
  });
  
  // Extract from HTML patterns - more comprehensive
  const namePatterns = [
    /<h[1-4][^>]*>([^<]+(?:dog|cat|puppy|kitten|pet)[^<]*)<\/h[1-4]>/gi,
    /"name"\s*:\s*"([^"]+)"/gi,
    /Name[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /<a[^>]*class="[^"]*pet[^"]*name[^"]*"[^>]*>([^<]+)<\/a>/gi,
    /<div[^>]*class="[^"]*pet[^"]*name[^"]*"[^>]*>([^<]+)<\/div>/gi,
    /<span[^>]*class="[^"]*pet[^"]*name[^"]*"[^>]*>([^<]+)<\/span>/gi,
  ];
  
  const breedPatterns = [
    /"breed"\s*:\s*"([^"]+)"/gi,
    /Breed[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+Mix)?)/gi,
    /<span[^>]*class="[^"]*breed[^"]*"[^>]*>([^<]+)<\/span>/gi,
    /<div[^>]*class="[^"]*breed[^"]*"[^>]*>([^<]+)<\/div>/gi,
  ];
  
  // Find pet cards/sections
  const petCardPattern = /<div[^>]*class="[^"]*pet[^"]*card[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
  const petSections: string[] = [];
  let match;
  
  while ((match = petCardPattern.exec(cleanHtml)) !== null) {
    petSections.push(match[0]);
  }
  
  // If no cards, treat entire page as one listing
  if (petSections.length === 0) {
    petSections.push(cleanHtml);
  }
  
  // Extract from each section
  petSections.forEach((section) => {
    const pet: Partial<ScrapedPet> = {
      name: 'Unknown',
      type: 'dog',
      breed: 'Mixed Breed',
      description: '',
      status: 'found',
      source,
    };
    
    // Extract name
    for (const pattern of namePatterns) {
      const nameMatch = pattern.exec(section);
      if (nameMatch && nameMatch[1] && nameMatch[1].length > 1 && nameMatch[1].length < 50) {
        pet.name = nameMatch[1].trim();
        break;
      }
    }
    
    // Extract breed
    for (const pattern of breedPatterns) {
      const breedMatch = pattern.exec(section);
      if (breedMatch && breedMatch[1]) {
        pet.breed = breedMatch[1].trim();
        break;
      }
    }
    
    // Determine type
    const sectionLower = section.toLowerCase();
    if (sectionLower.includes('cat') || sectionLower.includes('kitten')) {
      pet.type = 'cat';
    }
    
    // Determine status
    if (sectionLower.includes('lost') || sectionLower.includes('missing')) {
      pet.status = 'lost';
    }
    
    // Build description
    pet.description = `${pet.breed || 'Mixed Breed'}`;
    
    // Only add if valid name
    if (pet.name && pet.name !== 'Unknown' && pet.name.length > 1) {
      pets.push(pet as ScrapedPet);
    }
  });
  
  console.log(`[HTML PARSER] Extracted ${pets.length} pets from HTML`);
  return pets;
}

// Extract pets from visible text content
function extractPetsFromText(text: string): ScrapedPet[] {
  const pets: ScrapedPet[] = [];
  
  // Look for patterns like "Dog named Buddy" or "Lost cat: Fluffy"
  const petPatterns = [
    /(?:lost|found|adopt|looking for)\s+(?:a\s+)?(dog|cat|puppy|kitten)\s+(?:named|called)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+is\s+(?:a|an)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(dog|cat)/gi,
    /(dog|cat|puppy|kitten)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
  ];
  
  const seenNames = new Set<string>();
  
  for (const pattern of petPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const type = (match[1] || match[3] || 'dog').toLowerCase().includes('cat') ? 'cat' : 'dog';
      const name = match[2] || match[1];
      
      if (name && name.length > 1 && name.length < 30 && !seenNames.has(name)) {
        seenNames.add(name);
        pets.push({
          name: name.trim(),
          type: type as 'dog' | 'cat',
          breed: 'Mixed Breed',
          description: `Found via text extraction`,
          status: text.toLowerCase().includes('lost') ? 'lost' : 'found',
          source: 'adoptapet',
        });
      }
    }
  }
  
  return pets;
}

// Puppeteer browser automation
let puppeteer: any = null;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.log('[BROWSER] Puppeteer not available, will use fetch fallback');
}

async function scrapeAdoptAPetWithBrowser(location: string = 'Alabama'): Promise<ScrapedPet[]> {
  const pets: ScrapedPet[] = [];
  
  if (!puppeteer) {
    console.log('[ADOPTAPET] Puppeteer not available, skipping browser scraping');
    return pets;
  }
  
  console.log(`[ADOPTAPET] Starting browser scrape for: ${location}`);
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null,
    slowMo: 250 // Slow down for debugging
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    const url = `https://www.adoptapet.com/pet-search?location=${location}`;
    console.log(`[ADOPTAPET] Navigating to: ${url}`);
    
    // Navigate and wait for content - LONGER WAITS
    console.log(`[ADOPTAPET] Loading page: ${url}`);
    
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 60000 
      });
      console.log(`[ADOPTAPET] ✅ Page loaded`);
    } catch (e: any) {
      console.log(`[ADOPTAPET] ⚠️ Navigation timeout, trying domcontentloaded...`);
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
    }
    
    // Wait for JavaScript to render - MUCH LONGER
    console.log(`[ADOPTAPET] Waiting for content to render...`);
    await page.waitForTimeout(10000); // 10 seconds
    
    // Scroll multiple times to trigger lazy loading
    console.log(`[ADOPTAPET] Scrolling to load content...`);
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * (i + 1) / 3));
      await page.waitForTimeout(2000);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(3000);
    
    // Check what we actually have on the page
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyTextLength: document.body.innerText.length,
        petLinks: document.querySelectorAll('a[href*="/pet/"]').length,
        allLinks: document.querySelectorAll('a').length,
        hasPetText: document.body.innerText.toLowerCase().includes('dog') || 
                   document.body.innerText.toLowerCase().includes('cat')
      };
    });
    
    console.log(`[ADOPTAPET] Page info:`, JSON.stringify(pageInfo, null, 2));
    
    // Try to wait for pet links specifically
    try {
      await page.waitForSelector('a[href*="/pet/"]', { timeout: 15000 });
      console.log(`[ADOPTAPET] ✅ Found /pet/ links!`);
    } catch (e) {
      console.log(`[ADOPTAPET] ⚠️ No /pet/ links found after waiting`);
    }
    
    // Wait longer for page to fully load
    await page.waitForTimeout(3000);
    
    // Try multiple selectors to find pet listings
    const selectors = [
      'a[href*="/pet/"]',
      'a[href*="/pet"]',
      '.pet-card',
      '.animal-card',
      '[class*="pet"]',
      '[class*="animal"]',
      '[data-pet-id]',
      'article',
      '[role="article"]'
    ];
    
    let foundSelector = false;
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        console.log(`[ADOPTAPET] ✅ Found selector: ${selector}`);
        foundSelector = true;
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!foundSelector) {
      console.log('[ADOPTAPET] ⚠️ No standard selectors found, will try broader search...');
    }
    
    // Scroll to load more content (lazy loading)
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await page.waitForTimeout(2000);
    
    // Scroll to bottom
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(2000);
    
    // Scroll back to top
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1000);
    
    // Get page HTML
    const html = await page.content();
    console.log(`[ADOPTAPET] Got HTML (${html.length} chars)`);
    
    // Get visible text if not already got
    if (!visibleText) {
      try {
        visibleText = await page.evaluate(() => document.body.innerText || '');
      } catch (e) {
        visibleText = '';
      }
    }
    
    if (visibleText) {
      console.log(`[ADOPTAPET] Visible text length: ${visibleText.length} chars`);
      console.log(`[ADOPTAPET] Visible text preview: ${visibleText.substring(0, 500)}`);
      
      // Check if page has any pet-related content
      const hasPetContent = visibleText.toLowerCase().includes('dog') || 
                           visibleText.toLowerCase().includes('cat') ||
                           visibleText.toLowerCase().includes('pet') ||
                           visibleText.toLowerCase().includes('adopt');
      console.log(`[ADOPTAPET] Page has pet-related content: ${hasPetContent}`);
      
      if (!hasPetContent && visibleText.length < 500) {
        console.log(`[ADOPTAPET] ⚠️ Page may not have loaded correctly or is blocked`);
      }
    }
    
    // Save HTML to file for debugging (ALWAYS)
    try {
      const fs = require('fs');
      const path = require('path');
      const debugDir = path.join(process.cwd(), '.debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      const htmlFile = path.join(debugDir, `adoptapet-${Date.now()}.html`);
      fs.writeFileSync(htmlFile, html);
      console.log(`[ADOPTAPET] ✅ Saved HTML to: ${htmlFile}`);
      console.log(`[ADOPTAPET] 📁 File size: ${(html.length / 1024).toFixed(2)} KB`);
    } catch (e) {
      console.log(`[ADOPTAPET] ⚠️ Could not save HTML file: ${e.message}`);
    }
    
    // Check if page has pet content
    const hasPetContent = html.toLowerCase().includes('pet') || 
                         html.toLowerCase().includes('dog') || 
                         html.toLowerCase().includes('cat') ||
                         html.toLowerCase().includes('adopt');
    console.log(`[ADOPTAPET] Page has pet-related content: ${hasPetContent}`);
    
    // Get visible text for text extraction
    let visibleText = '';
    try {
      visibleText = await page.evaluate(() => document.body.innerText || '');
    } catch (e) {
      console.log(`[ADOPTAPET] Could not get visible text: ${e}`);
    }
    
    // Try to extract pets using page.evaluate - MATCH ACTUAL ADOPTAPET STRUCTURE
    try {
      const result = await page.evaluate(() => {
        const pets: any[] = [];
        
        // Based on actual screenshots: Find pet cards that contain /pet/ links
        // Each card has: image, name, breed, age, location, and link to /pet/ URL
        const allPetLinks = document.querySelectorAll('a[href*="/pet/"]');
        console.log('Found /pet/ links:', allPetLinks.length);
        
        // Debug: Log first few links to see what we're getting
        if (allPetLinks.length > 0) {
          console.log('First 3 links:');
          for (let i = 0; i < Math.min(3, allPetLinks.length); i++) {
            const link = allPetLinks[i];
            console.log(`  Link ${i}: ${link.href}, text: "${link.textContent?.trim().substring(0, 50)}"`);
          }
        } else {
          // Try to find ANY links to see what's on the page
          const allLinks = document.querySelectorAll('a');
          console.log('Total links on page:', allLinks.length);
          if (allLinks.length > 0) {
            console.log('First 5 links (any):');
            for (let i = 0; i < Math.min(5, allLinks.length); i++) {
              const link = allLinks[i];
              console.log(`  Link ${i}: ${link.href?.substring(0, 80)}, text: "${link.textContent?.trim().substring(0, 30)}"`);
            }
          }
        }
        
        // Process each pet link and extract data from its parent card
        allPetLinks.forEach((link: any) => {
          try {
            const href = link.href;
            if (!href || !href.includes('/pet/')) {
              return; // Skip invalid links
            }
            
            // Find the parent card/container
            const card = link.closest('article, div[class*="card"], div[class*="pet"], div[class*="listing"], section, li') || link.parentElement;
            if (!card) {
              return;
            }
            
            const cardText = card.textContent || card.innerText || '';
            const cardHtml = card.innerHTML || '';
            
            // Extract pet name - usually the link text or a heading in the card
            let petName = '';
            const linkText = link.textContent?.trim() || '';
            
            // Try to find name in various places
            const nameElement = card.querySelector('h1, h2, h3, h4, [class*="name"], strong, b');
            if (nameElement) {
              const nameText = nameElement.textContent?.trim() || '';
              if (nameText && nameText.length > 1 && nameText.length < 50 && nameText.match(/^[A-Z]/)) {
                petName = nameText;
              }
            }
            
            // If no name found, try link text
            if (!petName && linkText && linkText.length > 1 && linkText.length < 50 && linkText.match(/^[A-Z]/)) {
              petName = linkText;
            }
            
            // If still no name, try first capitalized word in card
            if (!petName) {
              const nameMatch = cardText.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
              if (nameMatch && nameMatch[1].length > 1) {
                petName = nameMatch[1];
              }
            }
            
            if (!petName || petName.length < 2) {
              return; // Skip if no valid name
            }
            
            // Extract breed - look for "Breed:" pattern or common breeds
            let breed = 'Mixed Breed';
            const breedPatterns = [
              /Breed[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+Mix|Mix Breed|Mixed)?)/i,
              /(Spaniel|Labrador|Golden|German Shepherd|Pit Bull|Beagle|Boxer|Bulldog|Poodle|Chihuahua|Dachshund|Husky|Malamute|Retriever|Terrier|Setter|Pointer|Collie|Corgi|Pomeranian|Shih Tzu|Yorkshire|Boston|French|English|American|Staffordshire|Pit|Bull|Pug|Basset|Bloodhound|Coonhound|Foxhound|Greyhound|Whippet|Saluki|Afghan|Borzoi|Irish|Scottish|Welsh|Persian|Siamese|Maine Coon|Ragdoll|British Shorthair|Abyssinian|Bengal|Russian Blue|Australian Cattle Dog|Mixed Breed|Mix)/i
            ];
            
            for (const pattern of breedPatterns) {
              const match = cardText.match(pattern);
              if (match && match[1]) {
                breed = match[1].trim();
                break;
              }
            }
            
            // Determine type (dog or cat)
            let type: 'dog' | 'cat' = 'dog';
            const lowerText = cardText.toLowerCase();
            if (lowerText.includes('cat') || lowerText.includes('kitten') || lowerText.includes('feline')) {
              type = 'cat';
            }
            
            // Extract age
            let age = '';
            const ageMatch = cardText.match(/(\d+\s+(?:year|month|yr|mo|old)[\s,]*\d*\s*(?:year|month|yr|mo)?)/i);
            if (ageMatch) {
              age = ageMatch[1].trim();
            }
            
            // Extract location (format: "Location: City, State" or "City, State")
            let locationCity = 'Unknown';
            let locationState = 'AL';
            const locationPatterns = [
              /Location[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[,\s]+([A-Z]{2})/i,
              /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[,\s]+([A-Z]{2})/i
            ];
            
            for (const pattern of locationPatterns) {
              const match = cardText.match(pattern);
              if (match && match[1] && match[2]) {
                locationCity = match[1].trim();
                locationState = match[2].trim();
                break;
              }
            }
            
            // Get image
            let photoUrl = '';
            const img = card.querySelector('img');
            if (img && img.src && !img.src.includes('data:image') && img.src.length > 10) {
              photoUrl = img.src;
            }
            
            // Build description
            const description = `${breed}${age ? `, ${age}` : ''}. ${cardText.substring(0, 200).trim()}`;
            
            pets.push({
              name: petName,
              type: type,
              breed: breed,
              age: age,
              description: description,
              status: 'found',
              source: 'adoptapet',
              source_url: href,
              location_city: locationCity,
              location_state: locationState,
              photo_url: photoUrl || undefined
            });
          } catch (e) {
            console.error('Error processing pet link:', e);
          }
        });
        
        return { pets, counts: { links: allPetLinks.length, cards: 0, images: 0, petRelatedLinks: 0 } };
        
        // Return counts for logging (outside evaluate)
        const counts = {
          links: petLinks.length,
          cards: petCards.length,
          images: petImages.length,
          petRelatedLinks: petRelatedLinks.length
        };
        
        // Also process pet-related links
        petRelatedLinks.forEach((link: any) => {
          try {
            const pet: any = {
              name: 'Unknown',
              type: 'dog',
              breed: 'Mixed Breed',
              description: '',
              status: 'found',
              source: 'adoptapet',
              source_url: link.href || '',
            };
            
            const linkText = (link.textContent || link.innerText || '').trim();
            if (linkText && linkText.length > 1 && linkText.length < 100) {
              // Extract name from link text
              const nameMatch = linkText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
              if (nameMatch) {
                pet.name = nameMatch[1];
              } else {
                pet.name = linkText.substring(0, 30);
              }
              
              // Determine type
              if (linkText.toLowerCase().includes('cat') || linkText.toLowerCase().includes('kitten')) {
                pet.type = 'cat';
              }
              
              pets.push(pet);
            }
          } catch (e) {
            // Skip errors
          }
        });
        
        console.log('Found pet links:', petLinks.length);
        console.log('Found pet cards:', petCards.length);
        console.log('Found pet images:', petImages.length);
        console.log('Found pet-related links:', petRelatedLinks.length);
        
        // Process pet links
        petLinks.forEach((link: any, index: number) => {
          if (index < 5) { // Log first 5
            console.log(`Link ${index}:`, link.href, link.textContent?.substring(0, 50));
          }
          try {
            const pet: any = {
              name: 'Unknown',
              type: 'dog',
              breed: 'Mixed Breed',
              description: '',
              status: 'found',
              source: 'adoptapet',
              source_url: link.href || '',
            };
            
            // Try to get name from link text or nearby elements
            const linkText = link.textContent?.trim() || link.innerText?.trim() || '';
            if (linkText && linkText.length > 1 && linkText.length < 50 && !linkText.includes('http')) {
              pet.name = linkText;
            }
            
            // Look for breed in parent container
            const container = link.closest('div, article, section, li, .pet-card, .animal-card');
            if (container) {
              const containerText = container.textContent || container.innerText || '';
              
              // Extract breed (more patterns)
              const breedPatterns = [
                /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+Mix|Mix Breed|Mixed)?)/,
                /(Labrador|Golden|German Shepherd|Pit Bull|Beagle|Boxer|Bulldog|Poodle|Chihuahua|Dachshund|Husky|Malamute|Retriever|Terrier|Spaniel|Setter|Pointer|Collie|Corgi|Pomeranian|Shih Tzu|Yorkshire|Boston|French|English|American|Staffordshire|Pit|Bull|Pug|Basset|Bloodhound|Coonhound|Foxhound|Greyhound|Whippet|Saluki|Afghan|Borzoi|Irish|Scottish|Welsh|Persian|Siamese|Maine Coon|Ragdoll|British Shorthair|Abyssinian|Bengal|Russian Blue|Mix|Mixed|Mutt)/i
              ];
              
              for (const pattern of breedPatterns) {
                const breedMatch = containerText.match(pattern);
                if (breedMatch && breedMatch[1]) {
                  pet.breed = breedMatch[1].trim();
                  break;
                }
              }
              
              // Determine type
              const lowerText = containerText.toLowerCase();
              if (lowerText.includes('cat') || lowerText.includes('kitten') || lowerText.includes('feline')) {
                pet.type = 'cat';
              }
              
              // Get image
              const img = container.querySelector('img') || link.querySelector('img');
              if (img && img.src && !img.src.includes('data:image')) {
                pet.photo_url = img.src;
              }
              
              // Get description
              const desc = containerText.substring(0, 200).trim();
              if (desc) {
                pet.description = desc;
              }
            }
            
            // Only add if we have at least a name or URL
            // Be more lenient - accept any link that looks like a pet link
            const hasValidName = pet.name && pet.name !== 'Unknown' && pet.name.length > 1;
            const hasPetUrl = pet.source_url && (pet.source_url.includes('/pet/') || pet.source_url.includes('pet') || pet.source_url.includes('animal') || pet.source_url.includes('adopt'));
            
            if (hasValidName || hasPetUrl) {
              // If no name but has URL, create a name from URL
              if (!hasValidName && hasPetUrl) {
                const urlParts = pet.source_url.split('/').filter((p: string) => p);
                const lastPart = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
                if (lastPart && lastPart.length > 2) {
                  pet.name = lastPart.replace(/[-_]/g, ' ').replace(/\d+/g, '').trim() || 'Pet';
                } else {
                  pet.name = 'Pet';
                }
              }
              pets.push(pet);
            }
          } catch (e) {
            // Silently skip errors
          }
        });
        
        // Also process pet cards directly
        petCards.forEach((card: any) => {
          try {
            const cardText = card.textContent || card.innerText || '';
            if (!cardText.toLowerCase().includes('dog') && !cardText.toLowerCase().includes('cat') && !cardText.toLowerCase().includes('pet')) {
              return; // Skip if not pet-related
            }
            
            const link = card.querySelector('a[href*="/pet/"], a[href*="pet-"]');
            if (link) {
              // Already processed via link, skip
              return;
            }
            
            const pet: any = {
              name: 'Unknown',
              type: 'dog',
              breed: 'Mixed Breed',
              description: cardText.substring(0, 200),
              status: 'found',
              source: 'adoptapet',
              source_url: '',
            };
            
            // Extract name
            const nameMatch = cardText.match(/(?:Name|Pet)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
            if (nameMatch) {
              pet.name = nameMatch[1];
            }
            
            // Extract breed
            const breedMatch = cardText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+Mix)?)/);
            if (breedMatch) {
              pet.breed = breedMatch[1];
            }
            
            // Get image
            const img = card.querySelector('img');
            if (img && img.src) {
              pet.photo_url = img.src;
            }
            
            if (pet.name !== 'Unknown') {
              pets.push(pet);
            }
          } catch (e) {
            // Silently skip errors
          }
        });
        
        return { pets, counts };
      });
      
      const pagePets = result.pets || [];
      const counts = result.counts || { links: 0, cards: 0, images: 0, petRelatedLinks: 0 };
      
      console.log(`[ADOPTAPET] 📊 Found:`);
      console.log(`   • ${counts.links} /pet/ links found`);
      console.log(`[ADOPTAPET] Extracted ${pagePets.length} pets using page.evaluate`);
      
      if (pagePets.length > 0) {
        console.log(`[ADOPTAPET] ✅ Sample pet:`, JSON.stringify(pagePets[0], null, 2));
      } else if (counts.links > 0) {
        console.log(`[ADOPTAPET] ⚠️ Found ${counts.links} /pet/ links but couldn't extract pet data`);
        console.log(`[ADOPTAPET] This means the page structure might be different than expected`);
      } else {
        console.log(`[ADOPTAPET] ⚠️ No /pet/ links found at all - page might not have loaded or structure changed`);
      }
      
      if (pagePets.length > 0) {
        pets.push(...pagePets);
        console.log(`[ADOPTAPET] ✅ Successfully extracted pets!`);
      } else {
        console.log(`[ADOPTAPET] ⚠️ No pets extracted - trying alternative methods...`);
        
        // Try extracting from visible text
        const textPets = extractPetsFromText(visibleText);
        if (textPets.length > 0) {
          console.log(`[ADOPTAPET] Found ${textPets.length} pets from text extraction`);
          pets.push(...textPets);
        }
      }
    } catch (e: any) {
      console.log(`[ADOPTAPET] page.evaluate failed: ${e.message}`);
    }
    
    // Also try HTML parsing as fallback
    const foundPets = await parsePetFromHTML(html, 'adoptapet');
    console.log(`[ADOPTAPET] HTML parser found ${foundPets.length} pets`);
    
    // Merge results, avoiding duplicates
    foundPets.forEach(foundPet => {
      if (!pets.some(p => p.name === foundPet.name && p.source_url === foundPet.source_url)) {
        pets.push(foundPet);
      }
    });
    
    console.log(`[ADOPTAPET] Total unique pets found: ${pets.length}`);
    if (pets.length > 0) {
      console.log(`[ADOPTAPET] Sample pet: ${JSON.stringify(pets[0])}`);
    } else {
      console.log(`[ADOPTAPET] No pets found. Checking HTML structure...`);
      // Look for common pet listing indicators
      const petIndicators = [
        html.match(/pet-card/gi)?.length || 0,
        html.match(/animal-card/gi)?.length || 0,
        html.match(/pet-name/gi)?.length || 0,
        html.match(/adoptapet/gi)?.length || 0,
        html.match(/\/pet\//gi)?.length || 0,
      ];
      console.log(`[ADOPTAPET] Pet indicators found: ${petIndicators.join(', ')}`);
    }
    
    // Try to find and click "Load More" or pagination
    try {
      const loadMoreButton = await page.$('button:has-text("Load More"), a:has-text("Next"), button[aria-label*="more"]');
      if (loadMoreButton) {
        await loadMoreButton.click();
        await page.waitForTimeout(2000);
        const moreHtml = await page.content();
        const morePets = await parsePetFromHTML(moreHtml, 'adoptapet');
        pets.push(...morePets);
      }
    } catch (e) {
      // No load more button, that's fine
    }
    
    console.log(`[ADOPTAPET] Found ${pets.length} pets before fallback`);
    
    // NO FALLBACK PETS - Only real pets from the website
    if (pets.length === 0) {
      console.log(`[ADOPTAPET] ⚠️ No real pets found. Need to fix scraper selectors.`);
    }
    
    console.log(`[ADOPTAPET] Final count: ${pets.length} pets`);
    
    // Keep browser open for 5 seconds for debugging
    if (pets.length === 0) {
      console.log(`[ADOPTAPET] No pets found - keeping browser open for 5 seconds for inspection...`);
      await page.waitForTimeout(5000);
    }
  
  } catch (error: any) {
    console.error(`[ADOPTAPET] Error:`, error.message);
    console.error(`[ADOPTAPET] Error stack:`, error.stack);
    
    // NO TEST PETS - Only real pets
    if (pets.length === 0) {
      console.log(`[ADOPTAPET] ❌ No real pets found after error. Scraper needs fixing.`);
    }
  } finally {
    console.log(`[ADOPTAPET] Closing browser...`);
    console.log(`[ADOPTAPET] Returning ${pets.length} pets`);
    await browser.close();
  }
  
  // NO FALLBACK - Only return real pets found
  if (pets.length === 0) {
    console.log(`[ADOPTAPET] ❌ No real pets found. Scraper needs fixing.`);
  }
  
  // Ensure all pets have required fields (only for real pets)
  pets.forEach((pet, index) => {
    if (!pet.location_city) pet.location_city = 'Birmingham';
    if (!pet.location_state) pet.location_state = 'AL';
    if (!pet.color) pet.color = 'N/A';
    if (!pet.size) pet.size = 'medium';
    if (!pet.description) pet.description = `Found via AdoptAPet scraper`;
    console.log(`[ADOPTAPET] Real pet ${index + 1} validated:`, {
      name: pet.name,
      type: pet.type,
      breed: pet.breed,
      status: pet.status,
      location: `${pet.location_city}, ${pet.location_state}`,
      source_url: pet.source_url
    });
  });
  
  return pets;
}

async function scrapeFacebookShelters(durationMinutes: number = 10): Promise<ScrapedPet[]> {
  const pets: ScrapedPet[] = [];
  
  if (!puppeteer) {
    console.log('[FACEBOOK] Puppeteer not available, skipping Facebook scraping');
    return pets;
  }
  
  if (!FACEBOOK_EMAIL || !FACEBOOK_PASSWORD) {
    console.log('[FACEBOOK] Facebook credentials not configured');
    return pets;
  }
  
  console.log(`[FACEBOOK] Starting Facebook shelter search (${durationMinutes} minutes)`);
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Login to Facebook
    console.log('[FACEBOOK] Logging in to Facebook...');
    await page.goto('https://www.facebook.com/login', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    
    // Enter email
    await page.type('input[name="email"], input[type="email"], input[id="email"]', FACEBOOK_EMAIL, { delay: 100 });
    await page.waitForTimeout(1000);
    
    // Enter password
    await page.type('input[name="pass"], input[type="password"], input[id="pass"]', FACEBOOK_PASSWORD, { delay: 100 });
    await page.waitForTimeout(1000);
    
    // Click login
    await page.click('button[type="submit"], button[name="login"], button[id="loginbutton"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    console.log('[FACEBOOK] Logged in successfully');
    
    // Check if profile switching is needed (for "fishy" profile)
    try {
      // Look for profile switcher or account menu
      const profileSwitcher = await page.$('div[aria-label*="Account"], div[aria-label*="Profile"], a[href*="/profile"]');
      if (profileSwitcher) {
        console.log('[FACEBOOK] Checking for profile switcher...');
        // Try to find and click on "fishy" profile if available
        const fishyProfile = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*="/profile"], a[href*="/user"]'));
          const fishy = links.find((link: any) => 
            link.textContent?.toLowerCase().includes('fishy') || 
            link.getAttribute('aria-label')?.toLowerCase().includes('fishy')
          );
          return fishy ? (fishy as HTMLElement).getAttribute('href') : null;
        });
        
        if (fishyProfile) {
          console.log('[FACEBOOK] Switching to fishy profile...');
          await page.goto(`https://www.facebook.com${fishyProfile}`, { waitUntil: 'networkidle2' });
          await page.waitForTimeout(2000);
        }
      }
    } catch (e) {
      console.log('[FACEBOOK] Profile switching not needed or not available');
    }
    
    // Search for animal shelters
    const searchQueries = [
      'animal shelters',
      'pet rescue',
      'lost and found pets',
      'animal adoption',
      'pet shelter'
    ];
    
    const startTime = Date.now();
    const endTime = startTime + (durationMinutes * 60 * 1000);
    let processedPages = 0;
    
    for (const query of searchQueries) {
      if (Date.now() >= endTime) {
        console.log('[FACEBOOK] Time limit reached');
        break;
      }
      
      console.log(`[FACEBOOK] Searching for: ${query}`);
      
      // Navigate to Facebook search
      await page.goto(`https://www.facebook.com/search/pages/?q=${encodeURIComponent(query)}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      await page.waitForTimeout(3000);
      
      // Scroll to load more results
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(2000);
      
      // Find all result links
      const resultLinks = await page.evaluate(() => {
        const links: string[] = [];
        // Find page/profile links in search results
        document.querySelectorAll('a[href*="/pages/"], a[href*="/groups/"], a[href*="/profile.php"]').forEach((link: any) => {
          if (link.href && !links.includes(link.href)) {
            links.push(link.href);
          }
        });
        return links.slice(0, 20); // Limit to 20 results per query
      });
      
      console.log(`[FACEBOOK] Found ${resultLinks.length} results for "${query}"`);
      
      // Visit each result page
      for (const link of resultLinks) {
        if (Date.now() >= endTime) {
          break;
        }
        
        try {
          console.log(`[FACEBOOK] Visiting: ${link}`);
          await page.goto(link, { waitUntil: 'networkidle2', timeout: 20000 });
          await page.waitForTimeout(2000);
          
          // Scroll to load content
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight / 2);
          });
          await page.waitForTimeout(1000);
          
          // Get page HTML
          const html = await page.content();
          
          // Parse pets from HTML
          const foundPets = await parsePetFromHTML(html, 'facebook');
          
          if (foundPets.length > 0) {
            console.log(`[FACEBOOK] Found ${foundPets.length} pets on this page`);
            pets.push(...foundPets);
          }
          
          processedPages++;
          
          // Small delay between pages
          await page.waitForTimeout(1000);
          
        } catch (error: any) {
          console.error(`[FACEBOOK] Error visiting ${link}:`, error.message);
          continue;
        }
      }
    }
    
    console.log(`[FACEBOOK] Processed ${processedPages} pages, found ${pets.length} pets total`);
    
  } catch (error: any) {
    console.error(`[FACEBOOK] Error:`, error.message);
  } finally {
    await browser.close();
  }
  
  return pets;
}

// Save pets to database
async function savePets(pets: ScrapedPet[]): Promise<{ saved: number; skipped: number; errors: number }> {
  if (!supabase) {
    throw new Error('Database not configured');
  }
  
  let saved = 0;
  let skipped = 0;
  let errors = 0;
  
  console.log(`[SAVE] Attempting to save ${pets.length} pets...`);
  
  for (const pet of pets) {
    try {
      // Validate pet data
      if (!pet.name || pet.name === 'Unknown') {
        console.log(`[SAVE] ⚠️ Skipping pet with invalid name: ${pet.name}`);
        skipped++;
        continue;
      }
      
      console.log(`[SAVE] Processing pet: ${pet.name} (${pet.type}, ${pet.breed})`);
      
      // Check for duplicates (simplified - just check name)
      const { data: existing, error: checkError } = await supabase
        .from('lost_pets')
        .select('id')
        .eq('pet_name', pet.name)
        .limit(1)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error(`[SAVE] Error checking duplicates:`, checkError.message);
      }
      
      if (existing) {
        console.log(`[SAVE] ⏭️ Skipping duplicate: ${pet.name}`);
        skipped++;
        continue;
      }
      
      // Determine date - schema requires date_lost, but we can use it for both lost and found
      const dateValue = new Date().toISOString().split('T')[0];
      
      // Prepare insert data - date_lost is required by schema
      const insertData: any = {
        pet_name: pet.name || 'Unknown',
        pet_type: pet.type || 'dog',
        breed: pet.breed || 'Mixed Breed',
        color: pet.color || 'N/A',
        size: pet.size || 'medium',
        description: pet.description || `Found via scraper`,
        photo_url: pet.photo_url || null,
        status: pet.status || 'found',
        location_city: pet.location_city || 'Unknown',
        location_state: pet.location_state || 'AL',
        date_lost: dateValue, // Required field - use for both lost and found
        owner_name: 'Community',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // If it's a found pet, we might want to add date_found if the column exists
      // But for now, use date_lost for both since it's required
      
      console.log(`[SAVE] Inserting pet data:`, JSON.stringify(insertData, null, 2));
      
      // Save pet
      const { data: insertedData, error: insertError } = await supabase
        .from('lost_pets')
        .insert(insertData)
        .select();
      
      if (insertError) {
        console.error(`[SAVE] ❌ Error saving ${pet.name}:`, insertError.message);
        console.error(`[SAVE] Error code:`, insertError.code);
        console.error(`[SAVE] Error details:`, JSON.stringify(insertError, null, 2));
        errors++;
      } else {
        saved++;
        console.log(`[SAVE] ✅ Saved: ${pet.name} (${pet.type}, ${pet.breed}) - ID: ${insertedData?.[0]?.id}`);
      }
    } catch (error: any) {
      console.error(`[SAVE] ❌ Exception processing ${pet.name}:`, error.message);
      console.error(`[SAVE] Stack:`, error.stack);
      errors++;
    }
  }
  
  console.log(`[SAVE] Summary: ${saved} saved, ${skipped} skipped, ${errors} errors`);
  
  return { saved, skipped, errors };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    if (!puppeteer) {
      return NextResponse.json(
        { error: 'Puppeteer not available. Install with: pnpm add puppeteer' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      sources = ['adoptapet', 'facebook'],
      location = 'Alabama',
      durationMinutes = 10
    } = body;

    console.log(`[AUTONOMOUS-BROWSER] Starting browser-based scraper...`);
    console.log(`[AUTONOMOUS-BROWSER] Sources: ${sources.join(', ')}`);
    console.log(`[AUTONOMOUS-BROWSER] Location: ${location}`);
    console.log(`[AUTONOMOUS-BROWSER] Duration: ${durationMinutes} minutes`);

    const allPets: ScrapedPet[] = [];
    const results: any[] = [];

    // Scrape AdoptAPet
    if (sources.includes('adoptapet')) {
      try {
        console.log(`[AUTONOMOUS-BROWSER] Scraping AdoptAPet...`);
        const adoptapetPets = await scrapeAdoptAPetWithBrowser(location);
        allPets.push(...adoptapetPets);
        
        results.push({
          source: 'AdoptAPet',
          success: true,
          petsFound: adoptapetPets.length,
          petsSaved: 0
        });
      } catch (error: any) {
        console.error(`[AUTONOMOUS-BROWSER] AdoptAPet error:`, error.message);
        results.push({
          source: 'AdoptAPet',
          success: false,
          petsFound: 0,
          petsSaved: 0,
          error: error.message
        });
      }
    }

    // Scrape Facebook - try API first, fallback to browser
    if (sources.includes('facebook')) {
      try {
        console.log(`[AUTONOMOUS-BROWSER] Scraping Facebook...`);
        
        let facebookPets: ScrapedPet[] = [];
        let usedApi = false;
        
        // Try Facebook Graph API first (faster, more reliable)
        const facebookApiUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'}/api/petreunion/scrape-facebook-api`;
        const hasApiCredentials = process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET;
        
        if (hasApiCredentials) {
          try {
            console.log(`[AUTONOMOUS-BROWSER] Trying Facebook Graph API...`);
            const apiResponse = await fetch(facebookApiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                queries: ['animal shelters', 'pet rescue', 'lost and found pets', 'animal adoption'],
                location: 'Alabama',
                durationMinutes: Math.min(durationMinutes, 5) // Limit API calls to 5 min
              })
            });
            
            if (apiResponse.ok) {
              const apiData = await apiResponse.json();
              if (apiData.success && apiData.summary && apiData.summary.totalFound > 0) {
                console.log(`[AUTONOMOUS-BROWSER] Facebook API found ${apiData.summary.totalFound} pets`);
                usedApi = true;
                
                // Convert API pets to ScrapedPet format
                if (apiData.pets && Array.isArray(apiData.pets) && apiData.pets.length > 0) {
                  facebookPets = apiData.pets.map((pet: any) => ({
                    name: pet.name || 'Unknown',
                    type: pet.type || 'dog',
                    breed: pet.breed || 'Mixed Breed',
                    age: pet.age,
                    gender: pet.gender,
                    size: pet.size,
                    color: pet.color,
                    photo_url: pet.photo_url,
                    description: pet.description || '',
                    status: pet.status || 'found',
                    location_city: pet.location_city,
                    location_state: pet.location_state,
                    source: 'facebook',
                    source_url: pet.post_url || pet.source_url
                  }));
                } else {
                  console.log(`[AUTONOMOUS-BROWSER] Facebook API returned no pets in response`);
                }
              } else {
                console.log(`[AUTONOMOUS-BROWSER] Facebook API returned: ${apiData.error || 'no pets found'}`);
              }
            } else {
              const errorData = await apiResponse.json().catch(() => ({}));
              console.log(`[AUTONOMOUS-BROWSER] Facebook API error: ${errorData.error || apiResponse.statusText}`);
            }
          } catch (apiError: any) {
            console.log(`[AUTONOMOUS-BROWSER] Facebook API not available: ${apiError.message}`);
          }
        } else {
          console.log(`[AUTONOMOUS-BROWSER] Facebook API credentials not configured, using browser scraping`);
        }
        
        // Fallback to browser scraping if API didn't work or found no pets
        if (!usedApi || facebookPets.length === 0) {
          console.log(`[AUTONOMOUS-BROWSER] Using browser scraping for Facebook...`);
          const browserPets = await scrapeFacebookShelters(durationMinutes);
          facebookPets = browserPets;
        }
        
        allPets.push(...facebookPets);
        
        results.push({
          source: `Facebook (${usedApi ? 'API' : 'Browser'})`,
          success: true,
          petsFound: facebookPets.length,
          petsSaved: 0
        });
      } catch (error: any) {
        console.error(`[AUTONOMOUS-BROWSER] Facebook error:`, error.message);
        results.push({
          source: 'Facebook',
          success: false,
          petsFound: 0,
          petsSaved: 0,
          error: error.message
        });
      }
    }

    // Save all pets
    console.log(`[AUTONOMOUS-BROWSER] Saving ${allPets.length} pets to database...`);
    let saveResult;
    try {
      saveResult = await savePets(allPets);
    } catch (saveError: any) {
      console.error(`[AUTONOMOUS-BROWSER] Save function error:`, saveError.message);
      console.error(`[AUTONOMOUS-BROWSER] Save error stack:`, saveError.stack);
      saveResult = { saved: 0, skipped: 0, errors: allPets.length };
    }
    
    // Update results
    results.forEach(result => {
      if (result.success) {
        const sourcePets = allPets.filter(p => p.source.toLowerCase() === result.source.toLowerCase());
        result.petsSaved = Math.round((saveResult.saved / allPets.length) * sourcePets.length) || 0;
      }
    });

    const totalDuration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      summary: {
        totalFound: allPets.length,
        totalSaved: saveResult.saved,
        totalSkipped: saveResult.skipped,
        totalErrors: saveResult.errors,
        duration: totalDuration
      },
      results,
      message: `Scraped ${allPets.length} pets, saved ${saveResult.saved} to database`
    });

  } catch (error: any) {
    console.error('[AUTONOMOUS-BROWSER] Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to scrape',
        success: false 
      },
      { status: 500 }
    );
  }
}

