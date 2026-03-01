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

function ensureDir() {
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
}

export function loadKeys(): StoredKey[] {
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

export function saveKeys(keys: StoredKey[]): void {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(keys, null, 2), "utf8");
}

export function addKey(label: string, value: string): StoredKey {
  const keys = loadKeys();
  const id = `key_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const next: StoredKey = { id, label: label || "default", value, createdAt: new Date().toISOString() };
  keys.unshift(next);
  saveKeys(keys);
  return next;
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

