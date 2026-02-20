// @ts-nocheck
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import crypto from 'crypto';
import { SignJWT } from 'jose';

const apiKey = process.env.COINBASE_API_KEY || '';
const rawSecret = (process.env.COINBASE_API_SECRET || '').replace(/\\n/g, '\n').replace(/^"|"$/g, '');

async function makeJWT(pathWithoutQuery: string, method = 'GET') {
  const ecKey = crypto.createPrivateKey({ key: rawSecret, format: 'pem' });
  const nonce = crypto.randomBytes(16).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  // CDP requires uri WITHOUT query params
  const uri = `${method} api.coinbase.com${pathWithoutQuery}`;
  return new SignJWT({ uri })
    .setProtectedHeader({ alg: 'ES256', kid: apiKey, nonce, typ: 'JWT' })
    .setIssuedAt(now).setNotBefore(now).setExpirationTime(now + 120)
    .setSubject(apiKey).setIssuer('cdp').sign(ecKey);
}

async function get(fullPath: string) {
  // Strip query params for JWT signing
  const pathOnly = fullPath.split('?')[0];
  const jwt = await makeJWT(pathOnly);
  const res = await fetch(`https://api.coinbase.com${fullPath}`, {
    headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' }
  });
  const text = await res.text();
  let body: any = {};
  try { body = JSON.parse(text); } catch { body = { _raw: text }; }
  return { status: res.status, body };
}

console.log('\n🔍 RAW ACCOUNT DUMP\n' + '='.repeat(60));

// The JWT uri must NOT include query params — only the path
// Test accounts with correct uri (no query string in JWT)
const accts = await get('/api/v3/brokerage/accounts?limit=250');
console.log(`\nAccounts status: ${accts.status}`);
if (accts.status === 200) {
  console.log(`Total: ${accts.body.accounts?.length ?? 0}, has_next: ${!!accts.body.cursor}`);
  for (const a of (accts.body.accounts || [])) {
    const bal = a.available_balance?.value || '0';
    if (parseFloat(bal) > 0) {
      console.log(`  ${a.currency.padEnd(8)} available=${bal}  name=${a.name}`);
    }
  }
} else {
  console.log(JSON.stringify(accts.body).substring(0, 300));
}

// Portfolios
const portfolios = await get('/api/v3/brokerage/portfolios');
console.log(`\nPortfolios status: ${portfolios.status}`);
console.log(JSON.stringify(portfolios.body, null, 2).substring(0, 400));

// Portfolio breakdown for Default
const pfUuid = portfolios.body?.portfolios?.[0]?.uuid;
if (pfUuid) {
  const breakdown = await get(`/api/v3/brokerage/portfolios/${pfUuid}`);
  console.log(`\nPortfolio breakdown status: ${breakdown.status}`);
  console.log(JSON.stringify(breakdown.body, null, 2).substring(0, 1000));
}
