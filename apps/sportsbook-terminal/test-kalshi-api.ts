/**
 * Test script to check Kalshi API connectivity.
 * Uses only THIS app's .env.local (sportsbook-terminal). Do not read other apps' env files.
 * Set KALSHI_API_KEY_ID and KALSHI_PRIVATE_KEY in .env.local if you want to test Kalshi.
 */
import { readFileSync, existsSync } from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

// Load from THIS app's .env.local only
const envPath = path.join(__dirname, '.env.local');
if (!existsSync(envPath)) {
  console.error('❌ No .env.local in sportsbook-terminal. Create one and set KALSHI_API_KEY_ID and KALSHI_PRIVATE_KEY to test Kalshi.');
  process.exit(1);
}

const envContent = readFileSync(envPath, 'utf-8');
let API_KEY = '';
let privateKey = '';
const lines = envContent.split('\n');
let inPrivateKey = false;

for (const line of lines) {
  if (line.startsWith('KALSHI_API_KEY_ID=')) {
    API_KEY = line.split('=')[1]?.trim() || '';
  }
  if (line.startsWith('KALSHI_PRIVATE_KEY=')) {
    inPrivateKey = true;
    privateKey = line.split('=').slice(1).join('=').trim() + '\n';
  } else if (inPrivateKey) {
    if (line.trim() === '' || (line.includes('=') && !line.trim().startsWith('-----'))) {
      inPrivateKey = false;
    } else {
      privateKey += line + '\n';
    }
  }
}
privateKey = privateKey.trim();

if (!API_KEY || !privateKey) {
  console.error('❌ Set KALSHI_API_KEY_ID and KALSHI_PRIVATE_KEY in sportsbook-terminal/.env.local to test Kalshi.');
  process.exit(1);
}

const BASE_URL = process.env.KALSHI_BASE_URL || 'https://api.elections.kalshi.com/trade-api/v2';

// Log only non-sensitive info
console.log('🔑 API Key ID:', API_KEY.substring(0, 8) + '…');
console.log('🔒 Private key: loaded (' + privateKey.length + ' chars)');

function signRequestWithTimestamp(method: string, path: string): { signature: string; timestamp: string } {
  const timestamp = Date.now().toString();
  const pathWithoutQuery = path.split('?')[0];
  const message = timestamp + method.toUpperCase() + pathWithoutQuery;
  try {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    sign.end();
    const signature = sign.sign({
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
    }).toString('base64');
    return { signature, timestamp };
  } catch (err: any) {
    console.error('❌ Signing error:', err.message);
    return { signature: '', timestamp: '' };
  }
}

async function testKalshiAPI() {
  try {
    const path = '/markets?limit=100&status=open';
    const { signature, timestamp } = signRequestWithTimestamp('GET', path);
    if (!signature) return;

    console.log('\n📡 Testing Kalshi API...');
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'KALSHI-ACCESS-KEY': API_KEY,
        'KALSHI-ACCESS-SIGNATURE': signature,
        'KALSHI-ACCESS-TIMESTAMP': timestamp,
      },
    });

    console.log('📊 Response:', response.status, response.statusText);
    if (!response.ok) {
      console.error('❌', await response.text());
      return;
    }

    const data = await response.json();
    console.log('✅ Markets fetched:', data.markets?.length || 0);
    if (data.markets?.length > 0) {
      data.markets.slice(0, 3).forEach((m: any, i: number) => {
        console.log(`  ${i + 1}. ${m.ticker} — ${(m.title || '').substring(0, 50)}…`);
      });
    }
  } catch (err: any) {
    console.error('❌', err.message);
  }
}

async function testBalance() {
  try {
    const path = '/portfolio/balance';
    const { signature, timestamp } = signRequestWithTimestamp('GET', path);
    if (!signature) return;
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'KALSHI-ACCESS-KEY': API_KEY,
        'KALSHI-ACCESS-SIGNATURE': signature,
        'KALSHI-ACCESS-TIMESTAMP': timestamp,
      },
    });
    console.log('\n💰 Balance:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('   Balance:', data.balance ?? data.available_balance ?? 'N/A');
    }
  } catch (err: any) {
    console.log('   Balance check failed:', (err as Error).message);
  }
}

testKalshiAPI().then(() => testBalance());
