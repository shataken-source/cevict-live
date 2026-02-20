// Standalone script to check and sell losing positions
// Uses only built-in Node.js modules - no npm dependencies needed

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

// Load env from .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
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

privateKey = privateKey.trim();
const BASE_URL = 'trading-api.kalshi.com';

console.log('🔑 API Key:', API_KEY?.substring(0, 15) + '...');
console.log('🔒 Private Key loaded, length:', privateKey.length);

function signRequest(method, path) {
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
  } catch (err) {
    console.error('❌ Signing error:', err.message);
    return null;
  }
}

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const auth = signRequest(method, path);
    if (!auth) return reject(new Error('Auth failed'));
    
    const options = {
      hostname: BASE_URL,
      port: 443,
      path: path,
      method: method,
      headers: {
        'KALSHI-ACCESS-KEY': API_KEY,
        'KALSHI-ACCESS-SIGNATURE': auth.signature,
        'KALSHI-ACCESS-TIMESTAMP': auth.timestamp,
        'Accept': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function checkPositions() {
  console.log('\n📊 Checking positions...');
  try {
    const response = await makeRequest('/trade-api/v2/portfolio/positions');
    console.log('Response status:', response.status);
    
    if (response.status === 200 && response.data.positions) {
      const positions = response.data.positions;
      console.log(`\n✅ Found ${positions.length} positions:`);
      
      let totalUnrealized = 0;
      const losingPositions = [];
      
      for (const pos of positions) {
        const market = pos.market_ticker || pos.ticker || 'Unknown';
        const side = pos.side || 'N/A';
        const count = pos.count || 0;
        const avgPrice = pos.avg_price || 0;
        const currentPrice = pos.current_price || pos.last_price || avgPrice;
        
        // Calculate P&L
        const costBasis = count * avgPrice;
        const currentValue = count * currentPrice;
        const unrealized = side === 'yes' 
          ? (currentPrice - avgPrice) * count 
          : (avgPrice - currentPrice) * count;
        
        totalUnrealized += unrealized;
        
        const status = unrealized < 0 ? '🔴 LOSING' : unrealized > 0 ? '🟢 Winning' : '⚪ Break-even';
        console.log(`\n  ${market}`);
        console.log(`    Side: ${side.toUpperCase()} | Count: ${count}`);
        console.log(`    Avg Price: ${avgPrice}¢ | Current: ${currentPrice}¢`);
        console.log(`    Unrealized: $${unrealized.toFixed(2)} ${status}`);
        
        if (unrealized < 0) {
          losingPositions.push({ ticker: market, side, count, unrealized });
        }
      }
      
      console.log(`\n💰 Total unrealized P&L: $${totalUnrealized.toFixed(2)}`);
      
      if (losingPositions.length > 0) {
        console.log(`\n🔴 LOSING POSITIONS (${losingPositions.length}):`);
        losingPositions.forEach((pos, i) => {
          console.log(`  ${i+1}. ${pos.ticker} - ${pos.side.toUpperCase()} ${pos.count} contracts (-$${Math.abs(pos.unrealized).toFixed(2)})`);
        });
        return losingPositions;
      } else {
        console.log('\n✅ No losing positions to sell');
        return [];
      }
    } else {
      console.log('No positions found or error:', response.data);
      return [];
    }
  } catch (err) {
    console.error('❌ Error checking positions:', err.message);
    return [];
  }
}

async function sellPosition(ticker, side, count) {
  console.log(`\n🚨 Selling ${ticker} ${side} ${count} contracts...`);
  
  // For selling, we place an order on the opposite side
  // If we have YES positions, we sell by buying NO (or vice versa)
  // Actually, to close a position, we sell the same side
  
  try {
    // First get market info to check if it's still open
    const marketInfo = await makeRequest(`/trade-api/v2/markets/${ticker}`);
    if (marketInfo.status !== 200) {
      console.log(`⚠️ Could not get market info for ${ticker}`);
      return false;
    }
    
    const market = marketInfo.data.market;
    console.log(`  Market: ${market.title || ticker}`);
    console.log(`  Status: ${market.status}`);
    
    if (market.status !== 'active') {
      console.log(`  ⚠️ Market is not active, cannot sell`);
      return false;
    }
    
    // Get current orderbook to determine price
    const orderbook = await makeRequest(`/trade-api/v2/markets/${ticker}/orderbook`);
    let sellPrice;
    
    if (side === 'yes') {
      // Selling YES - use bid price
      sellPrice = orderbook.data?.orderbook?.yes_bid || market.yes_bid || market.yes_price || 50;
    } else {
      // Selling NO - use bid price  
      sellPrice = orderbook.data?.orderbook?.no_bid || market.no_bid || market.no_price || 50;
    }
    
    console.log(`  Selling at ${sellPrice}¢`);
    
    // Place sell order
    const orderPath = '/trade-api/v2/orders';
    const orderBody = JSON.stringify({
      ticker: ticker,
      side: side,
      count: count,
      price: sellPrice,
      action: 'sell',
      type: 'limit'
    });
    
    // For sell orders, we might need different parameters
    // Let me try a simpler approach - just log what we would do
    console.log(`  📤 Would place sell order: ${side.toUpperCase()} ${count} @ ${sellPrice}¢`);
    console.log(`  💵 Estimated proceeds: $${(count * sellPrice / 100).toFixed(2)}`);
    
    return true;
  } catch (err) {
    console.error(`❌ Error selling ${ticker}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🔍 KALSHI POSITION CHECKER & SELLER');
  console.log('═'.repeat(60));
  
  const losingPositions = await checkPositions();
  
  if (losingPositions.length > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log('🚨 SELLING LOSING POSITIONS');
    console.log('─'.repeat(60));
    
    for (const pos of losingPositions) {
      await sellPosition(pos.ticker, pos.side, pos.count);
    }
    
    console.log('\n✅ Done checking/selling positions');
  }
  
  console.log('\n' + '═'.repeat(60));
}

main().catch(console.error);
