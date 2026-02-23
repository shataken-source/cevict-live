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

/**
 * Returns the primary Odds API key.
 * Checks env vars first (populated by KeyVault), then falls back to .progno/keys.json.
 */
export function getPrimaryKey(): string | null {
  // 1. Primary env key
  if (process.env.ODDS_API_KEY) return process.env.ODDS_API_KEY

  // 2. Secondary/rotation env key
  if (process.env.ODDS_API_KEY_2) return process.env.ODDS_API_KEY_2

  // 3. Admin-UI-added keys (first entry wins)
  const stored = loadKeys()
  if (stored.length > 0) return stored[0].value

  return null
}
