/**
 * Location Parser for Pet Reunion
 * Handles various location input formats including full state names
 */

// US State names to abbreviations mapping
const STATE_NAMES_TO_ABBR: Record<string, string> = {
  'alabama': 'AL',
  'alaska': 'AK',
  'arizona': 'AZ',
  'arkansas': 'AR',
  'california': 'CA',
  'colorado': 'CO',
  'connecticut': 'CT',
  'delaware': 'DE',
  'florida': 'FL',
  'georgia': 'GA',
  'hawaii': 'HI',
  'idaho': 'ID',
  'illinois': 'IL',
  'indiana': 'IN',
  'iowa': 'IA',
  'kansas': 'KS',
  'kentucky': 'KY',
  'louisiana': 'LA',
  'maine': 'ME',
  'maryland': 'MD',
  'massachusetts': 'MA',
  'michigan': 'MI',
  'minnesota': 'MN',
  'mississippi': 'MS',
  'missouri': 'MO',
  'montana': 'MT',
  'nebraska': 'NE',
  'nevada': 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  'ohio': 'OH',
  'oklahoma': 'OK',
  'oregon': 'OR',
  'pennsylvania': 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  'tennessee': 'TN',
  'texas': 'TX',
  'utah': 'UT',
  'vermont': 'VT',
  'virginia': 'VA',
  'washington': 'WA',
  'west virginia': 'WV',
  'wisconsin': 'WI',
  'wyoming': 'WY',
  'district of columbia': 'DC',
  'washington dc': 'DC',
};

export interface ParsedLocation {
  raw: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  detail: string | null;
}

function normalizeWhitespace(s: string | null | undefined): string {
  if (!s || typeof s !== 'string') return '';
  // Remove control characters and normalize whitespace
  return s.replace(/[\x00-\x1F\x7F]/g, '').trim().replace(/\s+/g, ' ');
}

/**
 * Convert state name or abbreviation to standard 2-letter code
 */
function normalizeStateToken(token: string | null): string | null {
  const t = normalizeWhitespace(token || '').toLowerCase();
  if (!t) return null;
  
  // Check if it's already a 2-letter code
  if (/^[a-z]{2}$/i.test(t)) {
    return t.toUpperCase();
  }
  
  // Check if it's a full state name (exact match first)
  const stateAbbr = STATE_NAMES_TO_ABBR[t];
  if (stateAbbr) {
    return stateAbbr;
  }
  
  // Check for multi-word state names (e.g., "new york", "north carolina")
  // Only match if the token is the full state name or contains it
  for (const [stateName, abbr] of Object.entries(STATE_NAMES_TO_ABBR)) {
    // Exact match
    if (t === stateName) {
      return abbr;
    }
    // Token contains full state name (e.g., "new york" in "new york city")
    if (stateName.length > 3 && t.includes(stateName)) {
      return abbr;
    }
    // State name contains token (for partial matches like "carolina" -> "north carolina")
    if (t.length > 3 && stateName.includes(t) && stateName.length > t.length) {
      return abbr;
    }
  }
  
  return null;
}

function extractZip(s: string): string | null {
  const m = s.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : null;
}

/**
 * Best-effort parsing for user-entered locations.
 * Supports:
 * - "City, ST"
 * - "City, State" (full state name)
 * - "City, ST 12345"
 * - "City State" (no comma)
 * - "City State 12345"
 * - "City, State 12345"
 */
export function parseLocationInput(input: string): ParsedLocation {
  // Handle null/undefined/empty
  if (!input || typeof input !== 'string') {
    return { raw: '', city: null, state: null, zip: null, detail: null };
  }

  // Limit input length to prevent abuse
  const limitedInput = input.length > 200 ? input.substring(0, 200) : input;
  const raw = normalizeWhitespace(limitedInput);
  if (!raw) return { raw: '', city: null, state: null, zip: null, detail: null };

  const zip = extractZip(raw);
  const rawNoZip = raw.replace(/\b(\d{5})(?:-\d{4})?\b/, '').trim();

  // Prefer comma-separated parsing
  if (rawNoZip.includes(',')) {
    const [left, ...rest] = rawNoZip.split(',');
    const city = normalizeWhitespace(left);
    const right = normalizeWhitespace(rest.join(','));
    
    // Try to extract state from the right side
    const state = normalizeStateToken(right);
    
    // If we found a state, remove it from the right side to get any remaining detail
    let detail = right;
    if (state) {
      // Remove state name/abbreviation from detail
      const stateLower = right.toLowerCase();
      for (const [stateName, abbr] of Object.entries(STATE_NAMES_TO_ABBR)) {
        if (stateLower.includes(stateName)) {
          detail = right.replace(new RegExp(stateName, 'gi'), '').trim();
          break;
        }
        if (stateLower.includes(abbr.toLowerCase())) {
          detail = right.replace(new RegExp(abbr, 'gi'), '').trim();
          break;
        }
      }
    }

    return {
      raw,
      city: city || null,
      state,
      zip,
      detail: detail || raw,
    };
  }

  // No comma: try to parse "City State" or "City State ZIP"
  // Split by spaces and try to identify the last token(s) as state
  const parts = rawNoZip.split(/\s+/);
  
  if (parts.length >= 2) {
    // Try last two tokens as state first (e.g., "North Carolina", "New York")
    // This handles cases like "Columbus North Carolina" correctly
    if (parts.length >= 3) {
      const lastTwoTokens = parts.slice(-2).join(' ').toLowerCase();
      const state = normalizeStateToken(lastTwoTokens);
      
      if (state) {
        const city = parts.slice(0, -2).join(' ');
        return {
          raw,
          city: city || null,
          state,
          zip,
          detail: raw,
        };
      }
    }
    
    // Try last token as state (2-letter or full name)
    // This handles "Columbus Indiana"
    const lastToken = parts[parts.length - 1];
    const state = normalizeStateToken(lastToken);
    
    if (state) {
      // Found state in last token
      const city = parts.slice(0, -1).join(' ');
      return {
        raw,
        city: city || null,
        state,
        zip,
        detail: raw,
      };
    }
  }

  // Fallback: treat entire string as city if no state found
  return { 
    raw, 
    city: rawNoZip || null, 
    state: null, 
    zip, 
    detail: raw 
  };
}
