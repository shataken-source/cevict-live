export type ParsedLocation = {
  raw: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  detail: string | null;
};

function normalizeWhitespace(s: string): string {
  return (s || '').replace(/\s+/g, ' ').trim();
}

function normalizeStateToken(token: string | null): string | null {
  const t = normalizeWhitespace(token || '');
  if (!t) return null;
  // Strict: 2-letter US state code
  if (/^[a-z]{2}$/i.test(t)) return t.toUpperCase();
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
 * - "City, ST 12345"
 * - "City ST"
 * - "City ST 12345"
 *
 * We keep the original string in `raw`/`detail` for safety.
 */
export function parseLocationInput(input: string): ParsedLocation {
  const raw = normalizeWhitespace(input || '');
  if (!raw) return { raw: '', city: null, state: null, zip: null, detail: null };

  const zip = extractZip(raw);

  // Prefer comma-separated parsing
  if (raw.includes(',')) {
    const [left, ...rest] = raw.split(',');
    const city = normalizeWhitespace(left);
    const right = normalizeWhitespace(rest.join(','));
    const rightNoZip = right.replace(/\b(\d{5})(?:-\d{4})?\b/, '').trim();
    const state = normalizeStateToken(rightNoZip.split(' ')[0] || null);

    return {
      raw,
      city: city || null,
      state,
      zip,
      detail: raw,
    };
  }

  // Fallback: trailing "ST" (and optional ZIP)
  const m = raw.match(/^(.*?)(?:\s+([A-Za-z]{2}))?(?:\s+(\d{5})(?:-\d{4})?)?\s*$/);
  if (m) {
    const city = normalizeWhitespace(m[1] || '');
    const state = normalizeStateToken(m[2] || null);
    const zip2 = m[3] ? String(m[3]) : zip;
    return {
      raw,
      city: city || null,
      state,
      zip: zip2 || null,
      detail: raw,
    };
  }

  return { raw, city: raw, state: null, zip, detail: raw };
}

