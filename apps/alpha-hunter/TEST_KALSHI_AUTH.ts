#!/usr/bin/env tsx
/**
 * TEST_KALSHI_AUTH.ts
 * Independent verification of Kalshi API authentication
 * Tests the 2025 authentication with new headers and endpoint
 */

import crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const KALSHI_API_KEY_ID = process.env.KALSHI_API_KEY_ID || '';
const KALSHI_PRIVATE_KEY = process.env.KALSHI_PRIVATE_KEY || '';
const KALSHI_ENV = process.env.KALSHI_ENV || 'production';

const BASE_URL = KALSHI_ENV === 'production'
  ? 'https://api.elections.kalshi.com/trade-api/v2'
  : 'https://demo-api.kalshi.co/trade-api/v2';

console.log(`\n🔍 KALSHI API AUTHENTICATION TEST`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
console.log(`Environment: ${KALSHI_ENV}`);
console.log(`Base URL: ${BASE_URL}`);
console.log(`API Key ID: ${KALSHI_API_KEY_ID.substring(0, 8)}...`);
console.log(`Private Key Length: ${KALSHI_PRIVATE_KEY.length} chars\n`);

function parsePrivateKey(keyStr: string): string {
  if (!keyStr) return '';

  let key = keyStr;

  // Remove quotes
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  // Handle escaped newlines (multiple passes to handle double-escaped)
  key = key.replace(/\\\\n/g, '\n');  // \\n -> \n
  key = key.replace(/\\n/g, '\n');     // \n -> newline
  key = key.replace(/\\r/g, '');       // Remove \r
  key = key.replace(/\r\n/g, '\n');   // Windows newlines
  key = key.replace(/\r/g, '\n');     // Old Mac newlines

  // Ensure proper PEM format with headers on their own lines
  if (key.includes('-----BEGIN') && key.includes('-----END')) {
    key = key.replace(/(-----BEGIN[^-]+-----)/g, '\n$1\n');
    key = key.replace(/(-----END[^-]+-----)/g, '\n$1\n');
    key = key.replace(/\n\n+/g, '\n'); // Remove extra newlines
    key = key.trim();
  }

  return key;
}

function signRequest(method: string, path: string): { signature: string; timestamp: string } {
  const parsedKey = parsePrivateKey(KALSHI_PRIVATE_KEY);

  // Kalshi uses milliseconds timestamp
  const timestamp = Date.now().toString();

  // Strip query parameters from path
  const pathWithoutQuery = path.split('?')[0];

  // Message format: timestamp + method + path
  const message = `${timestamp}${method}${pathWithoutQuery}`;

  console.log(`📝 Signing message: ${message.substring(0, 100)}...`);

  try {
    // Try multiple key formats
    let privateKeyObj;
    try {
      privateKeyObj = crypto.createPrivateKey(parsedKey);
    } catch (e1: any) {
      try {
        privateKeyObj = crypto.createPrivateKey({
          key: parsedKey,
          format: 'pem',
          type: 'pkcs8'
        });
      } catch (e2: any) {
        try {
          privateKeyObj = crypto.createPrivateKey({
            key: parsedKey,
            format: 'pem',
            type: 'pkcs1'
          });
        } catch (e3: any) {
          console.error(`❌ All key format attempts failed:`);
          console.error(`   PKCS8: ${e2.message}`);
          console.error(`   PKCS1: ${e3.message}`);
          console.error(`   Parsed key preview: ${parsedKey.substring(0, 100)}...`);
          console.error(`   Parsed key lines: ${parsedKey.split('\n').length}`);
          return { signature: '', timestamp: '' };
        }
      }
    }

    // Kalshi uses RSA-PSS with SHA256
    const signature = crypto.sign(
      'sha256',
      Buffer.from(message),
      {
        key: privateKeyObj,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
      }
    );

    return {
      signature: signature.toString('base64'),
      timestamp
    };
  } catch (err: any) {
    console.error(`❌ Signing error: ${err.message}`);
    console.error(`   Stack: ${err.stack}`);
    return { signature: '', timestamp: '' };
  }
}

async function testKalshiAuth() {
  console.log(`🔍 Testing GET /portfolio/balance...\n`);

  const method = 'GET';
  const path = '/portfolio/balance';
  const { signature, timestamp } = signRequest(method, path);

  if (!signature) {
    console.error(`❌ Failed to generate signature. Check private key format.`);
    return;
  }

  console.log(`✅ Signature generated: ${signature.substring(0, 20)}...`);
  console.log(`✅ Timestamp: ${timestamp}\n`);

  const url = `${BASE_URL}${path}`;
  console.log(`📡 Request: ${method} ${url}`);
  console.log(`📋 Headers:`);
  console.log(`   KALSHI-ACCESS-KEY: ${KALSHI_API_KEY_ID}`);
  console.log(`   KALSHI-ACCESS-TIMESTAMP: ${timestamp}`);
  console.log(`   KALSHI-ACCESS-SIGNATURE: ${signature.substring(0, 30)}...\n`);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'KALSHI-ACCESS-KEY': KALSHI_API_KEY_ID,
        'KALSHI-ACCESS-SIGNATURE': signature,
        'KALSHI-ACCESS-TIMESTAMP': timestamp,
      },
    });

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(`📊 RESPONSE:\n`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`);
    for (const [key, value] of response.headers.entries()) {
      console.log(`      ${key}: ${value}`);
    }

    const body = await response.text();
    console.log(`\n   Body (${body.length} bytes):`);
    if (body.length < 500) {
      console.log(`   ${body}\n`);
    } else {
      console.log(`   ${body.substring(0, 500)}...\n`);
    }

    if (response.status === 200) {
      console.log(`✅ AUTHENTICATION SUCCESSFUL!\n`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      return true;
    } else {
      console.log(`❌ AUTHENTICATION FAILED!\n`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      return false;
    }
  } catch (err: any) {
    console.error(`❌ Request error: ${err.message}\n`);
    return false;
  }
}

// Run test
testKalshiAuth().then((success) => {
  process.exit(success ? 0 : 1);
});

