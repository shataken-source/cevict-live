import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Scrape pets from a discovered shelter's URL
 */
async function scrapeShelter(shelter: any): Promise<{ petsFound: number; petsSaved: number; error?: string }> {
  try {
    if (!shelter.shelter_url) {
      return { petsFound: 0, petsSaved: 0, error: 'No shelter URL' };
    }
    
    // Call the appropriate scraper based on shelter type
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002';
    
    let scraperUrl = '';
    if (shelter.shelter_url.includes('facebook.com') || shelter.shelter_type === 'facebook_rescue') {
      // Use Facebook scraper for Facebook pages
      scraperUrl = `${baseUrl}/api/petreunion/scrape-facebook-shelter`;
    } else if (shelter.shelter_type === 'adoptapet' || shelter.shelter_url.includes('adoptapet.com')) {
      scraperUrl = `${baseUrl}/api/petreunion/scrape-adoptapet`;
    } else if (shelter.shelter_type === 'petfinder' || shelter.shelter_url.includes('petfinder.com')) {
      scraperUrl = `${baseUrl}/api/petreunion/scrape-petfinder`;
    } else {
      // Try pattern-based scraper
      scraperUrl = `${baseUrl}/api/petreunion/shelter/scrape-shelter-page`;
    }
    
    const response = await fetch(scraperUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: shelter.shelter_url,
        shelterId: shelter.id,
        maxPages: 5
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Update shelter's last scraped time
      await supabase
        .from('shelters')
        .update({ last_scraped_at: new Date().toISOString() })
        .eq('id', shelter.id);
      
      return {
        petsFound: data.petsScraped || 0,
        petsSaved: data.petsSaved || 0
      };
    } else {
      return {
        petsFound: 0,
        petsSaved: 0,
        error: data.message || 'Scraping failed'
      };
    }
  } catch (error: any) {
    return {
      petsFound: 0,
      petsSaved: 0,
      error: error.message
    };
  }
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
      city, 
      state, 
      maxShelters = 50,
      onlyUnscraped = false 
    } = body;
    
    // Get shelters from database
    let query = supabase
      .from('shelters')
      .select('*')
      .eq('auto_scrape_enabled', true);
    
    if (city && state) {
      query = query.eq('city', city).eq('state', state);
    }
    
    if (onlyUnscraped) {
      query = query.is('last_scraped_at', null);
    }
    
    query = query.limit(maxShelters);
    
    const { data: shelters, error: sheltersError } = await query;
    
    if (sheltersError) {
      throw sheltersError;
    }
    
    if (!shelters || shelters.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No shelters found to scrape',
        sheltersScraped: 0,
        totalPetsFound: 0,
        totalPetsSaved: 0
      });
    }
    
    console.log(`[SCRAPE SHELTERS] Scraping ${shelters.length} shelters...`);
    
    // Scrape each shelter
    const results = {
      sheltersScraped: 0,
      sheltersSkipped: 0,
      totalPetsFound: 0,
      totalPetsSaved: 0,
      errors: [] as string[]
    };
    
    for (const shelter of shelters) {
      const result = await scrapeShelter(shelter);
      
      if (result.error) {
        results.sheltersSkipped++;
        results.errors.push(`${shelter.name}: ${result.error}`);
      } else {
        results.sheltersScraped++;
        results.totalPetsFound += result.petsFound;
        results.totalPetsSaved += result.petsSaved;
      }
      
      // Small delay between shelters
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return NextResponse.json({
      success: true,
      ...results,
      message: `Scraped ${results.sheltersScraped} shelters, found ${results.totalPetsFound} pets, saved ${results.totalPetsSaved}`
    });
    
  } catch (error: any) {
    console.error('[SCRAPE SHELTERS] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape shelters' },
      { status: 500 }
    );
  }
}


