// =================================================================
// ENHANCED SMART SCRAPER WITH SCRAPINGBEE-INSPIRED IMPROVEMENTS
// Features: User-Agent rotation, retry logic, delays, monitoring, etc.
// =================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =================================================================
// SCRAPINGBEE-INSPIRED UTILITIES
// =================================================================

// 1. USER-AGENT ROTATION
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// 2. REALISTIC BROWSER HEADERS
function getRealisticHeaders(additionalHeaders = {}) {
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'DNT': '1',
    ...additionalHeaders,
  };
}

// 3. REQUEST DELAYS
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function randomDelay(minMs = 1000, maxMs = 3000) {
  const delayMs = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  await delay(delayMs);
}

// 4. RETRY LOGIC WITH EXPONENTIAL BACKOFF
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add delay before retry (except first attempt)
      if (attempt > 0) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        await delay(backoffMs);
        console.log(`[RETRY] Attempt ${attempt + 1}/${maxRetries} for ${url} after ${backoffMs}ms delay`);
      }
      
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      // Don't retry on 404 or 403 (permanent failures)
      if (response.status === 404 || response.status === 403) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Retry on 429 (rate limit) or 5xx errors
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        continue;
      }
      
      // For other errors, throw immediately
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      lastError = error;
      
      // Don't retry on network errors for last attempt
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Continue to retry
      continue;
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// 5. COOKIE/SESSION MANAGEMENT
class SessionManager {
  constructor() {
    this.cookies = new Map();
  }
  
  parseCookies(setCookieHeader) {
    if (!setCookieHeader) return;
    
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    
    for (const cookie of cookies) {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=').map(s => s.trim());
      if (name && value) {
        this.cookies.set(name, value);
      }
    }
  }
  
  getCookieHeader() {
    if (this.cookies.size === 0) return '';
    
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
  
  async fetchWithSession(url, options = {}) {
    const cookieHeader = this.getCookieHeader();
    
    const headers = {
      ...getRealisticHeaders(),
      ...(options.headers || {}),
    };
    
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    
    const response = await fetchWithRetry(url, {
      ...options,
      headers,
    }, options.maxRetries || 3);
    
    // Extract and store cookies from response
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      this.parseCookies(setCookie);
    }
    
    return response;
  }
  
  clear() {
    this.cookies.clear();
  }
}

// 6. SCRAPER MONITORING
class ScraperMonitor {
  constructor() {
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      blocked: 0,
      retries: 0,
      totalDelay: 0,
      startTime: Date.now(),
    };
  }
  
  async trackRequest(fn, source = 'unknown') {
    this.stats.requests++;
    const startTime = Date.now();
    
    try {
      const result = await fn();
      this.stats.successes++;
      const duration = Date.now() - startTime;
      console.log(`[MONITOR] ${source}: SUCCESS (${duration}ms)`);
      return result;
    } catch (error) {
      this.stats.failures++;
      const duration = Date.now() - startTime;
      
      if (error.message?.includes('403') || error.message?.includes('429')) {
        this.stats.blocked++;
        console.error(`[MONITOR] ${source}: BLOCKED (${duration}ms) - ${error.message}`);
      } else {
        console.error(`[MONITOR] ${source}: FAILED (${duration}ms) - ${error.message}`);
      }
      
      throw error;
    }
  }
  
  recordRetry() {
    this.stats.retries++;
  }
  
  recordDelay(ms) {
    this.stats.totalDelay += ms;
  }
  
  getStats() {
    const duration = Date.now() - this.stats.startTime;
    return {
      ...this.stats,
      successRate: this.stats.requests > 0 
        ? ((this.stats.successes / this.stats.requests) * 100).toFixed(2) + '%'
        : '0%',
      averageDelay: this.stats.requests > 0
        ? (this.stats.totalDelay / this.stats.requests).toFixed(0) + 'ms'
        : '0ms',
      duration: duration + 'ms',
    };
  }
  
  reset() {
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      blocked: 0,
      retries: 0,
      totalDelay: 0,
      startTime: Date.now(),
    };
  }
}

// 7. GEO-TARGETING (for location-specific scraping)
const GEO_HEADERS = {
  'alabama': {
    'Accept-Language': 'en-US,en;q=0.9',
    'X-Forwarded-For': '192.168.1.1', // Would use actual proxy IP in production
  },
  'florida': {
    'Accept-Language': 'en-US,en;q=0.9',
    'X-Forwarded-For': '192.168.1.2',
  },
  'mississippi': {
    'Accept-Language': 'en-US,en;q=0.9',
    'X-Forwarded-For': '192.168.1.3',
  },
};

function getGeoHeaders(location) {
  const normalized = location?.toLowerCase();
  return GEO_HEADERS[normalized] || {};
}

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

  // Initialize monitoring and session management
  const monitor = new ScraperMonitor();
  const sessionManager = new SessionManager();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { mode, sources, filterState, maxBoats } = await req.json();
    const targetBoatCount = maxBoats || 10;

    console.log(`[SCRAPER] Starting: mode=${mode}, sources=${sources}, target=${targetBoatCount} boats`);

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
      monitorStats: null, // Will be populated at end
    };

    // =================================================================
    // ACTUAL SCRAPING IMPLEMENTATIONS (WITH IMPROVEMENTS)
    // =================================================================

    const scrapeSources = {
      // The Hull Truth - Charter Boat Forum
      thehulltruth: async () => {
        return await monitor.trackRequest(async () => {
          try {
            const boats = [];
            const baseUrl = 'https://www.thehulltruth.com';
            
            // Fetch with retry, realistic headers, and session
            const response = await sessionManager.fetchWithSession(
              `${baseUrl}/boating-forum/charter-boat-business/`,
              {
                maxRetries: 3,
              }
            );
            
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            
            const threads = doc.querySelectorAll('.discussionListItem');
            let count = 0;
            
            for (const thread of threads) {
              if (count >= targetBoatCount) break;
              
              // Add delay between requests
              if (count > 0) {
                await randomDelay(1000, 2000);
                monitor.recordDelay(1500); // Average delay
              }
              
              try {
                const titleEl = thread.querySelector('.title a');
                const title = titleEl?.textContent?.trim() || '';
                const threadUrl = titleEl?.getAttribute('href') || '';
                
                if (!title.match(/charter|fishing|boat|captain/i)) continue;
                
                // Fetch thread details with retry
                const threadResponse = await sessionManager.fetchWithSession(
                  `${baseUrl}${threadUrl}`,
                  { maxRetries: 2 }
                );
                const threadHtml = await threadResponse.text();
                const threadDoc = new DOMParser().parseFromString(threadHtml, 'text/html');
                
                const postContent = threadDoc.querySelector('.messageContent article')?.textContent || '';
                
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
                console.error('[ERROR] Processing thread:', error);
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
            throw error;
          }
        }, 'thehulltruth');
      },

      // Craigslist - Charter Fishing Listings
      craigslist: async () => {
        return await monitor.trackRequest(async () => {
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
              
              // Add delay between states
              if (states.indexOf(state) > 0) {
                await randomDelay(2000, 4000);
                monitor.recordDelay(3000);
              }
              
              const siteCode = siteCodes[state];
              if (!siteCode) continue;
              
              const searchUrl = `https://${siteCode}.craigslist.org/search/boo?query=charter+fishing+captain`;
              
              try {
                // Use geo-targeted headers
                const geoHeaders = getGeoHeaders(state);
                const response = await fetchWithRetry(
                  searchUrl,
                  {
                    headers: getRealisticHeaders(geoHeaders),
                    maxRetries: 3,
                  }
                );
                
                const html = await response.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                
                const listings = doc.querySelectorAll('.result-row');
                
                for (const listing of listings) {
                  if (boats.length >= targetBoatCount) break;
                  
                  // Add delay between listings
                  if (listings.length > 0) {
                    await randomDelay(1500, 2500);
                    monitor.recordDelay(2000);
                  }
                  
                  try {
                    const titleEl = listing.querySelector('.result-title');
                    const title = titleEl?.textContent?.trim() || '';
                    const url = titleEl?.getAttribute('href') || '';
                    const priceEl = listing.querySelector('.result-price');
                    const price = priceEl ? parsePrice(priceEl.textContent) : null;
                    const locationEl = listing.querySelector('.result-hood');
                    const location = locationEl?.textContent?.trim().replace(/[()]/g, '') || null;
                    
                    // Fetch listing details with retry
                    const detailResponse = await fetchWithRetry(
                      url,
                      {
                        headers: getRealisticHeaders(geoHeaders),
                        maxRetries: 2,
                      }
                    );
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
                    console.error('[ERROR] Processing listing:', error);
                    results.errors.push({
                      source: 'craigslist',
                      error: error.message,
                    });
                  }
                }
              } catch (error) {
                console.error(`[ERROR] Scraping ${state}:`, error);
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
            throw error;
          }
        }, 'craigslist');
      },

      // Google Business Listings
      google: async () => {
        return await monitor.trackRequest(async () => {
          try {
            console.log('[GOOGLE] Scraping requires API key - skipping for now');
            return [];
          } catch (error) {
            results.errors.push({ source: 'google', error: error.message });
            throw error;
          }
        }, 'google');
      },

      // Facebook Marketplace
      facebook: async () => {
        return await monitor.trackRequest(async () => {
          try {
            console.log('[FACEBOOK] Scraping requires Graph API - skipping for now');
            return [];
          } catch (error) {
            results.errors.push({ source: 'facebook', error: error.message });
            throw error;
          }
        }, 'facebook');
      },
    };

    // =================================================================
    // HELPER FUNCTIONS
    // =================================================================

    function extractCaptainName(title, content) {
      const captainMatch = content.match(/(?:captain|capt\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
      if (captainMatch) return captainMatch[1];
      
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
      
      for (const field of REQUIRED_FIELDS) {
        if (!boat[field] || boat[field] === null || boat[field] === '') {
          missingFields.push(field);
          validation.isComplete = false;
        }
      }
      
      validation.missingFields = missingFields;
      
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
        console.log(`[SCRAPER] Scraping ${source}...`);
        try {
          const boats = await scrapeSources[source]();
          results.scrapedBoats.push(...boats);
        } catch (error) {
          console.error(`[SCRAPER] Error scraping ${source}:`, error);
          results.errors.push({
            source: source,
            error: error.message,
          });
        }
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
        continue;
      }

      // =================================================================
      // SAVE TO DATABASE
      // =================================================================

      const { data: existing } = await supabaseClient
        .from('scraped_boats')
        .select('*')
        .or(`name.eq.${boat.name},phone.eq.${boat.phone},email.eq.${boat.email}`)
        .maybeSingle();

      if (existing) {
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

    // Get final monitor stats
    results.monitorStats = monitor.getStats();
    console.log('[MONITOR] Final Stats:', results.monitorStats);

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
      monitor_stats: results.monitorStats,
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
          monitorStats: results.monitorStats,
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
        monitorStats: results.monitorStats,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[SCRAPER] Fatal error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      stack: error.stack,
      monitorStats: monitor.getStats(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
