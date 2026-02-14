import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Discover small rescue shelters from Facebook
 * Focus on small local rescues, not large retailers
 */
async function discoverSmallRescues(city: string, state: string): Promise<any[]> {
  const shelters: any[] = [];
  
  try {
    // Search Facebook for small rescue organizations
    const searchTerms = [
      `${city} ${state} animal rescue`,
      `${city} ${state} pet rescue`,
      `${city} ${state} small animal shelter`,
      `${city} ${state} dog rescue`,
      `${city} ${state} cat rescue`
    ];
    
    let playwright: any = null;
    try {
      playwright = require('playwright');
    } catch (e) {
      console.log('[DISCOVER] Playwright not available');
      return shelters;
    }
    
    const browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    
    for (const term of searchTerms.slice(0, 2)) { // Limit to 2 searches
      try {
        const searchUrl = `https://www.facebook.com/search/pages/?q=${encodeURIComponent(term)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(3000);
        
        // Look for rescue/shelter pages (exclude large retailers)
        const rescuePages = await page.$$eval('a[href*="/pages/"], a[href*="/groups/"]', (els: any[]) => {
          return els.map((el: any) => {
            const href = el.href || '';
            const text = el.textContent || el.innerText || '';
            const name = text.trim().substring(0, 100);
            
            // Filter out large retailers
            const excludeTerms = ['petco', 'petsmart', 'pet supplies', 'pet store', 'chain', 'retail'];
            const isLargeRetailer = excludeTerms.some(term => name.toLowerCase().includes(term));
            
            if (isLargeRetailer) return null;
            
            // Look for rescue/shelter indicators
            const rescueTerms = ['rescue', 'shelter', 'adoption', 'animal welfare', 'humane society'];
            const isRescue = rescueTerms.some(term => name.toLowerCase().includes(term));
            
            if (isRescue && name.length > 0) {
              return { name, url: href, source: 'facebook_rescue' };
            }
            return null;
          }).filter((s: any) => s !== null);
        }).catch(() => []);
        
        shelters.push(...rescuePages);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Delay between searches
      } catch (error: any) {
        console.error(`[DISCOVER] Error searching for ${term}:`, error.message);
      }
    }
    
    await browser.close();
  } catch (error: any) {
    console.error(`[DISCOVER] Error discovering small rescues for ${city}, ${state}:`, error.message);
  }
  
  return shelters;
}

/**
 * Discover small rescues from Google search
 * Focus on local, small rescue organizations
 */
async function discoverFromGoogle(city: string, state: string): Promise<any[]> {
  const shelters: any[] = [];
  
  try {
    // Google search for small local rescues
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${city} ${state} small animal rescue shelter`)}`;
    
    let playwright: any = null;
    try {
      playwright = require('playwright');
    } catch (e) {
      return shelters;
    }
    
    const browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    // Look for rescue website links (exclude large retailers)
    const rescueLinks = await page.$$eval('a[href^="http"]', (els: any[]) => {
      return els.map((el: any) => {
        const href = el.href || '';
        const text = el.textContent || el.innerText || '';
        const name = text.trim().substring(0, 100);
        
        // Exclude large retailers and platforms
        const excludeDomains = ['petco.com', 'petsmart.com', 'adoptapet.com', 'petfinder.com', 'chewy.com'];
        const isExcluded = excludeDomains.some(domain => href.includes(domain));
        
        if (isExcluded) return null;
        
        // Look for rescue indicators
        const rescueTerms = ['rescue', 'shelter', 'adoption', 'animal welfare'];
        const isRescue = rescueTerms.some(term => 
          name.toLowerCase().includes(term) || href.toLowerCase().includes(term)
        );
        
        if (isRescue && name.length > 0 && href.startsWith('http')) {
          return { name, url: href, source: 'google_rescue' };
        }
        return null;
      }).filter((s: any) => s !== null);
    }).catch(() => []);
    
    shelters.push(...rescueLinks);
    
    await browser.close();
  } catch (error: any) {
    console.error(`[DISCOVER] Error discovering from Google for ${city}, ${state}:`, error.message);
  }
  
  return shelters;
}

/**
 * Save discovered shelters to database
 */
async function saveShelters(shelters: any[], city: string, state: string, zipcode?: string) {
  if (!supabase) return { saved: 0, skipped: 0 };
  
  let saved = 0;
  let skipped = 0;
  
  for (const shelter of shelters) {
    try {
      // Check if already exists (by URL or name)
      const { data: existing } = await supabase
        .from('shelters')
        .select('id')
        .or(`shelter_url.eq.${shelter.url},shelter_name.eq.${shelter.name}`)
        .single();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Save to shelters table
      // Note: email is required by schema, so we generate a placeholder
      // Shelters can update this when they create an account
      const placeholderEmail = `shelter_${shelter.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}@petreunion.org`;
      
      const { error } = await supabase
        .from('shelters')
        .insert({
          shelter_name: shelter.name, // Fixed: use shelter_name not name
          email: placeholderEmail, // Required field - placeholder until shelter creates account
          shelter_url: shelter.url,
          shelter_type: shelter.source || 'adoptapet',
          city: city,
          state: state,
          zipcode: zipcode || null,
          auto_scrape_enabled: true,
          created_at: new Date().toISOString() // Explicitly set for clarity
        });
      
      if (error) {
        console.error(`[DISCOVER] Error saving shelter ${shelter.name}:`, error.message);
      } else {
        saved++;
      }
    } catch (error: any) {
      console.error(`[DISCOVER] Error processing shelter ${shelter.name}:`, error.message);
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
    const { city, state, zipcode, sources = ['small_rescues'] } = body;
    
    if (!city || !state) {
      return NextResponse.json(
        { error: 'City and state are required' },
        { status: 400 }
      );
    }
    
    console.log(`[DISCOVER] Discovering SMALL RESCUE SHELTERS in ${city}, ${state}...`);
    
    const allShelters: any[] = [];
    
    // Discover from each source (focus on small rescues only)
    if (sources.includes('small_rescues') || sources.includes('facebook')) {
      const facebookRescues = await discoverSmallRescues(city, state);
      allShelters.push(...facebookRescues);
    }
    
    if (sources.includes('small_rescues') || sources.includes('google')) {
      const googleRescues = await discoverFromGoogle(city, state);
      allShelters.push(...googleRescues);
    }
    
    // Remove duplicates
    const uniqueShelters = Array.from(
      new Map(allShelters.map(s => [s.url || s.name, s])).values()
    );
    
    // Save to database
    const { saved, skipped } = await saveShelters(uniqueShelters, city, state, zipcode);
    
    return NextResponse.json({
      success: true,
      discovered: uniqueShelters.length,
      saved,
      skipped,
      shelters: uniqueShelters,
      message: `Discovered ${uniqueShelters.length} shelters, saved ${saved} new ones`
    });
    
  } catch (error: any) {
    console.error('[DISCOVER] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to discover shelters' },
      { status: 500 }
    );
  }
}

