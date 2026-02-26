// In-memory pairing store — persists across warm Vercel invocations.
// For production scale, swap to Upstash Redis or Vercel KV.
//
// Structure:  pairStore[code] = { config: null, createdAt, expiresAt }
//             regStore[regCode] = { used: false, createdAt }

if (!globalThis.__pairStore) globalThis.__pairStore = {};
if (!globalThis.__regStore) globalThis.__regStore = {};

const PAIR_TTL_MS = 5 * 60 * 1000; // 5 minutes

function purgeExpired() {
  const now = Date.now();
  for (const [k, v] of Object.entries(globalThis.__pairStore)) {
    if (now > v.expiresAt) delete globalThis.__pairStore[k];
  }
}

export function createPairCode() {
  purgeExpired();
  // Generate 4-digit numeric code, retry if collision
  let code;
  let attempts = 0;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000)); // 1000-9999
    attempts++;
  } while (globalThis.__pairStore[code] && attempts < 50);

  const now = Date.now();
  globalThis.__pairStore[code] = {
    config: null,
    createdAt: now,
    expiresAt: now + PAIR_TTL_MS,
  };
  return { code, expiresAt: now + PAIR_TTL_MS };
}

export function submitPairConfig(code, config) {
  purgeExpired();
  const entry = globalThis.__pairStore[code];
  if (!entry) return { ok: false, error: 'Code not found or expired' };
  if (entry.config) return { ok: false, error: 'Config already submitted for this code' };
  entry.config = config;
  return { ok: true };
}

export function pollPairCode(code) {
  purgeExpired();
  const entry = globalThis.__pairStore[code];
  if (!entry) return { found: false, config: null, error: 'Code not found or expired' };
  if (!entry.config) return { found: true, config: null }; // still waiting
  // Config arrived — consume it (one-time read)
  const config = entry.config;
  delete globalThis.__pairStore[code];
  return { found: true, config };
}
