import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Scrape all unscanned shelters
 * Finds shelters marked as "unscanned" and scrapes them
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
      maxShelters = 50,
      city,
      state
    } = body;
    
    console.log(`[SCRAPE UNSCANNED] Finding unscanned shelters...`);
    
    // Get unscanned shelters
    // Handle missing columns gracefully - try different query strategies
    let shelters: any[] = [];
    
    // Strategy 1: Try with all optional columns (scan_status, auto_scrape_enabled)
    let query = supabase
      .from('shelters')
      .select('*')
      .eq('auto_scrape_enabled', true)
      .eq('scan_status', 'unscanned');
    
    // Normalize city/state inputs (trim and handle case)
    const normalizedCity = city ? city.trim() : null;
    const normalizedState = state ? state.trim() : null;
    
    // Add city/state filters if provided (use case-insensitive matching via ilike)
    if (normalizedCity && normalizedState) {
      // Use PostgreSQL ILIKE for case-insensitive matching
      // Note: Supabase PostgREST doesn't directly support ILIKE, so we'll use a workaround
      // We'll query all and filter, or use RPC function, or normalize in database
      // For now, try exact match first, then fallback to case-insensitive
      query = query.eq('city', normalizedCity).eq('state', normalizedState);
    } else if (normalizedState) {
      query = query.eq('state', normalizedState);
    }
    
    let result = await query.limit(maxShelters);
    
    // If no results with exact match and we have city/state, try case-insensitive
    if (normalizedCity && normalizedState && (!result.data || result.data.length === 0) && !result.error) {
      console.log(`[SCRAPE UNSCANNED] No exact match for "${normalizedCity}, ${normalizedState}", trying case-insensitive...`);
      // Get all shelters and filter client-side (not ideal but works)
      const allQuery = supabase
        .from('shelters')
        .select('*')
        .eq('auto_scrape_enabled', true)
        .eq('scan_status', 'unscanned');
      
      const allResult = await allQuery.limit(maxShelters * 3); // Get more to filter
      
      if (allResult.data) {
        // Case-insensitive filter
        const filtered = allResult.data.filter((s: any) => {
          const shelterCity = (s.city || '').trim().toLowerCase();
          const shelterState = (s.state || '').trim().toLowerCase();
          return shelterCity === normalizedCity.toLowerCase() && 
                 shelterState === normalizedState.toLowerCase();
        });
        
        if (filtered.length > 0) {
          console.log(`[SCRAPE UNSCANNED] Found ${filtered.length} shelters with case-insensitive match`);
          result = {
            data: filtered.slice(0, maxShelters),
            error: null,
            status: 200,
            statusText: 'OK',
            count: null
          } as any;
        }
      }
    }
    
    // If error is about missing columns, try simpler queries
    if (result.error && (
      result.error.message?.includes('scan_status') || 
      result.error.message?.includes('auto_scrape_enabled') ||
      result.error.message?.includes('city') ||
      result.error.message?.includes('state')
    )) {
      console.log('[SCRAPE UNSCANNED] Optional columns missing, trying fallback queries');
      const hasCityStateError = result.error.message?.includes('city') || result.error.message?.includes('state');
      
      // Fallback 1: Try with just last_scraped_at (no optional filters)
      let fallbackQuery = supabase
        .from('shelters')
        .select('*')
        .is('last_scraped_at', null);
      
      // Only try city/state if we didn't get an error about them
      if (city && state && !hasCityStateError) {
        fallbackQuery = fallbackQuery.eq('city', city).eq('state', state);
      }
      
      result = await fallbackQuery.limit(maxShelters);
      
      // If that also fails (last_scraped_at might not exist), try getting all shelters
      if (result.error && result.error.message?.includes('last_scraped_at')) {
        console.log('[SCRAPE UNSCANNED] last_scraped_at column also missing, getting all shelters');
        let allQuery = supabase
          .from('shelters')
          .select('*');
        
        // Don't try city/state filter if we got an error about them
        if (normalizedCity && normalizedState && !hasCityStateError && !result.error.message?.includes('city') && !result.error.message?.includes('state')) {
          allQuery = allQuery.eq('city', normalizedCity).eq('state', normalizedState);
        }
        
        result = await allQuery.limit(maxShelters);
      }
      
      // If still error and it's about city/state, just get all shelters without location filter
      if (result.error && (result.error.message?.includes('city') || result.error.message?.includes('state'))) {
        console.log('[SCRAPE UNSCANNED] city/state columns missing, getting all shelters without location filter');
        result = await supabase
          .from('shelters')
          .select('*')
          .limit(maxShelters);
      }
      
      if (result.error) {
        throw result.error;
      }
    } else if (result.error) {
      throw result.error;
    }
    
    shelters = result.data || [];
    
    if (!shelters || shelters.length === 0) {
      // Provide helpful message about why no shelters found
      let message = 'No unscanned shelters found';
      if (normalizedCity && normalizedState) {
        message += ` for ${normalizedCity}, ${normalizedState}`;
        message += '. This could mean: (1) All shelters in this area have been scanned, (2) No shelters exist in database for this location, or (3) Try running "Discover Shelters" first.';
      } else if (normalizedState) {
        message += ` for ${normalizedState}`;
      }
      
      console.log(`[SCRAPE UNSCANNED] ${message}`);
      
      return NextResponse.json({
        success: true,
        message,
        sheltersScraped: 0,
        totalPetsFound: 0,
        totalPetsSaved: 0,
        debug: {
          city: normalizedCity,
          state: normalizedState,
          maxShelters
        }
      });
    }
    
    console.log(`[SCRAPE UNSCANNED] Found ${shelters.length} unscanned shelters to scrape${normalizedCity && normalizedState ? ` for ${normalizedCity}, ${normalizedState}` : ''}`);
    
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://petreunion-final.vercel.app';
    const results = {
      sheltersScraped: 0,
      sheltersSkipped: 0,
      totalPetsFound: 0,
      totalPetsSaved: 0,
      errors: [] as string[]
    };
    
    // Scrape each shelter
    for (const shelter of shelters) {
      try {
        let scraperUrl = '';
        
        // Determine which scraper to use based on shelter type/URL
        if (shelter.shelter_url?.includes('facebook.com') || shelter.shelter_type === 'facebook_rescue') {
          scraperUrl = `${baseUrl}/api/petreunion/scrape-facebook-shelter`;
        } else if (shelter.shelter_type === 'adoptapet' || shelter.shelter_url?.includes('adoptapet.com')) {
          scraperUrl = `${baseUrl}/api/petreunion/scrape-adoptapet`;
        } else {
          scraperUrl = `${baseUrl}/api/petreunion/shelter/scrape-shelter-page`;
        }
        
        const response = await fetch(scraperUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            facebookUrl: shelter.shelter_url,
            url: shelter.shelter_url,
            shelterId: shelter.id,
            maxPosts: 50
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Mark as scanned with date
          const now = new Date().toISOString();
          const updateData: any = {
            last_scraped_at: now
          };
          
          // Try to update optional columns (won't fail if they don't exist)
          // Note: Supabase will ignore columns that don't exist in the update
          updateData.scan_status = 'scanned';
          updateData.scanned_date = now;
          
          const updateResult = await supabase
            .from('shelters')
            .update(updateData)
            .eq('id', shelter.id);
          
          // Log warning if update failed due to missing columns, but don't fail the scrape
          if (updateResult.error && (
            updateResult.error.message?.includes('scan_status') ||
            updateResult.error.message?.includes('scanned_date')
          )) {
            console.log(`[SCRAPE UNSCANNED] Warning: Could not update optional columns for ${shelter.shelter_name}, but scrape succeeded`);
            // Try to update just last_scraped_at
            await supabase
              .from('shelters')
              .update({ last_scraped_at: now })
              .eq('id', shelter.id);
          }
          
          results.sheltersScraped++;
          results.totalPetsFound += data.petsFound || 0;
          results.totalPetsSaved += data.petsSaved || 0;
          
          console.log(`[SCRAPE UNSCANNED] ✓ Scraped ${shelter.shelter_name}: ${data.petsSaved || 0} pets saved`);
        } else {
          results.sheltersSkipped++;
          results.errors.push(`${shelter.shelter_name}: ${data.error || 'Scraping failed'}`);
          
          // Try to mark as error if column exists (don't fail if it doesn't)
          const errorUpdate = await supabase
            .from('shelters')
            .update({ scan_status: 'error' })
            .eq('id', shelter.id);
          
          if (errorUpdate.error && errorUpdate.error.message?.includes('scan_status')) {
            // Column doesn't exist, that's okay - just log it
            console.log(`[SCRAPE UNSCANNED] Could not update scan_status for ${shelter.shelter_name} (column missing)`);
          }
        }
        
        // Delay between shelters
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error: any) {
        results.sheltersSkipped++;
        results.errors.push(`${shelter.shelter_name}: ${error.message}`);
        console.error(`[SCRAPE UNSCANNED] Error scraping ${shelter.shelter_name}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      ...results,
      message: `Scraped ${results.sheltersScraped} shelters, found ${results.totalPetsFound} pets, saved ${results.totalPetsSaved}`
    });
    
  } catch (error: any) {
    console.error('[SCRAPE UNSCANNED] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape unscanned shelters' },
      { status: 500 }
    );
  }
}

/**
 * GET: Get count of unscanned shelters
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    
    // Try to use scan_status, fallback to last_scraped_at
    let query = supabase
      .from('shelters')
      .select('id', { count: 'exact', head: true })
      .eq('scan_status', 'unscanned');
    
    if (city && state) {
      query = query.eq('city', city).eq('state', state);
    }
    
    let result = await query;
    
    // If error is about missing columns, try fallback
    if (result.error && (
      result.error.message?.includes('scan_status') || 
      result.error.message?.includes('auto_scrape_enabled') ||
      result.error.message?.includes('city') ||
      result.error.message?.includes('state')
    )) {
      const hasCityStateError = result.error.message?.includes('city') || result.error.message?.includes('state');
      
      let fallbackQuery = supabase
        .from('shelters')
        .select('id', { count: 'exact', head: true })
        .is('last_scraped_at', null);
      
      // Only try city/state if we didn't get an error about them
      if (city && state && !hasCityStateError) {
        fallbackQuery = fallbackQuery.eq('city', city).eq('state', state);
      }
      
      result = await fallbackQuery;
      
      if (result.error && result.error.message?.includes('last_scraped_at')) {
        // Even last_scraped_at doesn't exist, just count all shelters
        let allQuery = supabase
          .from('shelters')
          .select('id', { count: 'exact', head: true });
        
        // Don't try city/state if we got an error about them
        if (city && state && !hasCityStateError && !result.error.message?.includes('city') && !result.error.message?.includes('state')) {
          allQuery = allQuery.eq('city', city).eq('state', state);
        }
        
        result = await allQuery;
      }
      
      // If still error about city/state, get all without location filter
      if (result.error && (result.error.message?.includes('city') || result.error.message?.includes('state'))) {
        result = await supabase
          .from('shelters')
          .select('id', { count: 'exact', head: true });
      }
      
      if (result.error) {
        throw result.error;
      }
      
      return NextResponse.json({
        success: true,
        unscannedCount: result.count || 0
      });
    }
    
    if (result.error) {
      throw result.error;
    }
    
    return NextResponse.json({
      success: true,
      unscannedCount: result.count || 0
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get unscanned count' },
      { status: 500 }
    );
  }
}

