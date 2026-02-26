// Pairing store — uses Upstash Redis REST API when available,
// falls back to in-memory for local dev.
//
// Set these env vars in Vercel to enable Redis persistence:
//   KV_REST_API_URL   — Upstash Redis REST URL (or Vercel KV URL)
//   KV_REST_API_TOKEN — Upstash Redis REST token (or Vercel KV token)

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const PAIR_TTL_SECS = 300; // 5 minutes
const useRedis = !!(KV_URL && KV_TOKEN);

// ── Redis helpers (Upstash REST API — zero dependencies) ─────
async function kvSet(key, value, ttlSecs) {
  const res = await fetch(`${KV_URL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['SET', key, JSON.stringify(value), 'EX', String(ttlSecs)]),
  });
  return res.ok;
}

async function kvGet(key) {
  const res = await fetch(`${KV_URL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['GET', key]),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.result) return null;
  try { return JSON.parse(data.result); } catch { return null; }
}

async function kvDel(key) {
  await fetch(`${KV_URL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['DEL', key]),
  }).catch(() => { });
}

// ── In-memory fallback for local dev ─────────────────────────
if (!globalThis.__pairStore) globalThis.__pairStore = {};

function memSet(key, value, ttlSecs) {
  globalThis.__pairStore[key] = { value, expiresAt: Date.now() + ttlSecs * 1000 };
}
function memGet(key) {
  const e = globalThis.__pairStore[key];
  if (!e) return null;
  if (Date.now() > e.expiresAt) { delete globalThis.__pairStore[key]; return null; }
  return e.value;
}
function memDel(key) { delete globalThis.__pairStore[key]; }

// ── Unified interface ────────────────────────────────────────
async function storeSet(key, value, ttl) { return useRedis ? kvSet(key, value, ttl) : memSet(key, value, ttl); }
async function storeGet(key) { return useRedis ? kvGet(key) : memGet(key); }
async function storeDel(key) { return useRedis ? kvDel(key) : memDel(key); }

// ── Public API (now async) ───────────────────────────────────

export async function createPairCode() {
  let code;
  let attempts = 0;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
    const existing = await storeGet(`pair:${code}`);
    if (!existing) break;
    attempts++;
  } while (attempts < 50);

  const now = Date.now();
  await storeSet(`pair:${code}`, { config: null, createdAt: now }, PAIR_TTL_SECS);
  return { code, expiresAt: now + PAIR_TTL_SECS * 1000 };
}

export async function submitPairConfig(code, config) {
  const entry = await storeGet(`pair:${code}`);
  if (!entry) return { ok: false, error: 'Code not found or expired' };
  if (entry.config) return { ok: false, error: 'Config already submitted for this code' };
  entry.config = config;
  await storeSet(`pair:${code}`, entry, PAIR_TTL_SECS);
  return { ok: true };
}

export async function pollPairCode(code) {
  const entry = await storeGet(`pair:${code}`);
  if (!entry) return { found: false, config: null, error: 'Code not found or expired' };
  if (!entry.config) return { found: true, config: null };
  const config = entry.config;
  await storeDel(`pair:${code}`);
  return { found: true, config };
}
