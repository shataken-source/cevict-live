// Minimal test - only Node.js built-ins
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

// Load env - read entire file
const envContent = fs.readFileSync('.env.local', 'utf8');

// Find KALSHI_PRIVATE_KEY and extract until next env var or end of file
const keyStart = envContent.indexOf('KALSHI_PRIVATE_KEY=');
if (keyStart === -1) {
  console.error('KALSHI_PRIVATE_KEY not found');
  process.exit(1);
}

let keyContent = envContent.slice(keyStart + 'KALSHI_PRIVATE_KEY='.length);
// Find next env var or end
const nextVar = keyContent.search(/\n[A-Z_]+=/);
if (nextVar !== -1) {
  keyContent = keyContent.slice(0, nextVar);
}
keyContent = keyContent.trim();

console.log('Key found!');
console.log('Length:', keyContent.length);
console.log('First 50 chars:', keyContent.substring(0, 50));
console.log('Last 50 chars:', keyContent.slice(-50));

// Check and fix key format
let keyData = keyContent;
if (!keyData.includes('-----BEGIN')) {
  // Need to add PEM headers
  keyData = '-----BEGIN RSA PRIVATE KEY-----\n' + keyData.replace(/\r?\n/g, '').replace(/(.{64})/g, '$1\n') + '\n-----END RSA PRIVATE KEY-----';
}

console.log('\nFormatted key preview:');
console.log(keyData.split('\n').slice(0, 3).join('\n'));

// Try signing
const timestamp = Date.now().toString();
const path = '/trade-api/v2/markets?limit=10&status=open';
const msg = timestamp + 'GET' + path;

console.log('\nMessage to sign:', msg);

try {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(msg);
  sign.end();
  const signature = sign.sign({
    key: keyData,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
  }).toString('base64');

  console.log('✅ Signature created! Length:', signature.length);

  // Make API call
  const API_KEY = envContent.match(/KALSHI_API_KEY_ID=(.+)/)?.[1]?.trim();
  console.log('API Key:', API_KEY?.slice(0, 15) + '...');

  const opts = {
    hostname: 'api.elections.kalshi.com',
    port: 443,
    path: path,
    method: 'GET',
    headers: {
      'KALSHI-ACCESS-KEY': API_KEY,
      'KALSHI-ACCESS-SIGNATURE': signature,
      'KALSHI-ACCESS-TIMESTAMP': timestamp
    }
  };

  console.log('\nFetching markets...');

  https.request(opts, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      if (res.statusCode === 200) {
        const d = JSON.parse(data);
        console.log('✅ SUCCESS! Markets found:', d.markets?.length || 0);
        if (d.markets?.length > 0) {
          console.log('\nFirst 3 markets:');
          d.markets.slice(0, 3).forEach((m, i) => console.log(`  ${i + 1}. ${m.ticker} - ${m.title?.slice(0, 50)}...`));
        }
      } else {
        console.log('❌ Error:', data.slice(0, 200));
      }
    });
  }).on('error', (e) => console.error('Request error:', e.message)).end();

} catch (e) {
  console.error('❌ Signing failed:', e.message);
}
