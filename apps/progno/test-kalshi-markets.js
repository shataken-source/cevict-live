// Test script to see what Kalshi markets are actually available
const crypto = require('crypto');

const KALSHI_BASE = 'https://api.elections.kalshi.com/trade-api/v2';
const KALSHI_KEY_ID = process.env.KALSHI_API_KEY_ID || '';
const KALSHI_PRIVATE_KEY = process.env.KALSHI_PRIVATE_KEY || '';

function buildAuthHeaders(method, path) {
  const ts = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const msgToSign = ts + KALSHI_KEY_ID + method.toUpperCase() + path;
  const sign = crypto.createSign('SHA256');
  sign.update(msgToSign);
  const sig = sign.sign(
    { key: KALSHI_PRIVATE_KEY, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 },
    'base64'
  );
  return {
    'Content-Type': 'application/json',
    'KALSHI-ACCESS-KEY': KALSHI_KEY_ID,
    'KALSHI-ACCESS-TIMESTAMP': ts,
    'KALSHI-ACCESS-NONCE': nonce,
    'KALSHI-ACCESS-SIGNATURE': sig,
  };
}

async function testKalshiMarkets() {
  console.log('Testing Kalshi API...\n');

  // Test 1: Get all open markets
  const path1 = '/markets?status=open&limit=100';
  console.log('1. Fetching first 100 open markets...');
  const headers1 = buildAuthHeaders('GET', path1);
  const res1 = await fetch(`${KALSHI_BASE}${path1}`, { headers: headers1 });
  const data1 = await res1.json();
  console.log(`   Found ${data1.markets?.length || 0} markets`);
  console.log(`   Sample titles:`);
  data1.markets?.slice(0, 5).forEach(m => console.log(`   - ${m.title}`));

  // Test 2: NBA markets
  console.log('\n2. Fetching NBA markets...');
  const path2 = '/markets?status=open&limit=100&series_ticker=KXNBA';
  const headers2 = buildAuthHeaders('GET', path2);
  const res2 = await fetch(`${KALSHI_BASE}${path2}`, { headers: headers2 });
  const data2 = await res2.json();
  console.log(`   Found ${data2.markets?.length || 0} NBA markets`);
  data2.markets?.forEach(m => console.log(`   - ${m.title} (${m.ticker})`));

  // Test 3: NCAAB markets
  console.log('\n3. Fetching NCAAB markets...');
  const path3 = '/markets?status=open&limit=100&series_ticker=KXNCAAMB';
  const headers3 = buildAuthHeaders('GET', path3);
  const res3 = await fetch(`${KALSHI_BASE}${path3}`, { headers: headers3 });
  const data3 = await res3.json();
  console.log(`   Found ${data3.markets?.length || 0} NCAAB markets`);
  data3.markets?.forEach(m => console.log(`   - ${m.title} (${m.ticker})`));

  // Test 4: Search for specific teams from predictions
  console.log('\n4. Searching for specific teams...');
  const teams = ['Houston Rockets', 'Lakers', 'Grizzlies', 'Jazz', 'Magic'];
  for (const team of teams) {
    const allMarkets = data1.markets || [];
    const matches = allMarkets.filter(m => 
      m.title.toLowerCase().includes(team.toLowerCase())
    );
    console.log(`   ${team}: ${matches.length} matches`);
    matches.forEach(m => console.log(`     - ${m.title}`));
  }
}

testKalshiMarkets().catch(console.error);
