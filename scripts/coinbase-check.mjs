// Coinbase portfolio check using same JWT approach as alpha-hunter
import fs from 'fs';
import crypto from 'crypto';
import { SignJWT } from 'jose';

const VAULT_PATH = 'C:\\Cevict_Vault\\env-store.json';
let secrets = {};
try { secrets = JSON.parse(fs.readFileSync(VAULT_PATH, 'utf8')).secrets || {}; } catch { process.exit(1); }

const CB_KEY = secrets.COINBASE_API_KEY || '';
const CB_SECRET = (secrets.COINBASE_API_SECRET || '').replace(/\\n/g, '\n');

if (!CB_KEY || !CB_SECRET) {
  console.log('Missing Coinbase credentials');
  process.exit(1);
}

async function cbJWT(uri) {
  const ecPrivateKey = crypto.createPrivateKey({ key: CB_SECRET, format: 'pem' });
  const nonce = crypto.randomBytes(16).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ uri })
    .setProtectedHeader({ alg: 'ES256', kid: CB_KEY, nonce, typ: 'JWT' })
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(now + 120)
    .setSubject(CB_KEY)
    .setIssuer('cdp')
    .sign(ecPrivateKey);
}

async function cbFetch(method, path) {
  const uri = `${method} api.coinbase.com${path}`;
  const jwt = await cbJWT(uri);
  const r = await fetch(`https://api.coinbase.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!r.ok) {
    console.log(`  CB ${path}: HTTP ${r.status} ${(await r.text()).substring(0, 300)}`);
    return null;
  }
  return r.json();
}

console.log('\n═══════════ COINBASE AUDIT ═══════════\n');

// 1. Accounts / balances
console.log('--- COINBASE ACCOUNTS ---');
const accts = await cbFetch('GET', '/api/v3/brokerage/accounts?limit=49');
if (accts) {
  const accounts = accts.accounts || [];
  let totalUsd = 0;
  const nonZero = accounts.filter(a => {
    const avail = parseFloat(a.available_balance?.value || '0');
    const hold = parseFloat(a.hold?.value || '0');
    return (avail + hold) > 0.001;
  });
  console.log(`  ${nonZero.length} accounts with balance (of ${accounts.length} total)`);
  nonZero.forEach(a => {
    const avail = parseFloat(a.available_balance?.value || '0');
    const hold = parseFloat(a.hold?.value || '0');
    console.log(`  ${a.currency}: ${avail.toFixed(4)} avail + ${hold.toFixed(4)} hold`);
    if (a.currency === 'USD' || a.currency === 'USDC') totalUsd += avail + hold;
  });
  console.log(`  Total USD/USDC: $${totalUsd.toFixed(2)}`);
}

// 2. Recent fills
console.log('\n--- RECENT FILLS (last 20) ---');
const fills = await cbFetch('GET', '/api/v3/brokerage/orders/historical/fills?limit=20');
if (fills) {
  const fillArr = fills.fills || [];
  console.log(`  ${fillArr.length} recent fills`);
  let buyTotal = 0, sellTotal = 0;
  fillArr.forEach(f => {
    const total = parseFloat(f.price || 0) * parseFloat(f.size || 0);
    const fee = parseFloat(f.commission || 0);
    const dt = f.trade_time ? f.trade_time.substring(0, 19) : '?';
    console.log(`  ${dt} ${f.product_id} ${f.side} ${parseFloat(f.size).toFixed(6)} @ $${parseFloat(f.price).toFixed(2)} = $${total.toFixed(2)} fee=$${fee.toFixed(2)}`);
    if (f.side === 'BUY') buyTotal += total + fee;
    else sellTotal += total - fee;
  });
  console.log(`  Buy total: $${buyTotal.toFixed(2)}, Sell total: $${sellTotal.toFixed(2)}`);
}

// 3. Recent orders
console.log('\n--- RECENT ORDERS (last 20) ---');
const orders = await cbFetch('GET', '/api/v3/brokerage/orders/historical?limit=20');
if (orders) {
  const orderArr = orders.orders || [];
  console.log(`  ${orderArr.length} recent orders`);
  const byStatus = {};
  orderArr.forEach(o => {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    const dt = o.created_time ? o.created_time.substring(0, 19) : '?';
    const filled = o.filled_size || '0';
    const avg = o.average_filled_price || '?';
    console.log(`  ${dt} ${o.product_id} ${o.side} filled=${filled} avg=$${avg} status=${o.status}`);
  });
  console.log(`  Statuses:`, byStatus);
}

console.log('\n═══════════ COINBASE AUDIT COMPLETE ═══════════\n');
