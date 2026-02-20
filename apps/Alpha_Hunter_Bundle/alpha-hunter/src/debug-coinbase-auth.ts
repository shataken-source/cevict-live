// @ts-nocheck
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import crypto from 'crypto';
import { SignJWT } from 'jose';

const apiKey = process.env.COINBASE_API_KEY || '';
const rawSecret = process.env.COINBASE_API_SECRET || '';

console.log('\n🔍 COINBASE AUTH DEBUG\n' + '='.repeat(50));
console.log(`API Key: ${apiKey.substring(0, 50)}...`);
console.log(`Secret length: ${rawSecret.length}`);
console.log(`Secret starts with: ${rawSecret.substring(0, 40)}`);
console.log(`Has literal \\\\n: ${rawSecret.includes('\\n')}`);
console.log(`Has real newline: ${rawSecret.includes('\n')}`);

// Try different key formats
const formats = [
  { name: 'raw', key: rawSecret },
  { name: 'replace \\\\n with newline', key: rawSecret.replace(/\\n/g, '\n') },
  { name: 'replace \\\\n and trim quotes', key: rawSecret.replace(/\\n/g, '\n').replace(/^"|"$/g, '') },
];

for (const fmt of formats) {
  console.log(`\n── Testing format: ${fmt.name}`);
  console.log(`   Key preview: ${fmt.key.substring(0, 60).replace(/\n/g, '↵')}`);
  try {
    const ecKey = crypto.createPrivateKey({ key: fmt.key, format: 'pem' });
    console.log(`   ✅ Key parsed OK — type: ${ecKey.asymmetricKeyType}`);

    // Try signing a JWT
    const nonce = crypto.randomBytes(16).toString('hex');
    const now = Math.floor(Date.now() / 1000);
    // Coinbase CDP requires uri = "METHOD HOST/PATH" (no https://, no query params)
    const uriVariants = [
      { uri: 'GET api.coinbase.com/api/v3/brokerage/accounts', url: 'https://api.coinbase.com/api/v3/brokerage/accounts?limit=5' },
      { uri: 'GET api.coinbase.com/api/v3/brokerage/portfolios', url: 'https://api.coinbase.com/api/v3/brokerage/portfolios' },
    ];
    for (const { uri, url } of uriVariants) {
      const j = await new SignJWT({ uri })
        .setProtectedHeader({ alg: 'ES256', kid: apiKey, nonce, typ: 'JWT' })
        .setIssuedAt(now)
        .setNotBefore(now)
        .setExpirationTime(now + 120)
        .setSubject(apiKey)
        .setIssuer('cdp')
        .sign(ecKey);
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${j}`, 'Content-Type': 'application/json' }
      });
      const body = await res.text();
      console.log(`   [${res.status}] ${uri} → ${body.substring(0, 200)}`);
    }
    break;
  } catch (e: any) {
    console.log(`   ❌ Failed: ${e.message}`);
  }
}
