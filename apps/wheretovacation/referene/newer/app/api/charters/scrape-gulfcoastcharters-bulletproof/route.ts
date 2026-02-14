import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

interface ScrapedBoat {
  name: string;
  captain?: string;
  captain_full_name?: string; // Full name for verification
  business_name?: string; // Business/company name
  website?: string; // Website URL
  license_number?: string; // Captain license number if found
  boat_type?: string;
  length?: string;
  capacity?: number;
  location?: string;
  location_city?: string;
  location_state?: string;
  phone?: string;
  email?: string;
  description?: string;
  photos?: string[];
  price?: string;
  hourly_rate?: number;
  half_day_rate?: number;
  full_day_rate?: number;
  source: string;
  source_url?: string;
  home_port?: string;
  verification_info?: string; // Additional info that helps verify ownership
}

interface ScrapeResult {
  success: boolean;
  strategy: string;
  boatsFound: number;
  boatsSaved: number;
  errors: string[];
  duration: number;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[RETRY] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error('Max retries exceeded');
}

// ============================================
// HELPER FUNCTIONS FOR EXTRACTION
// ============================================

// Enhanced captain extraction - gets multiple pieces of identifying info
function extractCaptainInfo(title: string, content: string): {
  captain?: string;
  captain_full_name?: string;
  business_name?: string;
  license_number?: string;
  website?: string;
  verification_info?: string;
} {
  const result: {
    captain?: string;
    captain_full_name?: string;
    business_name?: string;
    license_number?: string;
    website?: string;
    verification_info?: string;
  } = {};
  
  const fullContent = `${title} ${content}`;
  
  // Extract full captain name (with "Captain" or "Capt.")
  const captainFullMatch = fullContent.match(/(?:captain|capt\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)?)/i);
  if (captainFullMatch) {
    result.captain = captainFullMatch[1];
    result.captain_full_name = captainFullMatch[1];
  }
  
  // Extract business/company name
  const businessPatterns = [
    /(?:charters|charter|fishing|excursions?)\s+([A-Z][a-zA-Z\s&]+)/i,
    /([A-Z][a-zA-Z\s&]+)\s+(?:charters|charter|fishing)/i,
    /business[:\s]+([A-Z][a-zA-Z\s&]+)/i,
    /company[:\s]+([A-Z][a-zA-Z\s&]+)/i
  ];
  
  for (const pattern of businessPatterns) {
    const match = fullContent.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      result.business_name = match[1].trim();
      break;
    }
  }
  
  // Extract license number (USCG, Coast Guard, etc.)
  const licensePatterns = [
    /(?:license|uscg|coast\s+guard)[#:\s]+([A-Z0-9-]+)/i,
    /(?:uscg|captain['s]? license)[:\s]+([A-Z0-9-]+)/i,
    /\b([A-Z]{2,}\d{6,})\b/ // Generic license pattern
  ];
  
  for (const pattern of licensePatterns) {
    const match = fullContent.match(pattern);
    if (match && match[1] && match[1].length >= 6) {
      result.license_number = match[1];
      break;
    }
  }
  
  // Extract website URL
  const websitePatterns = [
    /(?:website|site|web)[:\s]+(https?:\/\/[^\s]+)/i,
    /(?:visit|check|see)\s+(?:us|me|my\s+site)[\s:]+(https?:\/\/[^\s]+)/i,
    /(https?:\/\/(?:www\.)?[a-zA-Z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?)/g
  ];
  
  for (const pattern of websitePatterns) {
    const match = fullContent.match(pattern);
    if (match && match[1]) {
      result.website = match[1];
      break;
    }
  }
  
  // Build verification info string with key identifying details
  const verificationParts: string[] = [];
  if (result.captain_full_name) verificationParts.push(`Captain: ${result.captain_full_name}`);
  if (result.business_name) verificationParts.push(`Business: ${result.business_name}`);
  if (result.license_number) verificationParts.push(`License: ${result.license_number}`);
  if (result.website) verificationParts.push(`Website: ${result.website}`);
  
  if (verificationParts.length > 0) {
    result.verification_info = verificationParts.join(' | ');
  }
  
  // Fallback: if no captain name found, try simpler patterns
  if (!result.captain) {
    const simpleNameMatch = title.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (simpleNameMatch) {
      result.captain = simpleNameMatch[1];
    }
  }
  
  return result;
}

function parsePrice(priceText: string): number | undefined {
  const match = priceText.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  return match ? parseFloat(match[1].replace(/,/g, '')) : undefined;
}

// ============================================
// SCRAPING FUNCTIONS (Based on enhanced-smart-scraper.js patterns)
// ============================================

async function scrapeHullTruth(maxBoats: number): Promise<ScrapedBoat[]> {
  const boats: ScrapedBoat[] = [];
  const baseUrl = 'https://www.thehulltruth.com';
  
  try {
    const response = await fetch(`${baseUrl}/boating-forum/charter-boat-business/`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const html = await response.text();
    
    // Parse HTML (in browser we'd use DOMParser, but in Node.js we need regex)
    const threadPattern = /<div[^>]*class="[^"]*discussionListItem[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
    const threads = html.match(threadPattern) || [];
    
    for (const threadHtml of threads.slice(0, maxBoats)) {
      try {
        const titleMatch = threadHtml.match(/<a[^>]*class="[^"]*title[^"]*"[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/i);
        if (!titleMatch) continue;
        
        const title = titleMatch[2].trim();
        const threadUrl = titleMatch[1];
        
        if (!title.match(/charter|fishing|boat|captain/i)) continue;
        
        // Fetch thread details
        const threadResponse = await fetch(`${baseUrl}${threadUrl}`);
        const threadHtml = await threadResponse.text();
        
        const postContent = threadHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/)?.[1] || threadHtml;
        const textContent = postContent.replace(/<[^>]*>/g, ' ');
        
        const phoneMatch = textContent.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
        const emailMatch = textContent.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        const locationMatch = textContent.match(/(Orange Beach|Gulf Shores|Destin|Pensacola|Panama City|Biloxi|Gulfport|Port Aransas|Galveston|New Orleans)/i);
        const boatTypeMatch = textContent.match(/(\d+)\s*(?:ft|foot|')\s*([\w\s]+)(?:boat|vessel|yacht)/i);
        
        const captainInfo = extractCaptainInfo(title, textContent);
        
        const boat: ScrapedBoat = {
          name: title,
          captain: captainInfo.captain,
          captain_full_name: captainInfo.captain_full_name,
          business_name: captainInfo.business_name,
          license_number: captainInfo.license_number,
          website: captainInfo.website,
          verification_info: captainInfo.verification_info,
          phone: phoneMatch ? phoneMatch[1] : undefined,
          email: emailMatch ? emailMatch[1] : undefined,
          location: locationMatch ? locationMatch[1] : undefined,
          location_city: locationMatch ? locationMatch[1] : undefined,
          boat_type: boatTypeMatch ? boatTypeMatch[2].trim() : 'Charter Boat',
          length: boatTypeMatch ? boatTypeMatch[1] : undefined,
          description: textContent.substring(0, 500),
          source: 'thehulltruth',
          source_url: `${baseUrl}${threadUrl}`
        };
        
        boats.push(boat);
      } catch (error: any) {
        console.error('Error processing Hull Truth thread:', error);
      }
    }
  } catch (error: any) {
    console.error('Error scraping The Hull Truth:', error);
    throw error;
  }
  
  return boats;
}

async function scrapeCraigslist(maxBoats: number): Promise<ScrapedBoat[]> {
  const boats: ScrapedBoat[] = [];
  const states = ['alabama', 'florida', 'mississippi', 'louisiana', 'texas'];
  const siteCodes: Record<string, string> = {
    alabama: 'auburn',
    florida: 'pensacola',
    mississippi: 'gulfport',
    louisiana: 'neworleans',
    texas: 'galveston'
  };
  
  for (const state of states) {
    if (boats.length >= maxBoats) break;
    
    const siteCode = siteCodes[state];
    if (!siteCode) continue;
    
    try {
      const searchUrl = `https://${siteCode}.craigslist.org/search/boo?query=charter+fishing+captain`;
      const response = await fetch(searchUrl);
      if (!response.ok) continue;
      
      const html = await response.text();
      
      // Extract listings using regex patterns
      const listingPattern = /<li[^>]*class="[^"]*result-row[^"]*"[^>]*>[\s\S]*?<\/li>/gi;
      const listings = html.match(listingPattern) || [];
      
      for (const listingHtml of listings.slice(0, Math.min(10, maxBoats - boats.length))) {
        try {
          const titleMatch = listingHtml.match(/<a[^>]*class="[^"]*result-title[^"]*"[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/i);
          if (!titleMatch) continue;
          
          const title = titleMatch[2].trim();
          const url = titleMatch[1].startsWith('http') ? titleMatch[1] : `https://${siteCode}.craigslist.org${titleMatch[1]}`;
          
          const priceMatch = listingHtml.match(/<span[^>]*class="[^"]*result-price[^"]*"[^>]*>([^<]+)<\/span>/i);
          const price = priceMatch ? parsePrice(priceMatch[1]) : undefined;
          
          const locationMatch = listingHtml.match(/<span[^>]*class="[^"]*result-hood[^"]*"[^>]*>\(([^)]+)\)<\/span>/i);
          const location = locationMatch ? locationMatch[1].trim() : undefined;
          
          // Determine state from city
          let location_state = state.toUpperCase().slice(0, 2);
          if (location) {
            if (location.includes('Beach') || location.includes('Shores')) location_state = 'AL';
            else if (location.includes('Destin') || location.includes('Pensacola')) location_state = 'FL';
            else if (location.includes('Biloxi') || location.includes('Gulfport')) location_state = 'MS';
            else if (location.includes('New Orleans')) location_state = 'LA';
            else if (location.includes('Galveston')) location_state = 'TX';
          }
          
          // Try to fetch full listing for more info
          let fullContent = '';
          try {
            const listingResponse = await fetch(url);
            if (listingResponse.ok) {
              const listingHtml = await listingResponse.text();
              fullContent = listingHtml.replace(/<[^>]*>/g, ' ').substring(0, 2000);
            }
          } catch (e) {
            // Ignore errors fetching full listing
          }
          
          const captainInfo = extractCaptainInfo(title, fullContent || title);
          
          const boat: ScrapedBoat = {
            name: title,
            captain: captainInfo.captain,
            captain_full_name: captainInfo.captain_full_name,
            business_name: captainInfo.business_name,
            license_number: captainInfo.license_number,
            website: captainInfo.website,
            verification_info: captainInfo.verification_info,
            location: location || `${siteCode}, ${state}`,
            location_city: location || siteCode,
            location_state: location_state,
            price: price ? `$${price}` : undefined,
            full_day_rate: price,
            source: 'craigslist',
            source_url: url
          };
          
          boats.push(boat);
        } catch (error: any) {
          console.error('Error processing Craigslist listing:', error);
        }
      }
    } catch (error: any) {
      console.error(`Error scraping Craigslist ${state}:`, error);
    }
  }
  
  return boats;
}

// ============================================
// GULF COAST CHARTERS SCRAPER
// ============================================

async function scrapeGulfCoastCharters(maxBoats: number = 50): Promise<ScrapeResult> {
  const startTime = Date.now();
  const result: ScrapeResult = {
    success: false,
    strategy: 'gulfcoastcharters.com',
    boatsFound: 0,
    boatsSaved: 0,
    errors: [],
    duration: 0
  };

  try {
    const allBoats: ScrapedBoat[] = [];
    
    // Scrape multiple sources across Gulf Coast
    // Pattern based on enhanced-smart-scraper.js
    
    // Strategy 1: The Hull Truth Forum
    try {
      console.log(`[GULFCOAST] Scraping The Hull Truth forum...`);
      const hullTruthBoats = await scrapeHullTruth(maxBoats);
      allBoats.push(...hullTruthBoats);
      console.log(`[GULFCOAST] Found ${hullTruthBoats.length} boats from The Hull Truth`);
    } catch (error: any) {
      result.errors.push(`The Hull Truth: ${error.message}`);
    }

    // Strategy 2: Craigslist (Gulf Coast cities)
    try {
      console.log(`[GULFCOAST] Scraping Craigslist...`);
      const craigslistBoats = await scrapeCraigslist(maxBoats - allBoats.length);
      allBoats.push(...craigslistBoats);
      console.log(`[GULFCOAST] Found ${craigslistBoats.length} boats from Craigslist`);
    } catch (error: any) {
      result.errors.push(`Craigslist: ${error.message}`);
    }

    // Strategy 3: Known charter company websites (from scraperUrls.ts)
    // Focus on GCC (Gulf Coast Charters) related sites
    const knownCharterSites = [
      { url: 'https://gulfcoastcharters.com/', city: 'Gulf Coast', state: 'FL' }, // Main GCC site
      { url: 'https://www.gulfcoastcharters.com/', city: 'Gulf Coast', state: 'FL' },
      { url: 'https://gulfcoastcharters.net/', city: 'Gulf Coast', state: 'FL' },
      { url: 'https://www.gulfshorefishingcharters.com/', city: 'Gulf Shores', state: 'AL' },
      { url: 'https://www.zekeslanding.com/', city: 'Orange Beach', state: 'AL' },
      { url: 'https://www.gulfrebelcharters.com/', city: 'Orange Beach', state: 'AL' },
      { url: 'https://fishingcharterbiloxi.com/', city: 'Biloxi', state: 'MS' },
      { url: 'https://www.gulfislandcharters.net/', city: 'Gulf Shores', state: 'AL' },
      { url: 'http://www.anniegirlcharters.com', city: 'Gulf Coast', state: 'AL' },
      { url: 'https://reelsurprisecharters.com/', city: 'Orange Beach', state: 'AL' },
      { url: 'https://getawaygulffishing.com/', city: 'Gulf Shores', state: 'AL' }
    ];

    for (const site of knownCharterSites) {
      if (allBoats.length >= maxBoats) break;

      try {
        console.log(`[GULFCOAST] Attempting to scrape: ${site.url}`);
        
        const response = await retryWithBackoff(async () => {
          const res = await fetch(site.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res;
        });

        const html = await response.text();
        
        // Extract boats from HTML using multiple strategies
        const boats = extractBoatsFromHTML(html, site.url, site.city, site.state);
        
        if (boats.length > 0) {
          console.log(`[GULFCOAST] Found ${boats.length} boats from ${site.url}`);
          allBoats.push(...boats);
        }

        await sleep(2000); // Rate limiting
      } catch (error: any) {
        result.errors.push(`Error scraping ${site.url}: ${error.message}`);
        console.error(`[GULFCOAST] Error:`, error);
      }
    }


    // Deduplicate boats
    const uniqueBoats = deduplicateBoats(allBoats);
    
    result.boatsFound = uniqueBoats.length;
    result.success = true;

    // Save boats
    if (uniqueBoats.length > 0) {
      const saveResult = await saveBoats(uniqueBoats);
      result.boatsSaved = saveResult.saved;
    }

  } catch (error: any) {
    result.errors.push(`Gulf Coast Charters scraper failed: ${error.message}`);
    console.error('[GULFCOAST] Error:', error);
  } finally {
    result.duration = Date.now() - startTime;
  }

  return result;
}

// Extract boats from HTML content (for known charter sites)
function extractBoatsFromHTML(html: string, sourceUrl: string, defaultCity?: string, defaultState?: string): ScrapedBoat[] {
  const boats: ScrapedBoat[] = [];
  
  // Remove scripts and styles
  const cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Try to find boat listings using common patterns
  // Pattern 1: Look for card/listing containers
  const cardPatterns = [
    /<div[^>]*class="[^"]*boat[^"]*card[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    /<div[^>]*class="[^"]*charter[^"]*card[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    /<div[^>]*class="[^"]*listing[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    /<article[^>]*>[\s\S]*?<\/article>/gi
  ];

  for (const pattern of cardPatterns) {
    const matches = cleanHtml.match(pattern);
    if (matches && matches.length > 0) {
      for (const match of matches) {
        const boat = extractBoatFromCard(match, sourceUrl);
        if (boat && boat.name) {
          boats.push(boat);
        }
      }
    }
  }

  // Pattern 2: Extract from structured data (JSON-LD)
  const jsonLdPattern = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdPattern.exec(html)) !== null) {
    try {
      const jsonData = JSON.parse(jsonLdMatch[1]);
      if (Array.isArray(jsonData)) {
        jsonData.forEach((item: any) => {
          if (item['@type'] === 'LocalBusiness' || item['@type'] === 'Product' || item.name) {
            const boat = extractBoatFromJSONLD(item, sourceUrl);
            if (boat && boat.name) {
              boats.push(boat);
            }
          }
        });
      } else if (jsonData['@type'] || jsonData.name) {
        const boat = extractBoatFromJSONLD(jsonData, sourceUrl);
        if (boat && boat.name) {
          boats.push(boat);
        }
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  }

  // Pattern 3: Extract from visible text patterns
  const textBoats = extractBoatsFromText(cleanHtml, sourceUrl);
  boats.push(...textBoats);

  return boats;
}

// Extract boat data from a card HTML
function extractBoatFromCard(cardHtml: string, sourceUrl: string): ScrapedBoat | null {
  const boat: Partial<ScrapedBoat> = {
    source: 'gulfcoastcharters.com',
    source_url: sourceUrl
  };

  // Extract name
  const namePatterns = [
    /<h[1-4][^>]*>([^<]+)<\/h[1-4]>/i,
    /<a[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/a>/i,
    /<div[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/div>/i
  ];
  
  for (const pattern of namePatterns) {
    const match = cardHtml.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      boat.name = match[1].trim();
      break;
    }
  }

  if (!boat.name) return null;

  // Extract boat type
  const typeMatch = cardHtml.match(/(?:type|boat type)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (typeMatch) {
    boat.boat_type = typeMatch[1];
  }

  // Extract length
  const lengthMatch = cardHtml.match(/(\d+)['\s]*(?:ft|feet|'|foot)/i);
  if (lengthMatch) {
    boat.length = lengthMatch[1];
  }

  // Extract capacity
  const capacityMatch = cardHtml.match(/(?:capacity|max)[:\s]+(\d+)/i);
  if (capacityMatch) {
    boat.capacity = parseInt(capacityMatch[1]);
  }

  // Extract captain info from card
  const textContent = cardHtml.replace(/<[^>]*>/g, ' ');
  const captainInfo = extractCaptainInfo(boat.name || '', textContent);
  if (captainInfo.captain) boat.captain = captainInfo.captain;
  if (captainInfo.captain_full_name) boat.captain_full_name = captainInfo.captain_full_name;
  if (captainInfo.business_name) boat.business_name = captainInfo.business_name;
  if (captainInfo.license_number) boat.license_number = captainInfo.license_number;
  if (captainInfo.website) boat.website = captainInfo.website;
  if (captainInfo.verification_info) boat.verification_info = captainInfo.verification_info;

  // Extract phone
  const phoneMatch = cardHtml.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
  if (phoneMatch) {
    boat.phone = phoneMatch[1];
  }

  // Extract email
  const emailMatch = cardHtml.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    boat.email = emailMatch[1];
  }
  
  // Extract website if not already found
  if (!boat.website) {
    const websiteMatch = cardHtml.match(/(https?:\/\/(?:www\.)?[a-zA-Z0-9-]+\.[a-z]{2,}(?:\/[^\s"']*)?)/i);
    if (websiteMatch) {
      boat.website = websiteMatch[1];
    }
  }

  // Extract location
  const locationPatterns = [
    /(?:location|port|city)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[,\s]+([A-Z]{2})/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[,\s]+([A-Z]{2})\b/
  ];
  
  for (const pattern of locationPatterns) {
    const match = cardHtml.match(pattern);
    if (match) {
      boat.location_city = match[1];
      boat.location_state = match[2];
      boat.home_port = match[1];
      break;
    }
  }

  // Extract price/rates
  const priceMatches = cardHtml.match(/\$(\d+)/g);
  if (priceMatches && priceMatches.length > 0) {
    const prices = priceMatches.map(p => parseInt(p.replace('$', '')));
    if (prices.length >= 3) {
      boat.hourly_rate = prices[0];
      boat.half_day_rate = prices[1];
      boat.full_day_rate = prices[2];
    } else if (prices.length >= 2) {
      boat.half_day_rate = prices[0];
      boat.full_day_rate = prices[1];
    } else if (prices.length >= 1) {
      boat.full_day_rate = prices[0];
    }
  }

  // Extract images
  const imgMatches = cardHtml.match(/<img[^>]*src="([^"]+)"[^>]*>/gi);
  if (imgMatches) {
    boat.photos = imgMatches
      .map(img => img.match(/src="([^"]+)"/)?.[1])
      .filter((url): url is string => !!url && !url.includes('data:image'))
      .slice(0, 5);
  }

  return boat as ScrapedBoat;
}

// Extract boat from JSON-LD structured data
function extractBoatFromJSONLD(data: any, sourceUrl: string): ScrapedBoat | null {
  if (!data.name) return null;

  const boat: ScrapedBoat = {
    name: data.name,
    source: 'gulfcoastcharters.com',
    source_url: sourceUrl
  };

  if (data.address) {
    boat.location_city = data.address.addressLocality;
    boat.location_state = data.address.addressRegion;
    boat.home_port = data.address.addressLocality;
  }

  if (data.telephone) boat.phone = data.telephone;
  if (data.email) boat.email = data.email;
  if (data.description) boat.description = data.description;
  if (data.url) boat.website = data.url;
  if (data.image) {
    boat.photos = Array.isArray(data.image) ? data.image : [data.image];
  }

  // Extract captain info from JSON-LD
  const fullText = `${data.name} ${data.description || ''} ${data.alternateName || ''}`;
  const captainInfo = extractCaptainInfo(data.name, fullText);
  if (captainInfo.captain) boat.captain = captainInfo.captain;
  if (captainInfo.captain_full_name) boat.captain_full_name = captainInfo.captain_full_name;
  if (captainInfo.business_name) boat.business_name = captainInfo.business_name || data.name;
  if (captainInfo.license_number) boat.license_number = captainInfo.license_number;
  if (captainInfo.website || data.url) boat.website = captainInfo.website || data.url;
  if (captainInfo.verification_info) boat.verification_info = captainInfo.verification_info;

  return boat;
}

// Extract boats from plain text
function extractBoatsFromText(text: string, sourceUrl: string): ScrapedBoat[] {
  const boats: ScrapedBoat[] = [];
  
  // Look for patterns like "Charter Boat: Name - Location"
  const boatPatterns = [
    /(?:charter|boat)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+\d+)?)[\s-]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:Charter|Fishing|Boat)/gi
  ];

  const seenNames = new Set<string>();

  for (const pattern of boatPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null && boats.length < 20) {
      const name = match[1] || match[0];
      if (name && name.length > 2 && !seenNames.has(name)) {
        seenNames.add(name);
        
        // Try to find location near this match
        const contextStart = Math.max(0, match.index - 200);
        const contextEnd = Math.min(text.length, match.index + 200);
        const context = text.substring(contextStart, contextEnd);
        
        const locationMatch = context.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[,\s]+([A-Z]{2})\b/);
        
        const captainInfo = extractCaptainInfo(name, context);
        
        boats.push({
          name: name.trim(),
          captain: captainInfo.captain,
          captain_full_name: captainInfo.captain_full_name,
          business_name: captainInfo.business_name,
          license_number: captainInfo.license_number,
          website: captainInfo.website,
          verification_info: captainInfo.verification_info,
          location_city: locationMatch?.[1],
          location_state: locationMatch?.[2] || 'FL',
          source: 'gulfcoastcharters.com',
          source_url: sourceUrl
        });
      }
    }
  }

  return boats;
}

// Deduplicate boats
function deduplicateBoats(boats: ScrapedBoat[]): ScrapedBoat[] {
  const seen = new Map<string, ScrapedBoat>();
  
  for (const boat of boats) {
    if (!boat.name) continue;
    
    const key = boat.name.toLowerCase().trim();
    if (!seen.has(key) || (boat.phone || boat.email)) {
      seen.set(key, boat);
    }
  }
  
  return Array.from(seen.values());
}

// ============================================
// DATABASE OPERATIONS
// ============================================

async function saveBoats(boats: ScrapedBoat[]): Promise<{ saved: number; skipped: number; errors: number }> {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  let saved = 0;
  let skipped = 0;
  let errors = 0;

  for (const boat of boats) {
    try {
      // Check for duplicates by name + location
      const { data: existing } = await supabase
        .from('scraped_boats')
        .select('id')
        .eq('name', boat.name)
        .eq('location_city', boat.location_city || '')
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // Prepare insert data - include all captain verification info
      const insertData: any = {
        name: boat.name,
        captain: boat.captain || null,
        boat_type: boat.boat_type || 'Charter Boat',
        length: boat.length || null,
        capacity: boat.capacity || null,
        location: boat.location || `${boat.location_city || ''}, ${boat.location_state || ''}`.trim(),
        location_city: boat.location_city || null,
        location_state: boat.location_state || null,
        phone: boat.phone || null,
        email: boat.email || null,
        description: boat.description || `Charter boat available in ${boat.location_city || 'Gulf Coast'}`,
        photos: boat.photos || [],
        price: boat.price || null,
        hourly_rate: boat.hourly_rate || null,
        half_day_rate: boat.half_day_rate || null,
        full_day_rate: boat.full_day_rate || null,
        home_port: boat.home_port || boat.location_city || null,
        source: boat.source,
        source_url: boat.source_url || null,
        claimed: false, // Always start as unclaimed
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        times_seen: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Add captain verification fields to description if available
      if (boat.verification_info || boat.business_name || boat.license_number || boat.website) {
        const verificationDetails = [];
        if (boat.captain_full_name) verificationDetails.push(`Captain: ${boat.captain_full_name}`);
        if (boat.business_name) verificationDetails.push(`Business: ${boat.business_name}`);
        if (boat.license_number) verificationDetails.push(`License: ${boat.license_number}`);
        if (boat.website) verificationDetails.push(`Website: ${boat.website}`);
        
        if (verificationDetails.length > 0) {
          insertData.description = `${insertData.description}\n\nVerification Info: ${verificationDetails.join(' | ')}`;
        }
      }

      // Insert boat
      const { error: insertError, data: insertedData } = await supabase
        .from('scraped_boats')
        .insert(insertData)
        .select();

      if (insertError) {
        console.error(`[SAVE] Error saving ${boat.name}:`, insertError.message);
        console.error(`[SAVE] Error details:`, JSON.stringify(insertError, null, 2));
        errors++;
      } else {
        saved++;
        console.log(`[SAVE] Successfully saved boat: ${boat.name}`);
        
        // Send email notification to captain if email is available
        if (boat.email) {
          try {
            await sendBoatAddedEmail(boat);
            console.log(`[EMAIL] Sent notification to ${boat.email} for boat ${boat.name}`);
          } catch (emailError: any) {
            console.error(`[EMAIL] Failed to send notification to ${boat.email}:`, emailError.message);
            // Don't fail the save if email fails
          }
        }
      }
    } catch (error: any) {
      console.error(`[SAVE] Exception processing ${boat.name}:`, error.message);
      console.error(`[SAVE] Exception stack:`, error.stack);
      errors++;
    }
  }

  return { saved, skipped, errors };
}

// ============================================
// EMAIL NOTIFICATION
// ============================================

// Lazy load Resend
let Resend: any = null;
try {
  const resendModule = require('resend');
  Resend = resendModule.Resend || resendModule.default?.Resend;
} catch (e) {
  console.log('[EMAIL] Resend not available');
}

async function sendBoatAddedEmail(boat: ScrapedBoat): Promise<void> {
  if (!boat.email) {
    return;
  }
  
  // Skip if Resend is not available
  if (!Resend) {
    console.log('[EMAIL] Resend not available, skipping email');
    return;
  }
  
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.log('[EMAIL] RESEND_API_KEY not configured, skipping email');
    return;
  }
  
  const resend = new Resend(resendApiKey);
  
  // Brief email template as requested
  const subject = `Your Boat Has Been Added to Gulf Coast Charters`;
  
  const textBody = `Hello,

Your boat "${boat.name}" has been automatically added to Gulf Coast Charters search.

Your boat is now visible to customers searching for charters. To claim your listing and access additional features, please create a captain account at:

${process.env.NEXT_PUBLIC_SITE_URL || 'https://gulfcoastcharters.com'}/become-a-captain

Why create an account?
- Claim and verify your boat listing
- Update your boat details and photos
- Respond to customer inquiries
- Access booking management tools

Best regards,
Gulf Coast Charters Team`;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Gulf Coast Charters <onboarding@resend.dev>',
      to: [boat.email],
      subject: subject,
      text: textBody,
      replyTo: process.env.RESEND_REPLY_TO || 'support@gulfcoastcharters.com'
    });
    
    console.log(`[EMAIL] Successfully sent boat added notification to ${boat.email}`);
  } catch (error: any) {
    console.error(`[EMAIL] Error sending email to ${boat.email}:`, error.message);
    throw error;
  }
}

// ============================================
// MAIN API HANDLER
// ============================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`[GULFCOAST SCRAPER] [${requestId}] Starting scraper request...`);
    
    if (!supabase) {
      console.error(`[GULFCOAST SCRAPER] [${requestId}] Database not configured - missing Supabase credentials`);
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
        },
        { status: 500 }
      );
    }

    // Test database connection
    const { error: dbTestError } = await supabase.from('scraped_boats').select('id').limit(1);
    if (dbTestError && dbTestError.code !== 'PGRST116') { // PGRST116 = table not found
      console.error(`[GULFCOAST SCRAPER] [${requestId}] Database connection test failed:`, dbTestError);
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          details: dbTestError.message,
          code: dbTestError.code
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch((parseError: any) => {
      console.warn(`[GULFCOAST SCRAPER] [${requestId}] Failed to parse JSON body:`, parseError.message);
      return {};
    });

    const {
      maxBoats = 50,
      states = ['Alabama', 'Florida', 'Mississippi', 'Louisiana', 'Texas']
    } = body;

    console.log(`[GULFCOAST SCRAPER] [${requestId}] Configuration:`, { maxBoats, states });
    console.log(`[GULFCOAST SCRAPER] [${requestId}] Max boats: ${maxBoats}`);

    const results: ScrapeResult[] = [];

    // Scrape Gulf Coast Charters website
    try {
      console.log(`[GULFCOAST SCRAPER] [${requestId}] Starting scrapeGulfCoastCharters...`);
      const result = await scrapeGulfCoastCharters(maxBoats);
      console.log(`[GULFCOAST SCRAPER] [${requestId}] Scrape completed:`, {
        success: result.success,
        boatsFound: result.boatsFound,
        boatsSaved: result.boatsSaved,
        errors: result.errors.length
      });
      results.push(result);
    } catch (error: any) {
      console.error(`[GULFCOAST SCRAPER] [${requestId}] Scrape failed:`, error);
      console.error(`[GULFCOAST SCRAPER] [${requestId}] Error stack:`, error.stack);
      results.push({
        success: false,
        strategy: 'gulfcoastcharters.com',
        boatsFound: 0,
        boatsSaved: 0,
        errors: [error.message || 'Unknown error'],
        duration: Date.now() - startTime
      });
    }

    const totalDuration = Date.now() - startTime;
    const summary = {
      totalFound: results.reduce((sum, r) => sum + r.boatsFound, 0),
      totalSaved: results.reduce((sum, r) => sum + r.boatsSaved, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      duration: totalDuration,
      strategies: results.length
    };

    console.log(`[GULFCOAST SCRAPER] [${requestId}] Summary:`, summary);

    // Save to scrape_logs table (for boats, we'll use location as 'Gulf Coast')
    try {
      if (supabase) {
        await supabase.from('scrape_logs').insert({
          location: 'Gulf Coast',
          pets_found: summary.totalFound, // Reusing column name for boats found
          pets_saved: summary.totalSaved, // Reusing column name for boats saved
          errors: summary.totalErrors > 0 ? results.flatMap(r => r.errors) : [],
          duration_ms: totalDuration,
          success: summary.totalErrors === 0,
          strategy: 'gulfcoastcharters',
          metadata: {
            requestId,
            maxBoats,
            states,
            results
          }
        });
        console.log(`[GULFCOAST SCRAPER] [${requestId}] Logged to scrape_logs table`);
      }
    } catch (logError: any) {
      console.error(`[GULFCOAST SCRAPER] [${requestId}] Failed to log to scrape_logs:`, logError.message);
    }

    return NextResponse.json({
      success: summary.totalErrors === 0,
      requestId,
      summary,
      results,
      message: `Scraped ${summary.totalFound} boats, saved ${summary.totalSaved} to database`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    const errorId = `err_${Date.now()}`;
    console.error(`[GULFCOAST SCRAPER] [${requestId}] [${errorId}] Fatal error:`, error);
    console.error(`[GULFCOAST SCRAPER] [${requestId}] [${errorId}] Error stack:`, error.stack);
    
    return NextResponse.json(
      {
        error: error.message || 'Failed to scrape Gulf Coast Charters',
        errorId,
        requestId,
        success: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    strategies: ['gulfcoastcharters.com'],
    database: supabase ? 'connected' : 'not configured'
  });
}

