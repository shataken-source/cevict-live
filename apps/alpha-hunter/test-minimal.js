// Minimal test - only Node.js built-ins
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

// Load env
const env = fs.readFileSync('.env.local', 'utf8');
let API_KEY = '', PRIVATE_KEY = '';
let inKey = false;
for (const line of env.split('\n')) {
  if (line.startsWith('KALSHI_API_KEY_ID=')) API_KEY = line.split('=')[1]?.trim();
  if (line.startsWith('KALSHI_PRIVATE_KEY=')) { inKey = true; PRIVATE_KEY = line.split('=').slice(1).join('=').trim() + '\n'; }
  else if (inKey) { if (line.trim() === '' || line.includes('=')) inKey = false; else PRIVATE_KEY += line + '\n'; }
}
PRIVATE_KEY = PRIVATE_KEY.trim();

console.log('Testing with status=open filter...');
console.log('Key ID:', API_KEY?.slice(0, 15) + '...');

// Sign request
const timestamp = Date.now().toString();
const path = '/trade-api/v2/markets?limit=10&status=open';
const msg = timestamp + 'GET' + path;
const sign = crypto.createSign('RSA-SHA256');
sign.update(msg); sign.end();
const signature = sign.sign({ key: PRIVATE_KEY, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST }).toString('base64');

// Make request
const opts = { hostname: 'trading-api.kalshi.com', port: 443, path: path, method: 'GET', headers: { 'KALSHI-ACCESS-KEY': API_KEY, 'KALSHI-ACCESS-SIGNATURE': signature, 'KALSHI-ACCESS-TIMESTAMP': timestamp } };
https.request(opts, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const d = JSON.parse(data);
      console.log('✅ Status:', res.statusCode);
      console.log('📊 Markets found:', d.markets?.length || 0);
      if (d.markets?.length > 0) {
        console.log('\nFirst 3 markets:');
        d.markets.slice(0, 3).forEach((m, i) => console.log(`  ${i+1}. ${m.ticker} - ${m.title?.slice(0, 50)}...`));
      }
    } catch (e) { console.log('❌ Error:', e.message, data.slice(0, 200)); }
  });
}).on('error', console.error).end();
