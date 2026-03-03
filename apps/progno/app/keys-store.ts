import fs from "node:fs";
import path from "node:path";

export interface StoredKey {
  id: string;
  label: string;
  value: string;
  createdAt: string;
}

const baseDir = path.join(process.cwd(), ".progno");
const filePath = path.join(baseDir, "keys.json");
const SUPABASE_BUCKET = 'predictions';
const SUPABASE_KEY_PATH = 'config/keys.json';

// Detect Vercel (read-only filesystem)
const isVercel = !!process.env.VERCEL;

function ensureDir() {
  if (isVercel) return;
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const { createClient } = require('@supabase/supabase-js');
    return createClient(url, key);
  } catch { return null; }
}

async function loadKeysFromSupabase(): Promise<StoredKey[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb.storage.from(SUPABASE_BUCKET).download(SUPABASE_KEY_PATH);
    if (error || !data) return [];
    const text = await data.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

async function saveKeysToSupabase(keys: StoredKey[]): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const blob = new Blob([JSON.stringify(keys, null, 2)], { type: 'application/json' });
    await sb.storage.from(SUPABASE_BUCKET).upload(SUPABASE_KEY_PATH, blob, { upsert: true, contentType: 'application/json' });
  } catch (e: any) { console.error('[keys-store] Supabase save error:', e?.message); }
}

// Synchronous local-only load (used by getPrimaryKey and other hot-path callers)
export function loadKeys(): StoredKey[] {
  if (isVercel) return []; // On Vercel, use async loadKeysAsync instead
  ensureDir();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Async load — works on both local and Vercel
export async function loadKeysAsync(): Promise<StoredKey[]> {
  if (isVercel) return loadKeysFromSupabase();
  return loadKeys();
}

export function saveKeys(keys: StoredKey[]): void {
  if (!isVercel) {
    ensureDir();
    fs.writeFileSync(filePath, JSON.stringify(keys, null, 2), "utf8");
  }
  // Also save to Supabase (fire-and-forget)
  saveKeysToSupabase(keys).catch(() => { });
}

export async function addKeyAsync(label: string, value: string): Promise<StoredKey> {
  const keys = await loadKeysAsync();
  const id = `key_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const next: StoredKey = { id, label: label || "default", value, createdAt: new Date().toISOString() };
  keys.unshift(next);
  saveKeys(keys);
  if (isVercel) await saveKeysToSupabase(keys);
  return next;
}

export function addKey(label: string, value: string): StoredKey {
  const keys = loadKeys();
  const id = `key_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const next: StoredKey = { id, label: label || "default", value, createdAt: new Date().toISOString() };
  keys.unshift(next);
  saveKeys(keys);
  return next;
}

export async function deleteKeyAsync(id: string): Promise<boolean> {
  const keys = await loadKeysAsync();
  const next = keys.filter(k => k.id !== id);
  if (next.length === keys.length) return false;
  saveKeys(next);
  if (isVercel) await saveKeysToSupabase(next);
  return true;
}

export function deleteKey(id: string): boolean {
  const keys = loadKeys();
  const next = keys.filter(k => k.id !== id);
  if (next.length === keys.length) return false;
  saveKeys(next);
  return true;
}

/** Which key slot is in use (for logging only; does not expose the key value). */
export type OddsKeySource = 'fallback' | 'primary' | 'rotation' | 'stored'

/**
 * When USE_ODDS_FALLBACK_KEY=1 (or "true"), prefer ODDS_API_KEY_2 over ODDS_API_KEY
 * so the fallback key is used until you clear the env (e.g. tomorrow morning).
 */
export function getPrimaryKey(): string | undefined {
  const key1 = process.env.ODDS_API_KEY || process.env.NEXT_PUBLIC_ODDS_API_KEY
  const key2 = process.env.ODDS_API_KEY_2
  const useFallback = process.env.USE_ODDS_FALLBACK_KEY === '1' || process.env.USE_ODDS_FALLBACK_KEY === 'true'
  if (useFallback && key2) return key2
  const available = [key1, key2].filter(Boolean) as string[]
  if (available.length === 0) {
    const keys = loadKeys()
    return keys[0]?.value
  }
  // Time-based rotation (1-minute buckets) — consistent across cold starts and instances
  const bucketIndex = Math.floor(Date.now() / 60000) % available.length
  return available[bucketIndex]
}

/** Returns the backup Odds API key (ODDS_API_KEY_2) if set. Used to retry on 401 when primary fails. */
export function getFallbackOddsKey(): string | undefined {
  const v = process.env.ODDS_API_KEY_2
  return v && String(v).trim() ? v : undefined
}

/** Returns which key slot is in use (for logging 401 / debug). Does not expose the key value. */
export function getPrimaryKeySource(): OddsKeySource | null {
  const key1 = process.env.ODDS_API_KEY || process.env.NEXT_PUBLIC_ODDS_API_KEY
  const key2 = process.env.ODDS_API_KEY_2
  const useFallback = process.env.USE_ODDS_FALLBACK_KEY === '1' || process.env.USE_ODDS_FALLBACK_KEY === 'true'
  if (useFallback && key2) return 'fallback'
  const available = [key1, key2].filter(Boolean) as string[]
  if (available.length === 0) {
    const keys = loadKeys()
    return keys[0]?.value ? 'stored' : null
  }
  const bucketIndex = Math.floor(Date.now() / 60000) % available.length
  if (available.length === 1) return key1 ? 'primary' : 'fallback'
  return 'rotation'
}

export function getKeyByLabel(label: string): string | undefined {
  const keys = loadKeys();
  const match = keys.find(k => k.label?.toLowerCase() === label.toLowerCase());
  return match?.value;
}

export function getSportsBlazeKey(): string | undefined {
  // Handle both naming conventions: SPORTSBLAZE_API_KEY and SPORTS_BLAZE_API_KEY
  const fromEnv = process.env.SPORTSBLAZE_API_KEY || process.env.SPORTS_BLAZE_API_KEY;
  if (fromEnv) return fromEnv;
  // Allow a couple of common labels in the admin panel.
  return getKeyByLabel("SportsBlaze") || getKeyByLabel("sportsblaze") || getKeyByLabel("SPORTSBLAZE");
}

export function getBetStackKey(): string | undefined {
  const fromEnv = process.env.BETSTACK_API_KEY
  if (fromEnv) return fromEnv
  return getKeyByLabel('BetStack') || getKeyByLabel('betstack') || getKeyByLabel('BETSTACK')
}

export function getAnthropicKey(): string | undefined {
  const fromEnv = process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
  if (fromEnv) return fromEnv;
  return getKeyByLabel("Anthropic API Key") || getKeyByLabel("Anthropic Key") || getKeyByLabel("Claude API Key");
}

