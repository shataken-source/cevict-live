/**
 * keys-store.ts
 * Manages runtime API keys for the Progno engine.
 *
 * Key resolution order for getPrimaryKey():
 *   1. ODDS_API_KEY env var  (set by KeyVault → .env.local)
 *   2. ODDS_API_KEY_2 env var (secondary/rotation key)
 *   3. First key in .progno/keys.json (admin-UI-added keys)
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export const runtime = 'nodejs'

export interface StoredKey {
  id: string
  label: string
  value: string
  createdAt: string
}

const KEYS_DIR = path.join(process.cwd(), '.progno')
const KEYS_FILE = path.join(KEYS_DIR, 'keys.json')

export function loadKeys(): StoredKey[] {
  try {
    if (!fs.existsSync(KEYS_FILE)) return []
    const raw = fs.readFileSync(KEYS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveKeys(keys: StoredKey[]): void {
  try {
    if (!fs.existsSync(KEYS_DIR)) {
      fs.mkdirSync(KEYS_DIR, { recursive: true })
    }
    fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), 'utf8')
  } catch (err) {
    console.error('[keys-store] Failed to save keys:', err)
  }
}

export function addKey(label: string, value: string): StoredKey {
  const keys = loadKeys()
  const key: StoredKey = {
    id: crypto.randomUUID(),
    label: label || 'API Key',
    value,
    createdAt: new Date().toISOString(),
  }
  keys.push(key)
  saveKeys(keys)
  return key
}

export function deleteKey(id: string): boolean {
  const keys = loadKeys()
  const filtered = keys.filter(k => k.id !== id)
  if (filtered.length === keys.length) return false
  saveKeys(filtered)
  return true
}

/** Which key slot is in use (for logging only). */
export type OddsKeySource = 'fallback' | 'primary' | 'rotation' | 'stored'

/**
 * Returns the primary Odds API key.
 * When USE_ODDS_FALLBACK_KEY=1, prefers ODDS_API_KEY_2. Otherwise env then .progno/keys.json.
 */
export function getPrimaryKey(): string | null {
  const key1 = process.env.ODDS_API_KEY || process.env.NEXT_PUBLIC_ODDS_API_KEY || null
  const key2 = process.env.ODDS_API_KEY_2 || null
  const useFallback = process.env.USE_ODDS_FALLBACK_KEY === '1' || process.env.USE_ODDS_FALLBACK_KEY === 'true'
  if (useFallback && key2) return key2
  if (key1) return key1
  if (key2) return key2
  const stored = loadKeys()
  if (stored.length > 0) return stored[0].value
  return null
}

/** Returns the backup Odds API key (ODDS_API_KEY_2). Used to retry on 401 when primary fails. */
export function getFallbackOddsKey(): string | null {
  const v = process.env.ODDS_API_KEY_2
  return v && String(v).trim() ? v : null
}

/** Returns which key slot is in use (for logging 401 / debug). */
export function getPrimaryKeySource(): OddsKeySource | null {
  const key1 = process.env.ODDS_API_KEY || process.env.NEXT_PUBLIC_ODDS_API_KEY || null
  const key2 = process.env.ODDS_API_KEY_2 || null
  const useFallback = process.env.USE_ODDS_FALLBACK_KEY === '1' || process.env.USE_ODDS_FALLBACK_KEY === 'true'
  if (useFallback && key2) return 'fallback'
  if (key1) return 'primary'
  if (key2) return 'fallback'
  const stored = loadKeys()
  if (stored.length > 0 && stored[0].value) return 'stored'
  return null
}
