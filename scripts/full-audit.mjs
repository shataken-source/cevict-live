// Full audit: Kalshi positions + Coinbase portfolio
import fs from 'fs';
import crypto from 'crypto';

const VAULT_PATH = 'C:\\Cevict_Vault\\env-store.json';
let secrets = {};
try { secrets = JSON.parse(fs.readFileSync(VAULT_PATH, 'utf8')).secrets || {}; } catch { process.exit(1); }

// ═══ KALSHI ═══
const KALSHI_BASE = 'https://api.elections.kalshi.com';
const KALSHI_KEY_ID = secrets.KALSHI_API_KEY_ID || '';
const KALSHI_PRIVATE_KEY_RAW = secrets.KALSHI_PRIVATE_KEY || '';

function normalizePem(raw) {
  const normalized = raw.replace(/\\n/g, '\n').replace(/"/g, '').trim();
  const beginMatch = normalized.match(/-----BEGIN ([^-]+)-----/);
  const endMatch = normalized.match(/-----END ([^-]+)-----/);
  if (!beginMatch || !endMatch) return normalized;
  const type = beginMatch[1];
  const b64 = normalized
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
  const wrapped = (b64.match(/.{1,64}/g) ?? []).join('\n');
  return `-----BEGIN ${type}-----\n${wrapped}\n-----END ${type}-----`;
}

const KALSHI_PRIVATE_KEY = normalizePem(KALSHI_PRIVATE_KEY_RAW);

function kalshiAuth(method, path) {
  const ts = Date.now().toString();
  const pathClean = path.split('?')[0];
  const msg = ts + method.toUpperCase() + pathClean;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(msg);
  sign.end();
  const sig = sign.sign(
    { key: KALSHI_PRIVATE_KEY, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST }
  ).toString('base64');
  return {
    'Content-Type': 'application/json',
    'KALSHI-ACCESS-KEY': KALSHI_KEY_ID,
    'KALSHI-ACCESS-TIMESTAMP': ts,
    'KALSHI-ACCESS-SIGNATURE': sig,
  };
}

async function kalshiFetch(method, path) {
  const fullPath = '/trade-api/v2' + path;
  const headers = kalshiAuth(method, fullPath);
  const r = await fetch(`${KALSHI_BASE}${fullPath}`, { method, headers });
  if (!r.ok) {
    const txt = await r.text();
    console.log(`  Kalshi ${path}: HTTP ${r.status} ${txt.substring(0, 200)}`);
    return null;
  }
  return r.json();
}

console.log('\n═══════════ KALSHI FULL AUDIT ═══════════\n');

// 1. Account balance
console.log('--- KALSHI BALANCE ---');
const balance = await kalshiFetch('GET', '/portfolio/balance');
if (balance) {
  console.log(`  Balance: $${((balance.balance || 0) / 100).toFixed(2)}`);
  console.log(`  Available: $${((balance.available_balance || balance.payout_available || 0) / 100).toFixed(2)}`);
  console.log(`  Portfolio value: $${((balance.portfolio_value || 0) / 100).toFixed(2)}`);
  console.log(`  Full response:`, JSON.stringify(balance));
}

// 2. Current positions (open)
console.log('\n--- KALSHI OPEN POSITIONS ---');
const positions = await kalshiFetch('GET', '/portfolio/positions?limit=100');
if (positions) {
  const posArr = positions.market_positions || positions.positions || [];
  console.log(`  Total positions: ${posArr.length}`);
  let totalCost = 0;
  let totalValue = 0;
  posArr.forEach(p => {
    const cost = ((p.total_cost || p.market_exposure || 0) / 100);
    const value = ((p.market_value || p.rest_value || 0) / 100);
    totalCost += cost;
    totalValue += value;
    console.log(`  ${p.ticker}: ${p.position || p.count || '?'} contracts, side=${p.side || '?'}, cost=$${cost.toFixed(2)}, value=$${value.toFixed(2)}`);
  });
  console.log(`  Total cost: $${totalCost.toFixed(2)}, Total value: $${totalValue.toFixed(2)}`);
}

// 3. Recent orders (filled + resting)
console.log('\n--- KALSHI RECENT ORDERS (last 50) ---');
const orders = await kalshiFetch('GET', '/portfolio/orders?limit=50');
if (orders) {
  const orderArr = orders.orders || [];
  console.log(`  Total orders: ${orderArr.length}`);
  let totalSpent = 0;
  const byStatus = {};
  orderArr.forEach(o => {
    const status = o.status || 'unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;
    const cost = ((o.order_total || o.cost || 0) / 100);
    if (status === 'filled' || status === 'resting') totalSpent += cost;
    const dt = o.created_time ? o.created_time.substring(0, 19) : 'unknown';
    console.log(`  ${dt} ${o.ticker} ${o.side} ${o.count || o.remaining_count || '?'}ct status=${status} cost=$${cost.toFixed(2)} type=${o.type}`);
  });
  console.log(`  Order statuses:`, byStatus);
  console.log(`  Total spent on filled/resting: $${totalSpent.toFixed(2)}`);
}

// 4. Settlements (recent)
console.log('\n--- KALSHI RECENT SETTLEMENTS ---');
const settlements = await kalshiFetch('GET', '/portfolio/settlements?limit=50');
if (settlements) {
  const settArr = settlements.settlements || [];
  console.log(`  Total settlements: ${settArr.length}`);
  let settledProfit = 0;
  let settledLoss = 0;
  settArr.forEach(s => {
    const rev = ((s.revenue || 0) / 100);
    const cost = ((s.cost || s.no_total_cost || s.yes_total_cost || 0) / 100);
    const pnl = rev - cost;
    if (pnl >= 0) settledProfit += pnl;
    else settledLoss += Math.abs(pnl);
    const dt = s.settled_time ? s.settled_time.substring(0, 19) : 'unknown';
    console.log(`  ${dt} ${s.ticker} rev=$${rev.toFixed(2)} cost=$${cost.toFixed(2)} PnL=$${pnl.toFixed(2)} ${pnl >= 0 ? '✅' : '❌'}`);
  });
  console.log(`  Settled profit: $${settledProfit.toFixed(2)}, Settled loss: $${settledLoss.toFixed(2)}, Net: $${(settledProfit - settledLoss).toFixed(2)}`);
}

// ═══ COINBASE ═══
console.log('\n\n═══════════ COINBASE AUDIT ═══════════\n');

const CB_KEY = secrets.COINBASE_API_KEY || '';
const CB_SECRET = secrets.COINBASE_API_SECRET || '';

if (!CB_KEY || !CB_SECRET) {
  console.log('  Coinbase credentials not found in vault');
} else {
  // Use JWT auth for Coinbase Advanced Trade API
  try {
    // Check if jose is available for JWT
    const { SignJWT, importPKCS8 } = await import('jose');

    const uri = 'GET api.coinbase.com/api/v3/brokerage/accounts';
    const now = Math.floor(Date.now() / 1000);

    // Parse the key name from COINBASE_API_KEY (format: organizations/{org_id}/apiKeys/{key_id})
    const keyName = CB_KEY;

    const privateKey = await importPKCS8(CB_SECRET, 'ES256');
    const jwt = await new SignJWT({
      sub: keyName,
      iss: 'coinbase-cloud',
      aud: ['cdp'],
      nbf: now,
      exp: now + 120,
      uri,
    })
      .setProtectedHeader({ alg: 'ES256', kid: keyName, nonce: crypto.randomBytes(16).toString('hex'), typ: 'JWT' })
      .sign(privateKey);

    const r = await fetch('https://api.coinbase.com/api/v3/brokerage/accounts?limit=49', {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (r.ok) {
      const data = await r.json();
      const accounts = data.accounts || [];
      console.log(`  ${accounts.length} accounts found`);
      let totalUsd = 0;
      accounts.filter(a => parseFloat(a.available_balance?.value || '0') > 0 || parseFloat(a.hold?.value || '0') > 0)
        .forEach(a => {
          const avail = parseFloat(a.available_balance?.value || '0');
          const hold = parseFloat(a.hold?.value || '0');
          const total = avail + hold;
          console.log(`  ${a.currency}: $${avail.toFixed(2)} avail + $${hold.toFixed(2)} hold = $${total.toFixed(2)}`);
          // Rough USD value (we'd need prices for crypto)
          if (a.currency === 'USD' || a.currency === 'USDC') totalUsd += total;
        });
      console.log(`  Total USD/USDC: $${totalUsd.toFixed(2)}`);

      // Get recent fills/trades
      const fillUri = 'GET api.coinbase.com/api/v3/brokerage/orders/historical/fills';
      const fillJwt = await new SignJWT({
        sub: keyName,
        iss: 'coinbase-cloud',
        aud: ['cdp'],
        nbf: now,
        exp: now + 120,
        uri: fillUri,
      })
        .setProtectedHeader({ alg: 'ES256', kid: keyName, nonce: crypto.randomBytes(16).toString('hex'), typ: 'JWT' })
        .sign(privateKey);

      const fillR = await fetch('https://api.coinbase.com/api/v3/brokerage/orders/historical/fills?limit=20', {
        headers: { Authorization: `Bearer ${fillJwt}` },
      });

      if (fillR.ok) {
        const fillData = await fillR.json();
        const fills = fillData.fills || [];
        console.log(`\n  Recent fills: ${fills.length}`);
        fills.forEach(f => {
          const dt = f.trade_time ? f.trade_time.substring(0, 19) : '?';
          const total = (parseFloat(f.price || 0) * parseFloat(f.size || 0)).toFixed(2);
          console.log(`  ${dt} ${f.product_id} ${f.side} ${f.size} @ $${f.price} = $${total}`);
        });
      } else {
        console.log(`  Fills API: HTTP ${fillR.status} ${await fillR.text()}`);
      }
    } else {
      const err = await r.text();
      console.log(`  Coinbase API: HTTP ${r.status} ${err.substring(0, 300)}`);
    }
  } catch (e) {
    console.log(`  Coinbase error: ${e.message}`);
    // If jose not available, note it
    if (e.message.includes('jose')) {
      console.log('  Install jose: npm install jose');
    }
  }
}

console.log('\n═══════════ AUDIT COMPLETE ═══════════\n');
