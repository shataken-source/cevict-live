// @ts-nocheck
// Bulletproof Facebook Pet Scraper - Supabase Edge Function
// Designed to run via cron jobs for automated pet discovery

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const FACEBOOK_APP_ID = Deno.env.get('FACEBOOK_APP_ID') || '';
const FACEBOOK_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET') || '';
const FACEBOOK_ACCESS_TOKEN = Deno.env.get('FACEBOOK_ACCESS_TOKEN') || '';
const SCRAPER_API_URL = Deno.env.get('SCRAPER_API_URL') || 'http://localhost:3000';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ScrapeResult {
  success: boolean;
  petsFound: number;
  petsSaved: number;
  errors: string[];
  duration: number;
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main scraper function that calls the Next.js API
async function runScraper(location: string = 'Alabama', maxPets: number = 100): Promise<ScrapeResult> {
  const startTime = Date.now();
  const result: ScrapeResult = {
    success: false,
    petsFound: 0,
    petsSaved: 0,
    errors: [],
    duration: 0
  };

  try {
    // Call the bulletproof scraper API endpoint
    const apiUrl = `${SCRAPER_API_URL}/api/petreunion/scrape-facebook-bulletproof`;
    
    console.log(`[CRON] Calling scraper API: ${apiUrl}`);
    console.log(`[CRON] Location: ${location}, Max pets: ${maxPets}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location,
        maxPets,
        strategies: ['graph-api']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (data.success) {
      result.success = true;
      result.petsFound = data.summary?.totalFound || 0;
      result.petsSaved = data.summary?.totalSaved || 0;
      
      // Collect errors from all strategies
      if (data.results && Array.isArray(data.results)) {
        data.results.forEach((r: any) => {
          if (r.errors && Array.isArray(r.errors)) {
            result.errors.push(...r.errors);
          }
        });
      }
    } else {
      result.errors.push(data.error || 'Scraper returned unsuccessful result');
    }

  } catch (error: any) {
    console.error('[CRON] Scraper error:', error);
    result.errors.push(error.message || 'Unknown error occurred');
  } finally {
    result.duration = Date.now() - startTime;
  }

  return result;
}

// Log results to database for monitoring
async function logScrapeResult(result: ScrapeResult, location: string): Promise<void> {
  try {
    // Create scrape_logs table if it doesn't exist (run this SQL first)
    // CREATE TABLE IF NOT EXISTS scrape_logs (
    //   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    //   location TEXT NOT NULL,
    //   pets_found INTEGER DEFAULT 0,
    //   pets_saved INTEGER DEFAULT 0,
    //   errors TEXT[],
    //   duration_ms INTEGER,
    //   success BOOLEAN,
    //   created_at TIMESTAMPTZ DEFAULT NOW()
    // );
    
    const { error } = await supabase
      .from('scrape_logs')
      .insert({
        location,
        pets_found: result.petsFound,
        pets_saved: result.petsSaved,
        errors: result.errors.length > 0 ? result.errors : null,
        duration_ms: result.duration,
        success: result.success
      });

    if (error) {
      console.error('[CRON] Error logging scrape result:', error);
    }
  } catch (error) {
    console.error('[CRON] Exception logging scrape result:', error);
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  try {
    // Validate configuration
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({
        error: 'Configuration error',
        message: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body (optional - can run with defaults)
    let requestBody: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (e) {
      // Use defaults if body is empty or invalid
    }

    const location = requestBody.location || 'Alabama';
    const maxPets = requestBody.maxPets || 100;

    console.log(`[CRON] Starting Facebook pet scraper...`);
    console.log(`[CRON] Location: ${location}`);
    console.log(`[CRON] Max pets: ${maxPets}`);

    // Run scraper
    const result = await runScraper(location, maxPets);

    // Log result
    await logScrapeResult(result, location);

    // Return response
    return new Response(JSON.stringify({
      success: result.success,
      message: `Scraped ${result.petsFound} pets, saved ${result.petsSaved} to database`,
      result: {
        petsFound: result.petsFound,
        petsSaved: result.petsSaved,
        errors: result.errors,
        duration: result.duration
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[CRON] Fatal error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message || 'Unknown error',
      success: false
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});





