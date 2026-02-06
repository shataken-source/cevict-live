/**
 * Test ScrapingBee with sample odds sites (no key required by the sites; we use ScrapingBee to fetch).
 * Run from apps/prognostication: npx tsx scripts/test-scrapingbee.ts
 * Loads SCRAPINGBEE_API_KEY from .env.local (run sync-env first if needed).
 */

import * as fs from 'fs';
import * as path from 'path';

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      const value = match[2].replace(/^["']|["']$/g, '').trim();
      process.env[match[1]] = value;
    }
  }
}

loadEnvLocal();

const apiKey = process.env.SCRAPINGBEE_API_KEY;
if (!apiKey) {
  console.error('Missing SCRAPINGBEE_API_KEY. Run sync-env.ps1 for prognostication first.');
  process.exit(1);
}

const TESTS = [
  { name: 'OddsShark', url: 'https://www.oddsshark.com/' },
  { name: 'Scores and Odds (Vegas)', url: 'https://www.scoresandodds.com/las-vegas-odds' },
];

async function fetchWithScrapingBee(url: string): Promise<{ status: number; bodyLength: number; snippet: string }> {
  const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${encodeURIComponent(apiKey)}&url=${encodeURIComponent(url)}`;
  const res = await fetch(apiUrl);
  const body = await res.text();
  const snippet = body.slice(0, 400).replace(/\s+/g, ' ');
  return { status: res.status, bodyLength: body.length, snippet };
}

async function main() {
  console.log('ScrapingBee test (odds sites)\n');
  for (const { name, url } of TESTS) {
    try {
      const result = await fetchWithScrapingBee(url);
      console.log(`[${name}] ${url}`);
      console.log(`  Status: ${result.status}, Body length: ${result.bodyLength} chars`);
      console.log(`  Snippet: ${result.snippet}...`);
      console.log('');
    } catch (e: any) {
      console.log(`[${name}] ${url}`);
      console.log(`  Error: ${e?.message || e}`);
      console.log('');
    }
  }
}

main();
