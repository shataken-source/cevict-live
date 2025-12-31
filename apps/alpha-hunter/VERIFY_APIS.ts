// Independent API Verification Script
// This bypasses the traders and verifies APIs directly

import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║         🔍 INDEPENDENT API VERIFICATION               ║');
console.log('║         NOT relying on trader output                  ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// ============================================================================
// VERIFY COINBASE API
// ============================================================================
async function verifyCoinbase(): Promise<boolean> {
  console.log('📊 [1/2] VERIFYING COINBASE API...\n');

  const apiKey = process.env.COINBASE_API_KEY;
  const apiSecret = process.env.COINBASE_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.log('   ❌ COINBASE: API credentials not found in .env.local');
    return false;
  }

  console.log(`   ✓ API Key found: ${apiKey.substring(0, 40)}...`);
  console.log(`   ✓ API Secret found: ${apiSecret.substring(0, 50)}...`);

  try {
    // Test 1: Get accounts
    console.log('\n   🔹 Test 1: GET /api/v3/brokerage/accounts');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = 'GET';
    const path = '/api/v3/brokerage/accounts';
    const message = timestamp + method + path;

    const key = crypto.createPrivateKey(apiSecret);
    const signature = crypto.sign('sha256', Buffer.from(message), key).toString('base64');

    const response = await fetch(`https://api.coinbase.com${path}`, {
      method: 'GET',
      headers: {
        'CB-ACCESS-KEY': apiKey,
        'CB-ACCESS-SIGN': signature,
        'CB-ACCESS-TIMESTAMP': timestamp,
        'Content-Type': 'application/json',
      },
    });

    console.log(`      HTTP Status: ${response.status} ${response.statusText}`);

    if (response.status === 200) {
      const data = await response.json();
      const accounts = data.accounts || [];
      console.log(`      ✅ SUCCESS: Got ${accounts.length} accounts`);
      
      // Show USD balance
      const usdAccount = accounts.find((a: any) => a.currency === 'USD');
      if (usdAccount) {
        const usdBalance = parseFloat(usdAccount.available_balance?.value || '0');
        console.log(`      💰 USD Balance: $${usdBalance.toFixed(2)}`);
      }
      
      return true;
    } else {
      const errorText = await response.text();
      console.log(`      ❌ FAILED: ${errorText}`);
      return false;
    }
  } catch (error: any) {
    console.log(`      ❌ ERROR: ${error.message}`);
    return false;
  }
}

// ============================================================================
// VERIFY KALSHI API
// ============================================================================
async function verifyKalshi(): Promise<boolean> {
  console.log('\n🎯 [2/2] VERIFYING KALSHI API...\n');

  const keyId = process.env.KALSHI_API_KEY_ID;
  const privateKeyRaw = process.env.KALSHI_PRIVATE_KEY;

  if (!keyId || !privateKeyRaw) {
    console.log('   ❌ KALSHI: API credentials not found in .env.local');
    return false;
  }

  console.log(`   ✓ API Key ID: ${keyId}`);
  console.log(`   ✓ Private Key length: ${privateKeyRaw.length} chars`);

  // Parse private key (handle \n escapes)
  let privateKey = privateKeyRaw.replace(/\\n/g, '\n');
  
  // Validate key format
  try {
    crypto.createPrivateKey(privateKey);
    console.log('   ✓ Private key format is valid (RSA)');
  } catch (err: any) {
    console.log(`   ❌ Private key invalid: ${err.message}`);
    return false;
  }

  try {
    // Test 1: Get portfolio balance
    console.log('\n   🔹 Test 1: GET /trade-api/v2/portfolio/balance');
    const timestamp = Date.now().toString();
    const method = 'GET';
    const path = '/trade-api/v2/portfolio/balance';
    const message = `${timestamp}${method}${path}`;

    const key = crypto.createPrivateKey(privateKey);
    const signature = crypto.sign('sha256', Buffer.from(message), key).toString('base64');

    const baseUrl = process.env.KALSHI_ENV === 'production'
      ? 'https://api.elections.kalshi.com'
      : 'https://demo-api.kalshi.co';

    const response = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'KALSHI-ACCESS-KEY': keyId,
        'KALSHI-ACCESS-SIGNATURE': signature,
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
      console.log(`      ❌ FAILED: ${errorText}`);
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

  console.log(`   Coinbase API: ${coinbaseOk ? '✅ ONLINE & RESPONDING' : '❌ OFFLINE OR ERROR'}`);
  console.log(`   Kalshi API:   ${kalshiOk ? '✅ ONLINE & RESPONDING' : '❌ OFFLINE OR ERROR'}`);

  if (coinbaseOk && kalshiOk) {
    console.log('\n   🎉 BOTH APIS VERIFIED INDEPENDENTLY - READY FOR TRADING!\n');
  } else {
    console.log('\n   ⚠️  ONE OR MORE APIS FAILED - CHECK CONFIGURATION\n');
  }

  process.exit(coinbaseOk && kalshiOk ? 0 : 1);
}

main();

