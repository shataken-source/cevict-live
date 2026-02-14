#!/usr/bin/env node
/**
 * Verify Twitter API keys (OAuth 1.0a user context).
 * Loads .env.local from repo root or from praxis; then calls Twitter API to get current user.
 *
 * Run from repo root (keys in root .env.local):
 *   node -e "
 *     require('fs').readFileSync('.env.local','utf8').split('\n').forEach(l=>{
 *       const m=l.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
 *       if(m&&m[1].startsWith('TWITTER_')) process.env[m[1]]=m[2].trim();
 *     });
 *     require('./apps/praxis/scripts/verify-twitter-keys.mjs');
 *   "
 * Or from praxis (keys in praxis .env.local):
 *   cd apps/praxis && node scripts/verify-twitter-keys.mjs
 *
 * Expects: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET
 */
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local: try praxis first, then repo root
const praxisEnv = join(__dirname, '..', '.env.local');
const rootEnv = join(__dirname, '..', '..', '..', '.env.local');
const envPath = existsSync(praxisEnv) ? praxisEnv : rootEnv;
if (!existsSync(envPath)) {
  console.error('No .env.local found at', praxisEnv, 'or', rootEnv);
  process.exit(1);
}
const content = readFileSync(envPath, 'utf8');
content.split('\n').forEach((line) => {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m && m[1].startsWith('TWITTER_')) {
    process.env[m[1]] = m[2].trim();
  }
});

const apiKey = process.env.TWITTER_API_KEY;
const apiSecret = process.env.TWITTER_API_SECRET;
const accessToken = process.env.TWITTER_ACCESS_TOKEN;
const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
  console.error('Missing one or more Twitter keys in .env.local:');
  console.error('  TWITTER_API_KEY:', apiKey ? 'set' : 'MISSING');
  console.error('  TWITTER_API_SECRET:', apiSecret ? 'set' : 'MISSING');
  console.error('  TWITTER_ACCESS_TOKEN:', accessToken ? 'set' : 'MISSING');
  console.error('  TWITTER_ACCESS_TOKEN_SECRET:', accessSecret ? 'set' : 'MISSING');
  process.exit(1);
}

const require = createRequire(import.meta.url);
const { TwitterApi } = require('twitter-api-v2');

async function main() {
  const client = new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret,
  });
  const rw = client.readWrite;
  try {
    const me = await rw.v2.me();
    const name = me.data?.name ?? me.data?.username ?? 'unknown';
    const username = me.data?.username ? `@${me.data.username}` : '';
    console.log('OK Twitter keys are valid.');
    console.log('  User:', name, username);
    process.exit(0);
  } catch (err) {
    console.error('Twitter API error:', err.message || err);
    if (err.code) console.error('  Code:', err.code);
    if (err.rateLimit) console.error('  Rate limit:', err.rateLimit);
    process.exit(1);
  }
}

main();
