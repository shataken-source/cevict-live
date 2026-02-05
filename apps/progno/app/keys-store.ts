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

export function getPrimaryKey(): string | undefined {
  const fromEnv = process.env.ODDS_API_KEY || process.env.NEXT_PUBLIC_ODDS_API_KEY;
  if (fromEnv) return fromEnv;
  const keys = loadKeys();
  return keys[0]?.value;
}

export function getKeyByLabel(label: string): string | undefined {
  const keys = loadKeys();
  const match = keys.find(k => k.label?.toLowerCase() === label.toLowerCase());
  return match?.value;
}

export function getSportsBlazeKey(): string | undefined {
  const fromEnv = process.env.SPORTSBLAZE_API_KEY;
  if (fromEnv) return fromEnv;
  // Allow a couple of common labels in the admin panel.
  return getKeyByLabel("SportsBlaze") || getKeyByLabel("sportsblaze") || getKeyByLabel("SPORTSBLAZE");
}

export function getAnthropicKey(): string | undefined {
  const fromEnv = process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
  if (fromEnv) return fromEnv;
  return getKeyByLabel("Anthropic API Key") || getKeyByLabel("Anthropic Key") || getKeyByLabel("Claude API Key");
}

