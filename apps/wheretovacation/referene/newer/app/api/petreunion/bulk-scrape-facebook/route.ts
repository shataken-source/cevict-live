import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * BULK FACEBOOK SCRAPER - Fast parallel scraping for 15,000 pets
 * Scrapes multiple Facebook shelter pages in parallel
 */
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
      maxShelters = 200,
      maxPetsPerShelter = 50,
      parallel = 5, // Number of parallel scrapers
      city,
      state
    } = body;
    
    console.log(`[BULK FB SCRAPER] Starting bulk Facebook scraping...`);
    console.log(`[BULK FB SCRAPER] Target: ${maxShelters} shelters, ${maxPetsPerShelter} pets each`);
    
    // Get Facebook shelters from database
    let query = supabase
      .from('shelters')
      .select('*')
      .or('shelter_url.ilike.%facebook.com%,shelter_type.eq.facebook_rescue')
      .eq('auto_scrape_enabled', true);
    
    if (city && state) {
      query = query.eq('city', city).eq('state', state);
    }
    
    query = query.limit(maxShelters);
    
    const { data: shelters, error: sheltersError } = await query;
    
    if (sheltersError) {
      throw sheltersError;
    }
    
    if (!shelters || shelters.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No Facebook shelters found to scrape',
        sheltersScraped: 0,
        totalPetsFound: 0,
        totalPetsSaved: 0
      });
    }
    
    console.log(`[BULK FB SCRAPER] Found ${shelters.length} Facebook shelters to scrape`);
    
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002';
    const results = {
      sheltersScraped: 0,
      sheltersSkipped: 0,
      totalPetsFound: 0,
      totalPetsSaved: 0,
      errors: [] as string[],
      startTime: Date.now()
    };
    
    // Process shelters in parallel batches
    for (let i = 0; i < shelters.length; i += parallel) {
      const batch = shelters.slice(i, i + parallel);
      
      console.log(`[BULK FB SCRAPER] Processing batch ${Math.floor(i / parallel) + 1}/${Math.ceil(shelters.length / parallel)} (${batch.length} shelters)...`);
      
      // Scrape all shelters in batch in parallel
      const batchPromises = batch.map(async (shelter) => {
        try {
          const response = await fetch(`${baseUrl}/api/petreunion/scrape-facebook-shelter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              facebookUrl: shelter.shelter_url,
              shelterId: shelter.id,
              maxPosts: maxPetsPerShelter
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
              shelter: shelter.name,
              petsFound: data.petsFound || 0,
              petsSaved: data.petsSaved || 0,
              error: null
            };
          } else {
            return {
              shelter: shelter.name,
              petsFound: 0,
              petsSaved: 0,
              error: data.error || 'Scraping failed'
            };
          }
        } catch (error: any) {
          return {
            shelter: shelter.name,
            petsFound: 0,
            petsSaved: 0,
            error: error.message
          };
        }
      });
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Aggregate results
      for (const result of batchResults) {
        if (result.error) {
          results.sheltersSkipped++;
          results.errors.push(`${result.shelter}: ${result.error}`);
        } else {
          results.sheltersScraped++;
          results.totalPetsFound += result.petsFound;
          results.totalPetsSaved += result.petsSaved;
        }
      }
      
      console.log(`[BULK FB SCRAPER] Batch complete. Total so far: ${results.totalPetsSaved} pets saved`);
      
      // Small delay between batches to avoid overwhelming
      if (i + parallel < shelters.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const duration = Math.round((Date.now() - results.startTime) / 1000);
    
    // Get current database count
    const { count: currentCount } = await supabase
      .from('lost_pets')
      .select('*', { count: 'exact', head: true });
    
    return NextResponse.json({
      success: true,
      summary: {
        sheltersProcessed: shelters.length,
        sheltersScraped: results.sheltersScraped,
        sheltersSkipped: results.sheltersSkipped,
        totalPetsFound: results.totalPetsFound,
        totalPetsSaved: results.totalPetsSaved,
        currentDatabaseTotal: currentCount || 0,
        duration: `${duration} seconds`,
        petsPerMinute: duration > 0 ? Math.round((results.totalPetsSaved / duration) * 60) : 0
      },
      errors: results.errors.slice(0, 20), // Limit error output
      message: `Scraped ${results.sheltersScraped} Facebook shelters, found ${results.totalPetsFound} pets, saved ${results.totalPetsSaved} to database. Current total: ${currentCount || 0} pets.`
    });
    
  } catch (error: any) {
    console.error('[BULK FB SCRAPER] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to bulk scrape Facebook shelters' },
      { status: 500 }
    );
  }
}

