// =================================================================
// ENHANCED SMART SCRAPER WITH VALIDATION & FAILURE REPORTING
// =================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Required fields for a complete boat listing
const REQUIRED_FIELDS = [
  'name',
  'location',
  'captain',
  'phone',
  'boat_type',
  'length',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { mode, sources, filterState, maxBoats } = await req.json();
    const targetBoatCount = maxBoats || 10; // Default to 10 boats

    console.log(`Starting scraper: mode=${mode}, sources=${sources}, target=${targetBoatCount} boats`);

    const results = {
      mode,
      timestamp: new Date().toISOString(),
      targetBoats: targetBoatCount,
      scrapedBoats: [],
      completeBoats: [],
      incompleteBoats: [],
      failures: [],
      newBoats: 0,
      updatedBoats: 0,
      errors: [],
    };

    // =================================================================
    // ACTUAL SCRAPING IMPLEMENTATIONS
    // =================================================================

    const scrapeSources = {
      // The Hull Truth - Charter Boat Forum
      thehulltruth: async () => {
        try {
          const boats = [];
          const baseUrl = 'https://www.thehulltruth.com';
          
          // Scrape charter boat business forum
          const response = await fetch(`${baseUrl}/boating-forum/charter-boat-business/`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          
          const html = await response.text();
          const doc = new DOMParser().parseFromString(html, 'text/html');
          
          // Find thread listings
          const threads = doc.querySelectorAll('.discussionListItem');
          let count = 0;
          
          for (const thread of threads) {
            if (count >= targetBoatCount) break;
            
            try {
              const titleEl = thread.querySelector('.title a');
              const title = titleEl?.textContent?.trim() || '';
              const threadUrl = titleEl?.getAttribute('href') || '';
              
              // Only process if it looks like a charter listing
              if (!title.match(/charter|fishing|boat|captain/i)) continue;
              
              // Fetch thread details
              const threadResponse = await fetch(`${baseUrl}${threadUrl}`);
              const threadHtml = await threadResponse.text();
              const threadDoc = new DOMParser().parseFromString(threadHtml, 'text/html');
              
              const postContent = threadDoc.querySelector('.messageContent article')?.textContent || '';
              
              // Extract information using regex
              const phoneMatch = postContent.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
              const emailMatch = postContent.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
              const locationMatch = postContent.match(/(Orange Beach|Gulf Shores|Destin|Pensacola|Panama City|Biloxi|Gulfport|Port Aransas|Galveston|New Orleans)/i);
              const boatTypeMatch = postContent.match(/(\d+)\s*(?:ft|foot|')\s*([\w\s]+)(?:boat|vessel|yacht)/i);
              
              const boat = {
                source: 'thehulltruth',
                name: title,
                captain: extractCaptainName(title, postContent),
                phone: phoneMatch ? phoneMatch[1] : null,
                email: emailMatch ? emailMatch[1] : null,
                location: locationMatch ? locationMatch[1] : null,
                boat_type: boatTypeMatch ? boatTypeMatch[2].trim() : null,
                length: boatTypeMatch ? parseInt(boatTypeMatch[1]) : null,
                description: postContent.substring(0, 500),
                source_url: `${baseUrl}${threadUrl}`,
                source_post_id: threadUrl.split('/').pop(),
              };
              
              boats.push(boat);
              count++;
              
            } catch (error) {
              console.error('Error processing thread:', error);
              results.errors.push({
                source: 'thehulltruth',
                error: error.message,
                url: threadUrl,
              });
            }
          }
          
          return boats;
        } catch (error) {
          results.errors.push({ source: 'thehulltruth', error: error.message });
          return [];
        }
      },

      // Craigslist - Charter Fishing Listings
      craigslist: async () => {
        try {
          const boats = [];
          const states = filterState ? [filterState.toLowerCase()] : ['alabama', 'florida', 'mississippi'];
          const siteCodes = {
            alabama: 'auburn',
            florida: 'pensacola',
            mississippi: 'gulfport',
            louisiana: 'neworleans',
            texas: 'galveston',
          };
          
          for (const state of states) {
            if (boats.length >= targetBoatCount) break;
            
            const siteCode = siteCodes[state];
            if (!siteCode) continue;
            
            const searchUrl = `https://${siteCode}.craigslist.org/search/boo?query=charter+fishing+captain`;
            
            try {
              const response = await fetch(searchUrl);
              if (!response.ok) continue;
              
              const html = await response.text();
              const doc = new DOMParser().parseFromString(html, 'text/html');
              
              const listings = doc.querySelectorAll('.result-row');
              
              for (const listing of listings) {
                if (boats.length >= targetBoatCount) break;
                
                try {
                  const titleEl = listing.querySelector('.result-title');
                  const title = titleEl?.textContent?.trim() || '';
                  const url = titleEl?.getAttribute('href') || '';
                  const priceEl = listing.querySelector('.result-price');
                  const price = priceEl ? parsePrice(priceEl.textContent) : null;
                  const locationEl = listing.querySelector('.result-hood');
                  const location = locationEl?.textContent?.trim().replace(/[()]/g, '') || null;
                  
                  // Fetch listing details
                  const detailResponse = await fetch(url);
                  const detailHtml = await detailResponse.text();
                  const detailDoc = new DOMParser().parseFromString(detailHtml, 'text/html');
                  
                  const bodyText = detailDoc.querySelector('#postingbody')?.textContent || '';
                  const phoneMatch = bodyText.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
                  const boatMatch = bodyText.match(/(\d+)\s*(?:ft|foot|')\s*([\w\s]+)?/i);
                  
                  const boat = {
                    source: 'craigslist',
                    name: title,
                    captain: extractCaptainName(title, bodyText),
                    phone: phoneMatch ? phoneMatch[1] : null,
                    location: location || `${siteCode}, ${state}`,
                    boat_type: boatMatch ? boatMatch[2]?.trim() : null,
                    length: boatMatch ? parseInt(boatMatch[1]) : null,
                    price: price,
                    price_type: 'per_trip',
                    description: bodyText.substring(0, 500),
                    source_url: url,
                    source_post_id: url.split('/').pop().split('.')[0],
                  };
                  
                  boats.push(boat);
                  
                } catch (error) {
                  console.error('Error processing listing:', error);
                  results.errors.push({
                    source: 'craigslist',
                    error: error.message,
                  });
                }
              }
            } catch (error) {
              console.error(`Error scraping ${state}:`, error);
              results.errors.push({
                source: 'craigslist',
                state: state,
                error: error.message,
              });
            }
          }
          
          return boats;
        } catch (error) {
          results.errors.push({ source: 'craigslist', error: error.message });
          return [];
        }
      },

      // Google Business Listings (using Google Maps API)
      google: async () => {
        try {
          const boats = [];
          const locations = filterState 
            ? [`charter fishing ${filterState}`]
            : ['charter fishing Orange Beach AL', 'charter fishing Destin FL', 'charter fishing Biloxi MS'];
          
          // Note: This requires Google Places API key
          // For now, returning placeholder data
          // In production, use: https://maps.googleapis.com/maps/api/place/textsearch/json
          
          console.log('Google scraping requires API key - skipping for now');
          return boats;
          
        } catch (error) {
          results.errors.push({ source: 'google', error: error.message });
          return [];
        }
      },

      // Facebook Marketplace (requires authentication)
      facebook: async () => {
        try {
          // Facebook scraping requires Graph API access
          // Placeholder for now
          console.log('Facebook scraping requires Graph API - skipping for now');
          return [];
        } catch (error) {
          results.errors.push({ source: 'facebook', error: error.message });
          return [];
        }
      },
    };

    // =================================================================
    // HELPER FUNCTIONS
    // =================================================================

    function extractCaptainName(title, content) {
      // Try to find captain name
      const captainMatch = content.match(/(?:captain|capt\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
      if (captainMatch) return captainMatch[1];
      
      // Try to find name in title
      const nameMatch = title.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (nameMatch) return nameMatch[1];
      
      return null;
    }

    function parsePrice(priceText) {
      const match = priceText.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
      return match ? parseFloat(match[1].replace(/,/g, '')) : null;
    }

    function validateBoat(boat) {
      const missingFields = [];
      const validation = {
        isComplete: true,
        missingFields: [],
        hasMinimumInfo: false,
      };
      
      // Check required fields
      for (const field of REQUIRED_FIELDS) {
        if (!boat[field] || boat[field] === null || boat[field] === '') {
          missingFields.push(field);
          validation.isComplete = false;
        }
      }
      
      validation.missingFields = missingFields;
      
      // Check if we have minimum info (name + location + at least one contact)
      const hasContact = boat.phone || boat.email;
      validation.hasMinimumInfo = boat.name && boat.location && hasContact;
      
      return validation;
    }

    // =================================================================
    // RUN SCRAPERS
    // =================================================================

    for (const source of sources) {
      if (results.scrapedBoats.length >= targetBoatCount) break;
      
      if (scrapeSources[source]) {
        console.log(`Scraping ${source}...`);
        const boats = await scrapeSources[source]();
        results.scrapedBoats.push(...boats);
      }
    }

    // Limit to target count
    results.scrapedBoats = results.scrapedBoats.slice(0, targetBoatCount);

    // =================================================================
    // VALIDATE & PROCESS SCRAPED DATA
    // =================================================================

    for (const boat of results.scrapedBoats) {
      const validation = validateBoat(boat);
      
      if (validation.isComplete) {
        results.completeBoats.push(boat);
      } else if (validation.hasMinimumInfo) {
        results.incompleteBoats.push({
          ...boat,
          missingFields: validation.missingFields,
        });
      } else {
        results.failures.push({
          boat: boat,
          reason: 'Missing critical information',
          missingFields: validation.missingFields,
        });
        continue; // Skip saving this boat
      }

      // =================================================================
      // SAVE TO DATABASE
      // =================================================================

      // Check if boat already exists (by name, phone, or email)
      const { data: existing } = await supabaseClient
        .from('scraped_boats')
        .select('*')
        .or(`name.eq.${boat.name},phone.eq.${boat.phone},email.eq.${boat.email}`)
        .maybeSingle();

      if (existing) {
        // Update existing boat
        const { error } = await supabaseClient
          .from('scraped_boats')
          .update({
            ...boat,
            last_seen: new Date().toISOString(),
            times_seen: existing.times_seen + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (!error) {
          results.updatedBoats++;
        } else {
          results.errors.push({
            boat: boat.name,
            error: error.message,
            action: 'update',
          });
        }
      } else {
        // Insert new boat
        const { error } = await supabaseClient
          .from('scraped_boats')
          .insert({
            ...boat,
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            times_seen: 1,
            claimed: false,
            data_complete: validation.isComplete,
          });

        if (!error) {
          results.newBoats++;
        } else {
          results.errors.push({
            boat: boat.name,
            error: error.message,
            action: 'insert',
          });
        }
      }
    }

    // =================================================================
    // SAVE SCRAPER RUN LOG
    // =================================================================

    await supabaseClient.from('scraper_logs').insert({
      mode,
      sources,
      filter_state: filterState,
      target_boats: targetBoatCount,
      boats_scraped: results.scrapedBoats.length,
      complete_boats: results.completeBoats.length,
      incomplete_boats: results.incompleteBoats.length,
      new_boats: results.newBoats,
      updated_boats: results.updatedBoats,
      failures_count: results.failures.length,
      errors_count: results.errors.length,
      errors: results.errors.length > 0 ? results.errors : null,
      started_at: results.timestamp,
      completed_at: new Date().toISOString(),
    });

    // =================================================================
    // SAVE FAILURE REPORT
    // =================================================================

    if (results.failures.length > 0 || results.incompleteBoats.length > 0) {
      await supabaseClient.from('scraper_failure_reports').insert({
        run_timestamp: results.timestamp,
        mode,
        sources,
        total_failures: results.failures.length,
        total_incomplete: results.incompleteBoats.length,
        failures: results.failures,
        incomplete_boats: results.incompleteBoats,
        created_at: new Date().toISOString(),
      });
    }

    // =================================================================
    // SEND NOTIFICATIONS
    // =================================================================

    if (results.newBoats > 0) {
      await supabaseClient.from('notifications').insert({
        type: 'scraper_results',
        title: `🔍 Scraper Found ${results.newBoats} New Boats!`,
        message: `Complete: ${results.completeBoats.length}, Incomplete: ${results.incompleteBoats.length}, Failed: ${results.failures.length}`,
        user_id: null,
        link_url: '/admin/scraper-reports',
        metadata: {
          completeBoats: results.completeBoats.length,
          incompleteBoats: results.incompleteBoats.length,
          failures: results.failures.length,
        },
      });
    }

    // =================================================================
    // RETURN RESULTS
    // =================================================================

    return new Response(JSON.stringify({
      success: true,
      ...results,
      summary: {
        targeted: targetBoatCount,
        found: results.scrapedBoats.length,
        complete: results.completeBoats.length,
        incomplete: results.incompleteBoats.length,
        saved: results.newBoats + results.updatedBoats,
        failed: results.failures.length,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Scraper error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      stack: error.stack,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
