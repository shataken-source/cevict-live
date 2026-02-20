// Test script to check what Kalshi markets are available
import { readFileSync } from 'fs';
import * as crypto from 'crypto';

// Read env file directly
const envContent = readFileSync('../alpha-hunter/.env.local', 'utf-8');

// Parse KALSHI_PRIVATE_KEY manually (multiline)
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
    if (line.trim() === '' || line.includes('=')) {
      inPrivateKey = false;
    } else {
      privateKey += line + '\n';
    }
  }
}

// Trim final newline and normalize
privateKey = privateKey.trim();

const BASE_URL = 'https://api.elections.kalshi.com/trade-api/v2';

console.log('🔑 API Key ID:', API_KEY?.substring(0, 10) + '...');
console.log('🔒 Private Key loaded, length:', privateKey.length);
console.log('   First 50 chars:', privateKey.substring(0, 50));
console.log('   Last 30 chars:', privateKey.slice(-30));

function signRequestWithTimestamp(method: string, path: string): { signature: string; timestamp: string } {
  if (!privateKey) return { signature: '', timestamp: '' };

  const timestamp = Date.now().toString();
  // CRITICAL: Strip query params from path
  const pathWithoutQuery = path.split('?')[0];
  // CRITICAL: Method must be uppercase, message format: timestamp + METHOD + path
  const message = timestamp + method.toUpperCase() + pathWithoutQuery;

  try {
    // RSA-PSS signing (REQUIRED by Kalshi)
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

    if (!signature) {
      console.error('❌ Failed to generate signature');
      return;
    }

    console.log('\n📡 Testing Kalshi API...');
    const url = `${BASE_URL}${path}`;
    console.log('URL:', url);
    console.log('Timestamp:', timestamp);
    console.log('Signature length:', signature.length);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'KALSHI-ACCESS-KEY': API_KEY || '',
        'KALSHI-ACCESS-SIGNATURE': signature,
        'KALSHI-ACCESS-TIMESTAMP': timestamp,
      },
    });

    console.log('\n📊 Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return;
    }

    const data = await response.json();
    console.log('\n✅ Markets fetched:', data.markets?.length || 0);

    if (data.markets && data.markets.length > 0) {
      console.log('\n📋 First 5 markets:');
      data.markets.slice(0, 5).forEach((m: any, i: number) => {
        console.log(`  ${i + 1}. ${m.ticker} - ${m.title?.substring(0, 50)}...`);
        console.log(`     Yes: ${m.yes_ask || m.yes_price}¢ | Expires: ${m.settlement_date || m.expiration_date || 'N/A'}`);
      });

      // Show category breakdown
      const categories = data.markets.reduce((acc: any, m: any) => {
        const cat = m.category || m.tags?.[0] || 'unknown';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {});

      console.log('\n📈 Category breakdown:');
      Object.entries(categories)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([cat, count]: any) => {
          console.log(`  ${cat}: ${count} markets`);
        });
    } else {
      console.log('\n⚠️  No markets returned from API');
      console.log('   Response keys:', Object.keys(data).join(', '));
      if (data.cursor) console.log('   Cursor:', data.cursor);
    }

  } catch (err: any) {
    console.error('❌ Test failed:', err.message);
  }
}

// Also test balance endpoint
async function testBalance() {
  try {
    const path = '/portfolio/balance';
    const { signature, timestamp } = signRequestWithTimestamp('GET', path);

    if (!signature) return;

    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'KALSHI-ACCESS-KEY': API_KEY || '',
        'KALSHI-ACCESS-SIGNATURE': signature,
        'KALSHI-ACCESS-TIMESTAMP': timestamp,
      },
    });

    console.log('\n💰 Balance endpoint status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('💰 Balance:', data.balance);
      console.log('💰 Available:', data.available_balance);
    } else {
      const errorText = await response.text();
      console.log('   Balance error:', errorText.slice(0, 200));
    }
  } catch (err: any) {
    console.log('   Balance check failed:', err.message);
  }
}

testKalshiAPI().then(() => testBalance());
