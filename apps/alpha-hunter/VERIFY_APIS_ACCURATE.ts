// Accurate API Verification - Uses the SAME authentication as trading classes
// This is the TRUE independent verification

import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { SignJWT } from 'jose';

dotenv.config({ path: path.join(process.cwd(), '..', '..', '.env.local') });

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║    🔍 ACCURATE API VERIFICATION (Using Real Auth)     ║');
console.log('║    Matches EXACT authentication methods in code       ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// ============================================================================
// VERIFY COINBASE API (Using JWT like CoinbaseExchange class)
// ============================================================================
async function createJWT(apiKey: string, privateKey: string, uri: string): Promise<string> {
  const formattedKey = privateKey.replace(/\\n/g, '\n');
  const ecPrivateKey = crypto.createPrivateKey({
    key: formattedKey,
    format: 'pem',
  });
  const nonce = crypto.randomBytes(16).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ uri })
    .setProtectedHeader({
      alg: 'ES256',
      kid: apiKey,
      nonce,
      typ: 'JWT',
    })
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(now + 120)
    .setSubject(apiKey)
    .setIssuer('cdp')
    .sign(ecPrivateKey);
  return jwt;
}

async function verifyCoinbase(): Promise<boolean> {
  console.log('📊 [1/2] VERIFYING COINBASE API (JWT Auth)...\n');

  const apiKey = process.env.COINBASE_API_KEY;
  const apiSecret = process.env.COINBASE_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.log('   ❌ COINBASE: API credentials not found in .env.local');
    return false;
  }

  console.log(`   ✓ API Key found: ${apiKey.substring(0, 40)}...`);
  console.log(`   ✓ API Secret found: ${apiSecret.substring(0, 50)}...`);

  try {
    console.log('\n   🔹 Test: GET /api/v3/brokerage/accounts (JWT Auth)');
    const fullPath = '/api/v3/brokerage/accounts';
    const uri = `GET api.coinbase.com${fullPath}`;
    const jwt = await createJWT(apiKey, apiSecret, uri);

    const response = await fetch(`https://api.coinbase.com${fullPath}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`      HTTP Status: ${response.status} ${response.statusText}`);

    if (response.status === 200) {
      const data = await response.json();
      const accounts = data.accounts || [];
      console.log(`      ✅ SUCCESS: Got ${accounts.length} accounts`);
      
      const usdAccount = accounts.find((a: any) => a.currency === 'USD');
      if (usdAccount) {
        const usdBalance = parseFloat(usdAccount.available_balance?.value || '0');
        console.log(`      💰 USD Balance: $${usdBalance.toFixed(2)}`);
      }
      
      return true;
    } else {
      const errorText = await response.text();
      console.log(`      ❌ FAILED: ${errorText.substring(0, 200)}`);
      return false;
    }
  } catch (error: any) {
    console.log(`      ❌ ERROR: ${error.message}`);
    return false;
  }
}

// ============================================================================
// VERIFY KALSHI API (Using RSA_PKCS1_PSS_PADDING like KalshiTrader class)
// ============================================================================
async function verifyKalshi(): Promise<boolean> {
  console.log('\n🎯 [2/2] VERIFYING KALSHI API (RSA-PSS Auth)...\n');

  const keyId = process.env.KALSHI_API_KEY_ID;
  const privateKeyRaw = process.env.KALSHI_PRIVATE_KEY;

  if (!keyId || !privateKeyRaw) {
    console.log('   ❌ KALSHI: API credentials not found in .env.local');
    return false;
  }

  console.log(`   ✓ API Key ID: ${keyId}`);
  console.log(`   ✓ Private Key length: ${privateKeyRaw.length} chars`);

  // Parse private key (handle \n escapes and quotes)
  let privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/\"/g, '');
  
  // Validate key format
  try {
    crypto.createPrivateKey(privateKey);
    console.log('   ✓ Private key format is valid (RSA)');
  } catch (err: any) {
    console.log(`   ❌ Private key invalid: ${err.message}`);
    return false;
  }

  // Determine environment (default to demo if not set)
  const kalshiEnv = process.env.KALSHI_ENV;
  const baseUrl = kalshiEnv === 'production'
    ? 'https://api.elections.kalshi.com'
    : 'https://demo-api.kalshi.co';
  
  console.log(`   ✓ Environment: ${kalshiEnv || 'demo (default)'}`);
  console.log(`   ✓ Base URL: ${baseUrl}`);

  try {
    console.log('\n   🔹 Test: GET /trade-api/v2/portfolio/balance (RSA-PSS)');
    const timestamp = Date.now().toString();
    const method = 'GET';
    const path = '/trade-api/v2/portfolio/balance';
    const pathWithoutQuery = path.split('?')[0];
    const message = `${timestamp}${method}${pathWithoutQuery}`;

    // Use RSA_PKCS1_PSS_PADDING (same as KalshiTrader)
    const signature = crypto.sign('sha256', Buffer.from(message), {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    });

    const response = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'KALSHI-ACCESS-KEY': keyId,
        'KALSHI-ACCESS-SIGNATURE': signature.toString('base64'),
        'KALSHI-ACCESS-TIMESTAMP': timestamp,
        'Content-Type': 'application/json',
      },
    });

    console.log(`      HTTP Status: ${response.status} ${response.statusText}`);

    if (response.status === 200) {
      const data = await response.json();
      const balance = data.balance / 100; // Kalshi returns cents
      console.log(`      ✅ SUCCESS: Got balance data`);
      console.log(`      💰 Kalshi Balance: $${balance.toFixed(2)}`);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`      ❌ FAILED: ${errorText.substring(0, 300)}`);
      
      // Helpful diagnostics
      if (errorText.includes('NOT_FOUND')) {
        console.log(`      💡 HINT: API key might be for ${kalshiEnv === 'production' ? 'demo' : 'production'} environment`);
        console.log(`      💡 Try setting KALSHI_ENV=${kalshiEnv === 'production' ? 'demo' : 'production'}`);
      }
      
      return false;
    }
  } catch (error: any) {
    console.log(`      ❌ ERROR: ${error.message}`);
    return false;
  }
}

// ============================================================================
// RUN VERIFICATION
// ============================================================================
async function main() {
  const coinbaseOk = await verifyCoinbase();
  const kalshiOk = await verifyKalshi();

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║              📋 VERIFICATION RESULTS                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log(`   Coinbase API: ${coinbaseOk ? '✅ ONLINE & AUTHENTICATED' : '❌ FAILED'}`);
  console.log(`   Kalshi API:   ${kalshiOk ? '✅ ONLINE & AUTHENTICATED' : '❌ FAILED'}`);

  if (coinbaseOk && kalshiOk) {
    console.log('\n   🎉 BOTH APIS VERIFIED - READY FOR LIVE TRADING!\n');
  } else if (coinbaseOk || kalshiOk) {
    console.log('\n   ⚠️  PARTIAL VERIFICATION - One API failed\n');
  } else {
    console.log('\n   ❌ BOTH APIS FAILED - Check configuration\n');
  }

  process.exit(coinbaseOk && kalshiOk ? 0 : 1);
}

main();

