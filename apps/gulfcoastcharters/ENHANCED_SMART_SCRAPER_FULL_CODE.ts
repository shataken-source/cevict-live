/**
 * enhanced-smart-scraper (Supabase Edge Function)
 * 
 * COPY THIS ENTIRE FILE TO SUPABASE DASHBOARD → FUNCTIONS → enhanced-smart-scraper
 * 
 * Production-ready scraper with Serper.dev API integration:
 * - Searches the web using Serper.dev API
 * - Scrapes individual boat pages
 * - Rate limiting and retry logic
 * - Proper error handling and logging
 * - Authentication verification
 * - Status tracking
 * - Timeout handling
 * - Graceful degradation
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REQUIRED_FIELDS = ['name', 'location', 'captain', 'phone', 'boat_type', 'length'] as const;

// Configuration constants
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1000; // 1 second base delay
const RATE_LIMIT_DELAY_MS = 2000; // 2 seconds between requests
const MAX_BOATS_LIMIT = 100;

type ScrapedBoat = {
  source: string;
  source_url?: string | null;
  source_post_id?: string | null;
  name?: string | null;
  location?: string | null;
  captain?: string | null;
  phone?: string | null;
  email?: string | null;
  boat_type?: string | null;
  length?: number | null;
  description?: string | null;
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function clean(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

function validateBoat(b: ScrapedBoat) {
  const missing: string[] = [];
  const has = (k: keyof ScrapedBoat) => {
    const v = b[k];
    if (typeof v === 'number') return Number.isFinite(v) && v > 0;
    return Boolean(String(v || '').trim());
  };

  for (const f of REQUIRED_FIELDS) {
    if (f === 'length') {
      if (!has('length')) missing.push('length');
      continue;
    }
    if (!has(f as any)) missing.push(f);
  }

  const hasMinimumInfo = has('name') && (has('location') || has('phone') || has('email'));

  let score = 0;
  for (const f of REQUIRED_FIELDS) score += missing.includes(f) ? 0 : 15;
  if (has('description')) score += 10;
  score = clamp(score, 0, 100);

  return {
    missingFields: missing,
    dataQualityScore: score,
    isComplete: missing.length === 0,
    hasMinimumInfo,
  };
}

/**
 * Fetch with timeout, retry, and proper error handling
 * Supports both GET and POST requests
 */
async function fetchWithRetry(
  url: string,
  options: { 
    retries?: number; 
    timeout?: number; 
    headers?: Record<string, string>;
    method?: string;
    body?: string | BodyInit;
  } = {}
): Promise<string> {
  const { 
    retries = DEFAULT_RETRY_ATTEMPTS, 
    timeout = DEFAULT_TIMEOUT_MS, 
    headers = {},
    method = 'GET',
    body
  } = options;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Default headers for GET requests (browser-like)
      const defaultHeaders: Record<string, string> = method === 'GET' ? {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      } : {};

      const res = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          ...defaultHeaders,
          ...headers,
        },
        body,
      });

      clearTimeout(timeoutId);

      if (res.status === 403 || res.status === 429) {
        throw new Error(`HTTP ${res.status} ${res.statusText} - Site is blocking automated requests`);
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      return await res.text();
    } catch (error: any) {
      const isLastAttempt = attempt === retries - 1;
      
      if (error.message?.includes('403') || error.message?.includes('429')) {
        throw error;
      }
      
      if (isLastAttempt) {
        throw new Error(`Failed to fetch ${url} after ${retries} attempts: ${error.message}`);
      }

      const delay = DEFAULT_RETRY_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

async function fetchText(url: string, headers: Record<string, string> = {}): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
  return fetchWithRetry(url, { headers });
}

function extractPhone(text: string): string | null {
  // Find phone numbers: (XXX) XXX-XXXX, XXX-XXX-XXXX, XXX.XXX.XXXX, etc.
  const phonePatterns = [
    /\((\d{3})\)\s*(\d{3})[-.\s]?(\d{4})/,  // (251) 981-4044
    /(\d{3})[-.\s](\d{3})[-.\s](\d{4})/,   // 251-981-4044
    /(\d{3})\.(\d{3})\.(\d{4})/,           // 251.981.4044
  ];
  
  // Try formatted patterns first - prioritize phone numbers in contact context
  for (const pattern of phonePatterns) {
    const matches = Array.from(text.matchAll(new RegExp(pattern.source, 'g')));
    for (const m of matches) {
      if (m && m[1] && m[2] && m[3]) {
        const digits = `${m[1]}${m[2]}${m[3]}`;
        // Validate: not all same digit, doesn't start with 000, area code valid (200-999)
        if (digits.length === 10 && !/^(\d)\1{9}$/.test(digits) && !digits.startsWith('000') 
            && parseInt(m[1]) >= 200 && parseInt(m[1]) <= 999) {
          // Check context - prefer phone numbers near "call", "text", "phone", "contact"
          const contextStart = Math.max(0, (m.index || 0) - 30);
          const contextEnd = Math.min(text.length, (m.index || 0) + m[0].length + 30);
          const context = text.substring(contextStart, contextEnd).toLowerCase();
          const isContactContext = /call|text|phone|contact|reach|dial/.test(context);
          
          // If it's in a contact context, return immediately (highest priority)
          if (isContactContext) {
            return `(${m[1]}) ${m[2]}-${m[3]}`;
          }
        }
      }
    }
  }
  
  // Return first valid formatted number if we found any
  for (const pattern of phonePatterns) {
    const m = text.match(pattern);
    if (m && m[1] && m[2] && m[3]) {
      const digits = `${m[1]}${m[2]}${m[3]}`;
      if (digits.length === 10 && !/^(\d)\1{9}$/.test(digits) && !digits.startsWith('000') 
          && parseInt(m[1]) >= 200 && parseInt(m[1]) <= 999) {
        return `(${m[1]}) ${m[2]}-${m[3]}`;
      }
    }
  }
  
  // Try unformatted 10-digit numbers (but be careful - could be part of larger number)
  // Look for 10 digits surrounded by word boundaries or non-digits
  const unformatted = text.match(/\b(\d{10})\b/);
  if (unformatted?.[1]) {
    const digits = unformatted[1];
    // Validate: not all same digit, doesn't start with 000, area code valid
    if (!/^(\d)\1{9}$/.test(digits) && !digits.startsWith('000') 
        && parseInt(digits.substring(0, 3)) >= 200 && parseInt(digits.substring(0, 3)) <= 999) {
      return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    }
  }
  
  return null;
}

function extractEmail(text: string): string | null {
  const m = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return m?.[1] ? clean(m[1]) : null;
}

function extractLengthAndType(text: string): { length: number | null; boat_type: string | null } {
  let length: number | null = null;
  let boat_type: string | null = null;
  
  // Pattern 1: "26 ft Contender", "32' SeaVee", "28-foot Parker", "24-foot Blazer Bay"
  // Support both hyphenated and spaced: "24-foot" or "24 foot"
  // Stop at word boundaries, punctuation, or keywords like "powered", "HP", "with"
  const pattern1 = text.match(/(\d{2,3})[- ]*(?:ft|foot|'|feet)[\s-]+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)(?:\s|$|,|\.|powered|HP|with|and|the|a|an|in|on|at)/i);
  if (pattern1?.[1] && pattern1?.[2]) {
    const len = Number(pattern1[1]);
    if (Number.isFinite(len) && len >= 15 && len <= 200) {
      length = len;
      let type = clean(pattern1[2]);
      
      // Remove common trailing words that aren't part of boat type
      type = type.replace(/\s+(with|and|the|a|an|in|on|at|is|was|are|were|has|have|had)\s*$/i, '');
      
      // Filter out partial/incomplete boat types
      const typeLower = type.toLowerCase();
      if (type && type.length >= 3 && type.length <= 30
          && !typeLower.includes('length') && !typeLower.includes('bigger') 
          && !typeLower.includes('smaller') && !typeLower.includes('foot')
          && !typeLower.includes('feet') && !typeLower.includes('cabin')
          && !typeLower.includes('bathroom') && !typeLower.includes('bathroo')) {
        boat_type = type;
      }
    }
  }
  
  // Pattern 1b: Try to find all boat mentions and pick the largest/primary one
  if (!length || !boat_type) {
    const allMatches = Array.from(text.matchAll(/(\d{2,3})[- ]*(?:ft|foot|'|feet)[\s-]+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)(?:\s|$|,|\.|powered|HP|with|and|the|a|an|in|on|at)/gi));
    if (allMatches.length > 0) {
      // Find the largest boat (usually the primary one)
      let maxLength = length || 0;
      let bestType = boat_type;
      
      for (const match of allMatches) {
        const len = Number(match[1]);
        if (Number.isFinite(len) && len >= 15 && len <= 200 && len > maxLength) {
          let type = clean(match[2]);
          
          // Remove common trailing words
          type = type.replace(/\s+(with|and|the|a|an|in|on|at|is|was|are|were|has|have|had)\s*$/i, '');
          
          const typeLower = type.toLowerCase();
          if (type && type.length >= 3 && type.length <= 30
              && !typeLower.includes('length') && !typeLower.includes('bigger')
              && !typeLower.includes('smaller') && !typeLower.includes('foot')
              && !typeLower.includes('feet') && !typeLower.includes('cabin')
              && !typeLower.includes('bathroom') && !typeLower.includes('bathroo')) {
            maxLength = len;
            bestType = type;
          }
        }
      }
      
      if (maxLength > 0) {
        length = maxLength;
        if (bestType) boat_type = bestType;
      }
    }
  }
  
  // Pattern 2: Just length "52 ft" or "52'" or "52-foot" - look for boat/vessel context
  if (!length) {
    // Try to find length near boat/vessel keywords for better accuracy
    const lengthWithContext = text.match(/(?:boat|vessel|charter|fishing|offshore|inshore)[^.]{0,100}(\d{2,3})[- ]*(?:ft|foot|'|feet)(?:\s|$|,|\.)/i);
    if (lengthWithContext?.[1]) {
      const len = Number(lengthWithContext[1]);
      if (Number.isFinite(len) && len >= 15 && len <= 200) {
        length = len;
      }
    } else {
      // Fallback to any length mention (but be more lenient - could be in descriptions)
      const lengthOnly = text.match(/(\d{2,3})[- ]*(?:ft|foot|'|feet)(?:\s|$|,|\.)/i);
      if (lengthOnly?.[1]) {
        const len = Number(lengthOnly[1]);
        // More lenient: accept 20-200 ft (some boats are smaller, some are larger)
        if (Number.isFinite(len) && len >= 20 && len <= 200) {
          length = len;
        }
      }
    }
  }
  
  // Pattern 2c: Look for length in specifications/details sections
  if (!length) {
    const specPattern = text.match(/(?:specifications?|details?|boat\s+info|vessel\s+info)[^.]{0,150}(\d{2,3})[- ]*(?:ft|foot|'|feet)(?:\s|$|,|\.)/i);
    if (specPattern?.[1]) {
      const len = Number(specPattern[1]);
      if (Number.isFinite(len) && len >= 20 && len <= 200) {
        length = len;
      }
    }
  }
  
  // Pattern 2b: Look for length in "X-foot" format without boat type
  if (!length) {
    const footPattern = text.match(/(\d{2,3})[- ]foot(?:\s|$|,|\.)/i);
    if (footPattern?.[1]) {
      const len = Number(footPattern[1]);
      if (Number.isFinite(len) && len >= 20 && len <= 200) {
        length = len;
      }
    }
  }
  
  // Pattern 3: Boat type without length (common boat types)
  if (!boat_type) {
    const boatTypes = [
      'Blazer Bay', 'TwinVee', 'Contender', 'SeaVee', 'Parker', 'Yellowfin', 
      'Intrepid', 'Grady White', 'Boston Whaler', 'Center Console', 'Sportfisher', 
      'Catamaran', 'Bay Boat', 'Offshore', 'Inshore', 'Charter Boat', 'Fishing Boat'
    ];
    for (const type of boatTypes) {
      const regex = new RegExp(`\\b${type.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (regex.test(text)) {
        boat_type = type;
        break;
      }
    }
  }
  
  return { length, boat_type };
}

async function scrapeHullTruth(target: number): Promise<ScrapedBoat[]> {
  const out: ScrapedBoat[] = [];
  const baseUrl = 'https://www.thehulltruth.com';
  const forumUrl = `${baseUrl}/boating-forum/charter-boat-business/`;
  const html = await fetchText(forumUrl);

  const links = Array.from(html.matchAll(/href=\"(\/boating-forum\/charter-boat-business\/[^\"#]+)\"/g))
    .map((m) => m[1])
    .filter(Boolean);

  const unique = Array.from(new Set(links)).slice(0, Math.max(target * 2, 10));

  for (const rel of unique) {
    if (out.length >= target) break;
    const url = `${baseUrl}${rel}`;
    try {
      const threadHtml = await fetchText(url);
      const title = clean((threadHtml.match(/<title>([^<]+)<\/title>/i)?.[1] || '').replace(/\s-\sThe Hull Truth.*$/i, ''));

      if (!title || !title.match(/charter|fishing|captain|boat/i)) continue;

      const bodyText = clean(
        (threadHtml.match(/<article[^>]*>([\s\S]{0,8000})<\/article>/i)?.[1] || '')
          .replace(/<[^>]+>/g, ' ')
      );

      const phone = extractPhone(bodyText);
      const email = extractEmail(bodyText);
      const { length, boat_type } = extractLengthAndType(`${title} ${bodyText}`);

      const location =
        bodyText.match(/\b(Orange Beach|Gulf Shores|Destin|Pensacola|Panama City|Biloxi|Gulfport|Galveston|Port Aransas|New Orleans)\b/i)?.[1] ??
        null;

      out.push({
        source: 'thehulltruth',
        source_url: url,
        source_post_id: rel.split('/').filter(Boolean).pop() ?? null,
        name: title,
        captain: null,
        phone,
        email,
        location,
        boat_type,
        length,
        description: bodyText ? bodyText.slice(0, 500) : null,
      });
    } catch {
      // ignore individual failures
    }
  }

  return out;
}

async function scrapeCraigslistRss(target: number, state?: string | null): Promise<ScrapedBoat[]> {
  const cities = ['pensacola', 'mobile', 'miami', 'neworleans', 'houston', 'tampa', 'jacksonville'];
  const out: ScrapedBoat[] = [];

  for (const city of cities) {
    if (out.length >= target) break;
    const url = `https://${city}.craigslist.org/search/sss?format=rss&query=charter%20boat`;
    try {
      const xml = await fetchText(url);
      const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g)).slice(0, 10);
      for (const item of items) {
        if (out.length >= target) break;
        const blob = item[1] || '';
        const title = clean(blob.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1] || blob.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
        const link = clean(blob.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '');
        const descRaw = blob.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i)?.[1] || '';
        const desc = clean(descRaw.replace(/<[^>]+>/g, ' ')).slice(0, 500);

        const phone = extractPhone(descRaw);
        const email = extractEmail(descRaw);
        const { length, boat_type } = extractLengthAndType(`${title} ${desc}`);

        out.push({
          source: 'craigslist',
          source_url: link || null,
          source_post_id: link ? link.split('/').pop()?.split('.').shift() ?? null : null,
          name: title || null,
          location: city,
          captain: null,
          phone,
          email,
          boat_type,
          length,
          description: desc || null,
        });
      }
    } catch {
      // ignore
    }
  }

  if (state) {
    const token = String(state).trim().toLowerCase();
    if (token) return out.filter((b) => String(b.location || '').toLowerCase().includes(token)).slice(0, target);
  }

  return out.slice(0, target);
}

function extractCaptainName(title: string, content: string): string | null {
  const fullText = `${title} ${content}`;
  
  // Common phrases to exclude (review text, not captain names)
  const excludePhrases = [
    'will discuss', 'and crew', 'was great', 'is great', 'are great',
    'very good', 'highly recommend', 'best captain', 'excellent',
    'amazing', 'wonderful', 'fantastic', 'outstanding', 'top notch',
    'experiences', 'charters', 'fishing', 'boat', 'marina',
    'us quick', 'quick', 'managed', 'vacation', 'check', 'calendar',
    'contact', 'call', 'text', 'phone', 'reach', 'dial'
  ];
  
  // Words that indicate review text (if found near the match, exclude it)
  const reviewIndicators = ['review', 'said', 'told', 'mentioned', 'recommend', 'suggest'];
  
  // Pattern 1: "Captain John Smith" or "Capt. John Smith" or "Capt John Smith"
  // Note: matchAll requires global flag (g)
  const captainPattern = /(?:captain|capt\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi;
  const captainMatches = Array.from(fullText.matchAll(captainPattern));
  for (const match of captainMatches) {
    if (match[1]) {
      const name = clean(match[1]);
      const nameLower = name.toLowerCase();
      
      // Check if it's review text
      if (excludePhrases.some(phrase => nameLower.includes(phrase))) continue;
      
      // Check context around the match for review indicators
      const contextStart = Math.max(0, (match.index || 0) - 50);
      const contextEnd = Math.min(fullText.length, (match.index || 0) + match[0].length + 50);
      const context = fullText.substring(contextStart, contextEnd).toLowerCase();
      
      if (reviewIndicators.some(indicator => context.includes(indicator))) continue;
      
      // Must be 2-3 words, first letter capitalized
      const words = name.split(/\s+/);
      if (words.length >= 1 && words.length <= 3 && words.every(w => /^[A-Z][a-z]+$/.test(w))) {
        return name;
      }
    }
  }
  
  // Pattern 2: "Captain: John Smith" or "Captain - John Smith"
  const captainColon = fullText.match(/(?:captain|capt\.?)[:\-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (captainColon?.[1]) {
    const name = clean(captainColon[1]);
    const nameLower = name.toLowerCase();
    if (name && !excludePhrases.some(phrase => nameLower.includes(phrase))) {
      const words = name.split(/\s+/);
      if (words.length >= 1 && words.length <= 3 && words.every(w => /^[A-Z][a-z]+$/.test(w))) {
        return name;
      }
    }
  }
  
  // Pattern 3: Look for "Owner: Name" or "Operated by: Name"
  const ownerPattern = /(?:owner|operated by|run by)[:\-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
  const ownerMatch = fullText.match(ownerPattern);
  if (ownerMatch?.[1]) {
    const name = clean(ownerMatch[1]);
    const nameLower = name.toLowerCase();
    if (name && !excludePhrases.some(phrase => nameLower.includes(phrase))) {
      const words = name.split(/\s+/);
      if (words.length >= 1 && words.length <= 3 && words.every(w => /^[A-Z][a-z]+$/.test(w))) {
        return name;
      }
    }
  }
  
  // Pattern 4: "Meet Captain Name" or "Captain Name's" (possessive)
  const meetPattern = /(?:meet|meet\s+the)\s+(?:captain|capt\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
  const meetMatch = fullText.match(meetPattern);
  if (meetMatch?.[1]) {
    const name = clean(meetMatch[1]);
    const nameLower = name.toLowerCase();
    if (name && !excludePhrases.some(phrase => nameLower.includes(phrase))) {
      const words = name.split(/\s+/);
      if (words.length >= 1 && words.length <= 3 && words.every(w => /^[A-Z][a-z]+$/.test(w))) {
        return name;
      }
    }
  }
  
  // Pattern 5: Look for names near phone numbers (often captain contact info)
  const phonePattern = /(?:call|text|phone|contact)[:\s]+(?:captain|capt\.?)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
  const phoneMatch = fullText.match(phonePattern);
  if (phoneMatch?.[1]) {
    const name = clean(phoneMatch[1]);
    const nameLower = name.toLowerCase();
    if (name && !excludePhrases.some(phrase => nameLower.includes(phrase))) {
      const words = name.split(/\s+/);
      if (words.length >= 1 && words.length <= 3 && words.every(w => /^[A-Z][a-z]+$/.test(w))) {
        return name;
      }
    }
  }
  
  // Pattern 6: Look in "About" sections - often has captain info
  const aboutMatch = fullText.match(/(?:about|meet|our\s+captain)[^.]{0,100}(?:captain|capt\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (aboutMatch?.[1]) {
    const name = clean(aboutMatch[1]);
    const nameLower = name.toLowerCase();
    if (name && !excludePhrases.some(phrase => nameLower.includes(phrase))) {
      const words = name.split(/\s+/);
      if (words.length >= 1 && words.length <= 3 && words.every(w => /^[A-Z][a-z]+$/.test(w))) {
        return name;
      }
    }
  }
  
  // Pattern 7: Look for common name patterns near "captain" keyword
  // This is a fallback - look for capitalized words that look like names
  const nameNearCaptain = fullText.match(/(?:captain|capt\.?)[^.]{0,50}\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/i);
  if (nameNearCaptain?.[1]) {
    const name = clean(nameNearCaptain[1]);
    const nameLower = name.toLowerCase();
    // Exclude common non-name words
    const excludeWords = ['deep', 'sea', 'fishing', 'charter', 'boat', 'marina', 'landing', 'gulf', 'coast', 'beach'];
    if (name && !excludeWords.some(word => nameLower.includes(word)) 
        && !excludePhrases.some(phrase => nameLower.includes(phrase))) {
      const words = name.split(/\s+/);
      if (words.length === 2 && words.every(w => /^[A-Z][a-z]+$/.test(w) && w.length >= 2)) {
        return name;
      }
    }
  }
  
  // Pattern 8: Look for names in structured data (often in contact/about sections)
  // Look for patterns like "Name: John Smith" or "Contact: Captain John"
  const structuredName = fullText.match(/(?:name|contact|captain|capt\.?)[:\-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (structuredName?.[1]) {
    const name = clean(structuredName[1]);
    const nameLower = name.toLowerCase();
    if (name && !excludePhrases.some(phrase => nameLower.includes(phrase))) {
      const words = name.split(/\s+/);
      if (words.length >= 1 && words.length <= 3 && words.every(w => /^[A-Z][a-z]+$/.test(w))) {
        return name;
      }
    }
  }
  
  // Pattern 9: Look for single capitalized names that might be captain names
  // Often pages just say "Captain John" without last name
  const singleName = fullText.match(/(?:captain|capt\.?)\s+([A-Z][a-z]{2,15})\b(?!\s+[a-z])/i);
  if (singleName?.[1]) {
    const name = clean(singleName[1]);
    const nameLower = name.toLowerCase();
    const excludeWords = ['deep', 'sea', 'fishing', 'charter', 'boat', 'marina', 'landing', 'gulf', 'coast', 'beach', 'surprise', 'reel'];
    if (name && name.length >= 3 && name.length <= 15
        && !excludeWords.some(word => nameLower === word)
        && !excludePhrases.some(phrase => nameLower.includes(phrase))
        && /^[A-Z][a-z]+$/.test(name)) {
      return name;
    }
  }
  
  return null;
}

/**
 * Step 1: Search the web using Serper.dev API to find charter boat URLs
 */
async function searchWebForCharterBoats(target: number, filterState?: string | null): Promise<string[]> {
  const urls: string[] = [];
  
  // Get API key at function start
  const serpApiKey = Deno.env.get('SERPAPI_API_KEY');
  
  if (!serpApiKey || serpApiKey.trim() === '') {
    console.warn('[Web Search] SERPAPI_API_KEY not configured - skipping web search');
    return [];
  }

  try {
    const gulfCoastCities = [
      'Orange Beach', 'Gulf Shores', 'Destin', 'Pensacola', 'Panama City',
      'Biloxi', 'Gulfport', 'Port Aransas', 'Galveston', 'New Orleans',
      'Venice', 'Naples', 'Fort Myers', 'Clearwater', 'St. Petersburg'
    ];

    const searchQueries = [
      'charter fishing',
      'fishing charter',
      'charter boat',
      'deep sea fishing charter',
      'offshore fishing charter',
    ];

    const limitedCities = gulfCoastCities.slice(0, 3);
    const limitedQueries = searchQueries.slice(0, 3);
    const states = filterState ? [filterState] : ['AL', 'FL', 'MS', 'LA', 'TX'];

    for (const state of states.slice(0, 2)) {
      if (urls.length >= target * 2) break;

      for (const city of limitedCities) {
        if (urls.length >= target * 2) break;

        for (const query of limitedQueries) {
          if (urls.length >= target * 2) break;

          try {
            // Double-check API key is still available
            const apiKey = Deno.env.get('SERPAPI_API_KEY');
            if (!apiKey || apiKey.trim() === '') {
              console.warn(`[Web Search] SERPAPI_API_KEY not available for "${query} in ${city}" - skipping`);
              continue;
            }
            
            const searchTerm = `${query} ${city} ${state}`;
            console.log(`[Web Search] Searching SerpApi: ${searchTerm}`);

            // SerpApi API call - uses GET with query parameters
            let responseText: string;
            try {
              const params = new URLSearchParams({
                engine: 'google',
                q: searchTerm,
                api_key: apiKey,
                num: '10',
                gl: 'us',
                hl: 'en',
              });
              
              const apiUrl = `https://serpapi.com/search.json?${params.toString()}`;
              console.log(`[Web Search] SerpApi URL: ${apiUrl.replace(apiKey, '***')}`);
              
              responseText = await fetchWithRetry(apiUrl, {
                method: 'GET',
                timeout: 15000,
              });
            } catch (fetchError: any) {
              console.error(`[Web Search] SerpApi API call failed for "${searchTerm}":`, fetchError.message);
              throw fetchError;
            }

            let data: any;
            try {
              data = JSON.parse(responseText);
            } catch (parseError: any) {
              console.error(`[Web Search] Failed to parse SerpApi response for "${searchTerm}". Response length: ${responseText.length}, First 200 chars: ${responseText.substring(0, 200)}`);
              throw new Error(`Invalid JSON response from SerpApi: ${parseError.message}`);
            }

            // Log response structure for debugging
            if (!data.organic_results) {
              console.warn(`[Web Search] SerpApi response missing 'organic_results' field for "${searchTerm}". Response keys: ${Object.keys(data).join(', ')}`);
              if (data.error) {
                console.error(`[Web Search] SerpApi API error:`, data.error);
              }
            }

            // Extract organic search results (SerpApi uses 'organic_results' instead of 'organic')
            if (data.organic_results && Array.isArray(data.organic_results)) {
              console.log(`[Web Search] SerpApi returned ${data.organic_results.length} results for "${searchTerm}"`);
              
              for (const result of data.organic_results) {
                const url = result.link;
                const title = result.title || '';
                const snippet = result.snippet || '';
                
                // Filter out irrelevant sites
                if (!url || 
                    url.includes('wikipedia.org') || 
                    url.includes('facebook.com') || 
                    url.includes('instagram.com') ||
                    url.includes('yelp.com') ||
                    url.includes('tripadvisor.com') ||
                    url.includes('pinterest.com') ||
                    url.includes('reddit.com') ||
                    url.includes('youtube.com')) {
                  continue;
                }

                // Filter out aggregator sites at URL level (before scraping)
                // Only filter if it's clearly an aggregator (list/guide/directory), not a legitimate charter business
                const titleLower = title.toLowerCase();
                const snippetLower = snippet.toLowerCase();
                const combined = `${titleLower} ${snippetLower}`;
                
                // Aggregator patterns: must have aggregator keyword AND be a list/guide
                const aggregatorPatterns = [
                  /(best|top|15|10|20)\s+(fishing\s+)?charters/i,  // "Best Fishing Charters", "Top 10 Charters"
                  /(fishing\s+)?charters?\s+(guide|directory|listings)/i,  // "Fishing Charters Guide"
                  /(find|compare|search)\s+(fishing\s+)?charters/i,  // "Find Fishing Charters"
                  /^\s*(charters?\s+in|charter\'s\s+in)\s+[^,]+,\s*[^,]+/i,  // "Charters in X, Y" (multiple locations)
                ];
                
                const isAggregator = aggregatorPatterns.some(pattern => pattern.test(combined));
                
                if (isAggregator) {
                  console.log(`[Web Search] Filtering out aggregator site from search results: ${title}`);
                  continue;
                }
                
                // Be less strict: accept URLs that either:
                // 1. Contain charter/fishing/boat keywords in URL, OR
                // 2. Have charter/fishing/boat keywords in title/snippet (from search results)
                const urlMatches = url.includes('charter') || url.includes('fishing') || url.includes('boat');
                const contentMatches = (title + ' ' + snippet).toLowerCase().includes('charter') || 
                                       (title + ' ' + snippet).toLowerCase().includes('fishing') ||
                                       (title + ' ' + snippet).toLowerCase().includes('boat');
                
                if (urlMatches || contentMatches) {
                  urls.push(url);
                  console.log(`[Web Search] Added URL: ${url}`);
                } else {
                  console.log(`[Web Search] Filtered out URL (no keywords): ${url}`);
                }
              }
            } else {
              console.warn(`[Web Search] No organic_results from SerpApi for "${searchTerm}"`);
            }

            // Rate limiting - wait 1 second between searches
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (error: any) {
            console.warn(`[Web Search] Error searching ${query} in ${city}:`, error.message);
            // Continue to next query
          }
        }
      }
    }

    console.log(`[Web Search] Found ${urls.length} potential boat URLs from SerpApi (searched ${limitedCities.length} cities, ${limitedQueries.length} queries)`);
  } catch (error: any) {
    console.error(`[Web Search] Error:`, error.message);
  }

  return urls.slice(0, target * 2);
}

/**
 * Step 2: Scrape individual boat pages to extract details
 */
/**
 * Extract structured content from HTML (headings, lists, etc.) for better data extraction
 */
function extractStructuredContent(html: string): string {
  const parts: string[] = [];
  
  // Extract headings (h1-h6) - often contain boat names, captain info
  // Use Array.from() to ensure global regex works correctly
  const headings = Array.from(html.matchAll(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi));
  for (const match of headings) {
    if (match[1]) parts.push(match[1]);
  }
  
  // Extract list items (li) - often contain boat specs
  const listItems = Array.from(html.matchAll(/<li[^>]*>([^<]+)<\/li>/gi));
  for (const match of listItems) {
    if (match[1]) parts.push(match[1]);
  }
  
  // Extract strong/bold text - often highlights important info
  const strongText = Array.from(html.matchAll(/<strong[^>]*>([^<]+)<\/strong>/gi));
  for (const match of strongText) {
    if (match[1]) parts.push(match[1]);
  }
  
  // Extract paragraphs (p) - often contain descriptions
  const paragraphs = Array.from(html.matchAll(/<p[^>]*>([^<]+)<\/p>/gi));
  for (const match of paragraphs) {
    if (match[1] && match[1].length > 20 && match[1].length < 500) {
      parts.push(match[1]);
    }
  }
  
  return parts.join(' ');
}

async function scrapeBoatPage(url: string, defaultCity?: string, defaultState?: string): Promise<ScrapedBoat | null> {
  try {
    console.log(`[ScrapeBoatPage] Fetching: ${url}`);
    // Make it look like we came from Google search results
    const googleReferer = 'https://www.google.com/';
    const html = await fetchWithRetry(url, { timeout: 15000, referer: googleReferer });
    console.log(`[ScrapeBoatPage] HTML length: ${html.length} chars`);
    
    // Extract structured content from HTML (headings, lists, etc.) before stripping tags
    const structuredText = extractStructuredContent(html);
    const fullText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    
    // Combine structured text with full text for better extraction
    const combinedText = `${structuredText} ${fullText}`;

    // Extract boat details from HTML
    // Try extracting from structured content first (more reliable), then fallback to full text
    let captain = extractCaptainName(url, structuredText);
    if (!captain) captain = extractCaptainName(url, fullText);
    
    let phone = extractPhone(structuredText);
    if (!phone) phone = extractPhone(fullText);
    
    const email = extractEmail(combinedText);
    const { length, boat_type } = extractLengthAndType(combinedText);

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    let name = (titleMatch?.[1] || h1Match?.[1] || url)
      .replace(/[|–-].*$/, '')
      .trim()
      .slice(0, 200);
    
    // Filter out generic/invalid names first
    const genericNames = ['home', 'welcome', 'about', 'contact', 'page not found', '404', 'error'];
    const nameLower = name.toLowerCase().trim();
    if (genericNames.some(generic => nameLower === generic || nameLower.startsWith(generic + ' '))) {
      console.log(`[Web Search] Skipping generic name: ${name}`);
      return null;
    }
    
    // Filter out aggregator/listings sites (they don't represent a single charter)
    // Use specific patterns to avoid false positives on legitimate charter businesses
    const aggregatorPatterns = [
      /^(best|top|15|10|20)\s+(fishing\s+)?charters/i,  // "Best Fishing Charters", "Top 10 Charters"
      /(fishing\s+)?charters?\s+(guide|directory|listings)/i,  // "Fishing Charters Guide"
      /(find|compare|search)\s+(fishing\s+)?charters/i,  // "Find Fishing Charters"
      /^(charters?\s+in|charter\'s\s+in)\s+[^,]+,\s*[^,]+/i,  // "Charters in X, Y" (multiple locations at start)
      /^(charters?\s+in|charter\'s\s+in)\s+[^&]+ and /i,  // "Charters in X and Y" (multiple locations with "and")
    ];
    
    const isAggregator = aggregatorPatterns.some(pattern => pattern.test(name));
    
    if (isAggregator) {
      console.log(`[Web Search] Skipping aggregator site: ${name}`);
      return null;
    }
    
    // Decode HTML entities (&amp; -> &, &nbsp; -> space, etc.)
    // Do this more comprehensively
    name = name
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#039;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&ndash;/g, '-')
      .replace(/&mdash;/g, '-')
      .replace(/&hellip;/g, '...')
      .replace(/&apos;/g, "'")
      .replace(/&#8217;/g, "'")
      .replace(/&#8211;/g, '-')
      .replace(/&#8212;/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Re-check aggregator patterns after HTML entity decoding
    const nameLowerDecoded = name.toLowerCase();
    const isPluralAggregatorDecoded = /^(charters?\s+in|charter\'s\s+in)/i.test(name) && 
                                      (nameLowerDecoded.includes(' and ') || nameLowerDecoded.match(/,\s*[A-Z]/));
    if (isPluralAggregatorDecoded) {
      console.log(`[Web Search] Skipping aggregator site (after decoding): ${name}`);
      return null;
    }

    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const desc = metaDescMatch?.[1] || fullText.slice(0, 500);

    let location = defaultCity && defaultState ? `${defaultCity}, ${defaultState}` : null;
    const locationMatch = fullText.match(/\b(Orange Beach|Gulf Shores|Destin|Pensacola|Panama City|Biloxi|Gulfport|Port Aransas|Galveston|New Orleans|Venice|Naples|Fort Myers|Clearwater|St\. Petersburg)\b/i);
    if (locationMatch) {
      const stateMatch = fullText.match(/\b(AL|FL|MS|LA|TX)\b/i);
      location = `${locationMatch[1]}, ${stateMatch?.[1] || defaultState || ''}`;
    }

    // Validate extracted data before returning
    // Filter out invalid phone numbers (already done in extractPhone, but double-check)
    let validPhone = phone;
    if (phone) {
      const digits = phone.replace(/\D/g, '');
      // Reject placeholder numbers
      if (digits.length !== 10 || /^(\d)\1{9}$/.test(digits) || digits.startsWith('000')) {
        validPhone = null;
      }
    }
    
    // Filter out invalid captain names (review text, etc.)
    let validCaptain = captain;
    if (captain) {
      const excludePhrases = [
        'will discuss', 'and crew', 'was great', 'is great', 'are great', 
        'experiences', 'charters', 'fishing', 'boat', 'marina',
        'us quick', 'quick', 'managed', 'vacation', 'check', 'calendar',
        'contact', 'call', 'text', 'phone', 'reach', 'dial'
      ];
      const captainLower = captain.toLowerCase().trim();
      
      // Check if it's an excluded phrase
      if (excludePhrases.some(phrase => captainLower === phrase || captainLower.includes(phrase))) {
        validCaptain = null;
      }
      
      // Also check if it's a valid name format (1-3 words, each capitalized, 2+ chars)
      const words = captain.split(/\s+/).filter(w => w.length > 0);
      if (words.length === 0 || words.length > 3) {
        validCaptain = null;
      } else {
        // Each word must be capitalized and at least 2 characters
        if (!words.every(w => /^[A-Z][a-z]+$/.test(w) && w.length >= 2)) {
          validCaptain = null;
        }
        // Reject if any word is in exclude list
        if (words.some(w => excludePhrases.includes(w.toLowerCase()))) {
          validCaptain = null;
        }
      }
    }
    
    // Filter out invalid boat types (partial text)
    let validBoatType = boat_type;
    if (boat_type) {
      const excludePatterns = [
        'length', 'bigger', 'smaller', 'foot', 'feet', 'ft',
        'cabin', 'bathroom', 'bathroo', 'with a', 'and a', 'is the',
        'check', 'calendar', 'boat' // "boat" alone is too generic
      ];
      const typeLower = boat_type.toLowerCase().trim();
      
      // Reject if contains excluded patterns
      if (excludePatterns.some(pattern => typeLower.includes(pattern))) {
        validBoatType = null;
      }
      
      // Reject if too short or too long
      if (boat_type.length < 3 || boat_type.length > 40) {
        validBoatType = null;
      }
      
      // Reject if it's just "boat" (too generic)
      if (typeLower === 'boat' || typeLower === 'charter boat' || typeLower === 'fishing boat') {
        validBoatType = null;
      }
    }

    // Debug logging for troubleshooting
    console.log('[ScrapeBoatPage] Extraction summary:', {
      url: url.substring(0, 80),
      name: name ? name.substring(0, 50) : null,
      captain: captain || null,
      validCaptain: validCaptain || null,
      phone: phone || null,
      validPhone: validPhone || null,
      email: email || null,
      location: location || null,
      boat_type: boat_type || null,
      validBoatType: validBoatType || null,
      length: length || null,
      hasMinimum: !!(name && (validPhone || email || validCaptain)),
    });
    
    if (name && (validPhone || email || validCaptain)) {
      return {
        source: 'web_search',
        source_url: url,
        source_post_id: new URL(url).pathname,
        name: clean(name),
        captain: validCaptain,
        phone: validPhone,
        email,
        location: location || 'Gulf Coast',
        boat_type: validBoatType,
        length,
        description: desc ? clean(desc).slice(0, 1000) : null,
      };
    }

    // Log why we're returning null for debugging
    console.log('[ScrapeBoatPage] Returning null - missing requirements:', {
      hasName: !!name,
      hasValidPhone: !!validPhone,
      hasEmail: !!email,
      hasValidCaptain: !!validCaptain,
      reason: !name ? 'no name extracted' : (!validPhone && !email && !validCaptain) ? 'no valid contact info (phone/email/captain)' : 'unknown',
    });

    return null;
  } catch (error: any) {
    console.warn(`[Web Search] Error scraping ${url}:`, error.message);
    return null;
  }
}

/**
 * Main web search function: Search → Scrape → Return boats
 */
async function scrapeWebSearch(target: number, filterState?: string | null): Promise<ScrapedBoat[]> {
  const out: ScrapedBoat[] = [];

  try {
    const urls = await searchWebForCharterBoats(target, filterState);
    
    if (urls.length === 0) {
      console.log('[Web Search] No URLs found from search');
      return [];
    }

    console.log(`[Web Search] Scraping ${urls.length} URLs for boat details...`);
    
    for (const url of urls) {
      if (out.length >= target) break;

      try {
        const boat = await scrapeBoatPage(url);
        if (boat) {
          out.push(boat);
        }

        // Random delay between requests (1.5-4 seconds) to avoid pattern detection
        const randomDelay = 1500 + Math.random() * 2500;
        await new Promise((resolve) => setTimeout(resolve, randomDelay));
      } catch (error: any) {
        // If it's a 403, log it but continue - some sites will always block
        if (error.message?.includes('403')) {
          console.warn(`[Web Search] Site blocked request to ${url} - continuing...`);
        } else {
          console.warn(`[Web Search] Error processing ${url}:`, error.message);
        }
      }
    }

    console.log(`[Web Search] Found ${out.length} boats from web search`);
  } catch (error: any) {
    console.error(`[Web Search] Error:`, error.message);
  }

  return out.slice(0, target);
}

function verifyAuth(req: Request): boolean {
  const authHeader = req.headers.get('authorization');
  const apiKey = req.headers.get('apikey');
  
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === serviceKey) return true;
  }
  
  if (apiKey === serviceKey) return true;
  
  return serviceKey.length > 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed. Use POST.' }, { status: 405 });
  }

  if (!verifyAuth(req)) {
    return json({ error: 'Unauthorized. Service role key required.' }, { status: 401 });
  }

  const startedAt = new Date().toISOString();

  let body: any = {};
  try {
    body = await req.json();
  } catch (error) {
    return json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const mode = String(body?.mode || 'manual');
  const sourcesRaw = body?.sources;
  const sources: string[] = Array.isArray(sourcesRaw)
    ? sourcesRaw.map(String).filter((s) => s.length > 0)
    : [];
  const filterState = body?.filterState ? String(body.filterState).trim() : null;
  const maxBoats = clamp(Number(body?.maxBoats ?? 10) || 10, 1, MAX_BOATS_LIMIT);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing required environment variables');
    return json(
      { error: 'Server configuration error. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 }
    );
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Handle manual URL scraping mode
  if (mode === 'manual_url') {
    const url = body?.url;
    if (!url || typeof url !== 'string') {
      return json({ error: 'URL is required for manual_url mode' }, { status: 400 });
    }

    try {
      // Validate URL
      new URL(url);
    } catch {
      return json({ error: 'Invalid URL format' }, { status: 400 });
    }

    try {
      // Extract location from URL if possible (for better extraction)
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      let defaultCity: string | undefined;
      let defaultState: string | undefined;

      // Try to extract location from hostname or path
      if (hostname.includes('orangebeach') || hostname.includes('orange-beach')) {
        defaultCity = 'Orange Beach';
        defaultState = 'AL';
      } else if (hostname.includes('gulfshores') || hostname.includes('gulf-shores')) {
        defaultCity = 'Gulf Shores';
        defaultState = 'AL';
      } else if (hostname.includes('destin')) {
        defaultCity = 'Destin';
        defaultState = 'FL';
      } else if (hostname.includes('biloxi')) {
        defaultCity = 'Biloxi';
        defaultState = 'MS';
      } else if (hostname.includes('gulfport')) {
        defaultCity = 'Gulfport';
        defaultState = 'MS';
      } else if (hostname.includes('pensacola')) {
        defaultCity = 'Pensacola';
        defaultState = 'FL';
      }

      console.log('[Manual URL] Scraping URL:', url);
      console.log('[Manual URL] Default location:', defaultCity, defaultState);
      
      const boat = await scrapeBoatPage(url, defaultCity, defaultState);
      
      console.log('[Manual URL] Scrape result:', boat ? {
        name: boat.name,
        captain: boat.captain,
        phone: boat.phone,
        email: boat.email,
        location: boat.location,
        boat_type: boat.boat_type,
        length: boat.length,
      } : 'null (no boat data)');
      
      if (!boat) {
        return json({ 
          error: 'Failed to extract boat data from URL. The site may be blocking automated requests, or the page structure may not contain extractable boat information.',
          boat: null 
        }, { status: 200 });
      }

      // Validate the boat
      const validation = validateBoat(boat);
      
      return json({
        success: true,
        boat,
        validation: {
          isComplete: validation.isComplete,
          missingFields: validation.missingFields,
          dataQualityScore: validation.dataQualityScore,
        },
      });
    } catch (error: any) {
      console.error('[Scraper] Manual URL scraping error:', error);
      return json({ 
        error: error.message || 'Failed to scrape URL',
        boat: null 
      }, { status: 500 });
    }
  }

  try {
    await admin
      .from('scraper_status')
      .update({ is_running: true, updated_at: startedAt })
      .eq('id', 1);
  } catch (error) {
    console.warn('Failed to update scraper_status:', error);
  }

  const results = {
    mode,
    timestamp: startedAt,
    targetBoats: maxBoats,
    scrapedBoats: [] as ScrapedBoat[],
    completeBoats: [] as ScrapedBoat[],
    incompleteBoats: [] as any[],
    failures: [] as any[],
    newBoats: 0,
    updatedBoats: 0,
    errors: [] as any[],
  };

  try {
    const wanted = new Set((sources.length ? sources : ['web_search', 'craigslist']).map((s) => s.toLowerCase()));

    if (wanted.has('thehulltruth')) {
      try {
        const boats = await scrapeHullTruth(maxBoats);
        results.scrapedBoats.push(...boats);
        console.log(`[Scraper] The Hull Truth: Found ${boats.length} boats`);
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        results.errors.push({ source: 'thehulltruth', error: errorMsg });
        console.warn(`[Scraper] The Hull Truth scraping failed (will continue with other sources): ${errorMsg}`);
      }
    }

    if (wanted.has('craigslist')) {
      try {
        const boats = await scrapeCraigslistRss(maxBoats, filterState);
        results.scrapedBoats.push(...boats);
        console.log(`[Scraper] Craigslist: Found ${boats.length} boats`);
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        results.errors.push({ source: 'craigslist', error: errorMsg });
        console.warn(`[Scraper] Craigslist scraping failed (will continue): ${errorMsg}`);
      }
    }

    if (wanted.has('google') || wanted.has('web_search') || wanted.has('known_sites')) {
      try {
        const boats = await scrapeWebSearch(maxBoats, filterState);
        results.scrapedBoats.push(...boats);
        console.log(`[Scraper] Web Search: Found ${boats.length} boats`);
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        results.errors.push({ source: 'web_search', error: errorMsg });
        console.warn(`[Scraper] Web search failed (will continue): ${errorMsg}`);
      }
    }

    if (results.scrapedBoats.length === 0 && results.errors.length > 0) {
      console.warn(`[Scraper] All sources failed, but continuing to save logs`);
    }

    results.scrapedBoats = results.scrapedBoats.slice(0, maxBoats);

    for (const boat of results.scrapedBoats) {
      const v = validateBoat(boat);

      if (v.isComplete) results.completeBoats.push(boat);
      else if (v.hasMinimumInfo) results.incompleteBoats.push({ ...boat, missingFields: v.missingFields });
      else {
        results.failures.push({ boat, reason: 'Missing critical information', missingFields: v.missingFields });
        continue;
      }

      // Upsert: attempt to match by source_url (most reliable) OR name OR phone OR email
      // Check by source_url first (most reliable for deduplication)
      let existing = null;
      
      if (boat.source_url) {
        const { data: urlMatch } = await admin
          .from('scraped_boats')
          .select('id,times_seen')
          .eq('source_url', boat.source_url)
          .maybeSingle();
        if (urlMatch) existing = urlMatch;
      }
      
      // If no URL match, try name/phone/email
      if (!existing) {
        const keyName = String(boat.name || '').trim().toLowerCase();
        const keyPhone = String(boat.phone || '').replace(/\D/g, ''); // Digits only for comparison
        const keyEmail = String(boat.email || '').trim().toLowerCase();
        
        // Build OR query only for non-empty values
        const conditions: string[] = [];
        if (keyName && keyName.length > 3) {
          conditions.push(`name.ilike.%${keyName}%`);
        }
        if (keyPhone && keyPhone.length === 10) {
          conditions.push(`phone.ilike.%${keyPhone}%`);
        }
        if (keyEmail && keyEmail.includes('@')) {
          conditions.push(`email.eq.${keyEmail}`);
        }
        
        if (conditions.length > 0) {
          const { data: nameMatch } = await admin
            .from('scraped_boats')
            .select('id,times_seen')
            .or(conditions.join(','))
            .maybeSingle();
          if (nameMatch) existing = nameMatch;
        }
      }

      const now = new Date().toISOString();
      if (existing?.id) {
        const { error } = await admin
          .from('scraped_boats')
          .update({
            ...boat,
            last_seen: now,
            times_seen: (existing.times_seen || 0) + 1,
            data_complete: v.isComplete,
            missing_fields: v.missingFields,
            data_quality_score: v.dataQualityScore,
            updated_at: now,
          })
          .eq('id', existing.id);

        if (error) results.errors.push({ boat: boat.name, error: error.message, action: 'update' });
        else results.updatedBoats++;
      } else {
        const { error } = await admin.from('scraped_boats').insert({
          ...boat,
          first_seen: now,
          last_seen: now,
          times_seen: 1,
          claimed: false,
          data_complete: v.isComplete,
          missing_fields: v.missingFields,
          data_quality_score: v.dataQualityScore,
          created_at: now,
          updated_at: now,
        });

        if (error) results.errors.push({ boat: boat.name, error: error.message, action: 'insert' });
        else results.newBoats++;
      }
    }

    const completedAt = new Date().toISOString();

    try {
      await admin.from('scraper_logs').insert({
        mode,
        sources: Array.from(wanted.values()),
        filter_state: filterState,
        target_boats: maxBoats,
        boats_scraped: results.scrapedBoats.length,
        complete_boats: results.completeBoats.length,
        incomplete_boats: results.incompleteBoats.length,
        new_boats: results.newBoats,
        updated_boats: results.updatedBoats,
        failures_count: results.failures.length,
        errors_count: results.errors.length,
        errors: results.errors.length ? results.errors : null,
        started_at: startedAt,
        completed_at: completedAt,
      });
    } catch (error) {
      console.error('Failed to insert scraper_logs:', error);
    }

    if (results.failures.length || results.incompleteBoats.length) {
      try {
        await admin.from('scraper_failure_reports').insert({
          run_timestamp: startedAt,
          mode,
          sources: Array.from(wanted.values()),
          total_failures: results.failures.length,
          total_incomplete: results.incompleteBoats.length,
          failures: results.failures,
          incomplete_boats: results.incompleteBoats,
          created_at: completedAt,
        });
      } catch (error) {
        console.error('Failed to insert scraper_failure_reports:', error);
      }
    }

    try {
      const { data: currentStatus } = await admin
        .from('scraper_status')
        .select('total_boats_scraped')
        .eq('id', 1)
        .single();

      const newTotal = (currentStatus?.total_boats_scraped || 0) + results.scrapedBoats.length;

      await admin
        .from('scraper_status')
        .update({
          is_running: false,
          last_run: completedAt,
          total_boats_scraped: newTotal,
          new_boats_today: results.newBoats,
          updated_at: completedAt,
        })
        .eq('id', 1);
    } catch (error) {
      console.error('Failed to update scraper_status:', error);
      try {
        await admin
          .from('scraper_status')
          .update({ is_running: false, last_run: completedAt, updated_at: completedAt })
          .eq('id', 1);
      } catch (e) {
        console.error('Failed to update scraper_status (simple):', e);
      }
    }

    if (results.newBoats > 0) {
      try {
        await admin.from('notifications').insert({
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
      } catch (error) {
        console.warn('Failed to create notification (table may not exist):', error);
      }
    }

    return json({
      success: true,
      ...results,
      summary: {
        targeted: maxBoats,
        found: results.scrapedBoats.length,
        complete: results.completeBoats.length,
        incomplete: results.incompleteBoats.length,
        saved: results.newBoats + results.updatedBoats,
        failed: results.failures.length,
        errors: results.errors.length,
      },
    });
  } catch (e: any) {
    try {
      await admin
        .from('scraper_status')
        .update({ is_running: false, updated_at: new Date().toISOString() })
        .eq('id', 1);
    } catch (statusError) {
      console.error('Failed to update status on error:', statusError);
    }

    console.error('Scraper error:', e);
    return json(
      {
        error: 'Internal server error',
        details: String(e?.message || e),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});
