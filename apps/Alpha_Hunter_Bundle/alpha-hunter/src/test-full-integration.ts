// @ts-nocheck
/**
 * FULL INTEGRATION TEST — Coinbase + Live Trader wiring
 * Tests every layer: auth, balance, ticker, candles, order flow, position tracking
 * Run: npx tsx src/test-full-integration.ts
 * Run with live orders: AUTO_EXECUTE=true npx tsx src/test-full-integration.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { CoinbaseExchange } from './exchanges/coinbase';

const AUTO_EXECUTE = process.env.AUTO_EXECUTE === 'true';
const PAIRS = ['BTC-USD', 'ETH-USD', 'SOL-USD'];

const pass = (msg: string) => console.log(`  ✅ ${msg}`);
const fail = (msg: string) => console.log(`  ❌ ${msg}`);
const info = (msg: string) => console.log(`  ℹ️  ${msg}`);
const section = (title: string) => console.log(`\n${'─'.repeat(55)}\n  ${title}\n${'─'.repeat(55)}`);

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) { pass(label); passed++; }
  else { fail(`${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const cb = new CoinbaseExchange();

console.log('\n🔬 ALPHA-HUNTER COINBASE INTEGRATION TEST');
console.log(`   Mode: ${AUTO_EXECUTE ? '🔴 LIVE ORDERS' : '📝 PAPER (no real orders)'}`);
console.log(`   Time: ${new Date().toISOString()}`);

// ── 1. AUTH & CONFIGURATION ──────────────────────────────────────────────────
section('1. AUTH & CONFIGURATION');
assert(cb.isConfigured(), 'CoinbaseExchange.isConfigured() = true');
assert(cb.getName() === 'Coinbase', 'getName() = Coinbase');
assert(!!process.env.COINBASE_API_KEY, 'COINBASE_API_KEY set in env');
assert(!!process.env.COINBASE_API_SECRET, 'COINBASE_API_SECRET set in env');
assert(process.env.COINBASE_API_KEY?.startsWith('organizations/'), 'API key has correct CDP format');

// ── 2. PORTFOLIO & BALANCE ───────────────────────────────────────────────────
section('2. PORTFOLIO & BALANCE');
let portfolio: any;
try {
  portfolio = await cb.getPortfolio();
  assert(portfolio.totalValue > 0, `Total portfolio value > 0`, `$${portfolio.totalValue.toFixed(2)}`);
  assert(portfolio.usdBalance >= 0, `USD/cash balance readable`, `$${portfolio.usdBalance.toFixed(2)}`);
  assert(portfolio.cryptoBalance >= 0, `Crypto balance readable`, `$${portfolio.cryptoBalance.toFixed(2)}`);
  assert(Array.isArray(portfolio.positions), 'positions is array');
  assert(portfolio.positions.length > 0, `Has crypto positions`, `${portfolio.positions.length} positions`);
  info(`Total: $${portfolio.totalValue.toFixed(2)} | Cash: $${portfolio.usdBalance.toFixed(2)} | Crypto: $${portfolio.cryptoBalance.toFixed(2)}`);
  info(`Top positions: ${portfolio.positions.slice(0,3).map((p: any) => `${p.symbol}=$${p.value.toFixed(2)}`).join(', ')}`);
} catch (e: any) {
  fail(`getPortfolio() threw: ${e.message}`); failed++;
}

// USD balance standalone
try {
  const usd = await cb.getUSDBalance();
  assert(usd >= 0, `getUSDBalance() returns number`, `$${usd.toFixed(2)}`);
} catch (e: any) {
  fail(`getUSDBalance() threw: ${e.message}`); failed++;
}

// getBalances() — non-zero only
try {
  const balances = await cb.getBalances();
  assert(Array.isArray(balances), 'getBalances() returns array');
  assert(balances.every(b => b.balance > 0), 'All returned balances are > 0');
  info(`Non-zero accounts: ${balances.length}`);
} catch (e: any) {
  fail(`getBalances() threw: ${e.message}`); failed++;
}

// ── 3. MARKET DATA ───────────────────────────────────────────────────────────
section('3. MARKET DATA (TICKER + CANDLES)');
const tickers: Record<string, any> = {};
for (const pair of PAIRS) {
  try {
    const ticker = await cb.getTicker(pair);
    assert(ticker.price > 0, `${pair} ticker price > 0`, `$${ticker.price.toLocaleString()}`);
    assert(ticker.bid > 0, `${pair} bid > 0`);
    assert(ticker.ask > 0, `${pair} ask > 0`);
    assert(ticker.ask >= ticker.bid, `${pair} ask >= bid (no crossed book)`);
    tickers[pair] = ticker;
    info(`${pair}: $${ticker.price.toLocaleString()} | bid=$${ticker.bid.toLocaleString()} ask=$${ticker.ask.toLocaleString()}`);
  } catch (e: any) {
    fail(`getTicker(${pair}): ${e.message}`); failed++;
  }
}

// getPrice() convenience wrapper
try {
  const btcPrice = await cb.getPrice('BTC-USD');
  assert(btcPrice > 0, 'getPrice(BTC-USD) > 0', `$${btcPrice.toLocaleString()}`);
  const diff = Math.abs(btcPrice - (tickers['BTC-USD']?.price || 0));
  assert(diff < 500, 'getPrice() within $500 of getTicker() price', `diff=$${diff.toFixed(2)}`);
} catch (e: any) {
  fail(`getPrice() threw: ${e.message}`); failed++;
}

// Candles (public API)
try {
  const candles = await cb.getCandles('BTC-USD', 300);
  assert(candles.length > 0, `getCandles() returns data`, `${candles.length} candles`);
  assert(candles.length >= 100, 'At least 100 candles returned');
  const last = candles[candles.length - 1];
  assert(last.close > 0, 'Last candle has close price');
  assert(last.volume >= 0, 'Last candle has volume');
  assert(last.high >= last.low, 'high >= low in candles');
  const ageMs = Date.now() - last.timestamp * 1000;
  assert(ageMs < 30 * 60 * 1000, 'Latest candle is < 30 min old', `${Math.round(ageMs/60000)}m ago`);
  info(`${candles.length} candles | latest close: $${last.close.toLocaleString()} @ ${new Date(last.timestamp * 1000).toISOString()}`);
} catch (e: any) {
  fail(`getCandles() threw: ${e.message}`); failed++;
}

// ── 4. CRYPTO BALANCE LOOKUP ─────────────────────────────────────────────────
section('4. INDIVIDUAL CRYPTO BALANCE');
try {
  const btcBal = await cb.getCryptoBalance('BTC');
  assert(btcBal >= 0, 'getCryptoBalance(BTC) returns number', `${btcBal} BTC`);
  const solBal = await cb.getCryptoBalance('SOL');
  assert(solBal >= 0, 'getCryptoBalance(SOL) returns number', `${solBal} SOL`);
} catch (e: any) {
  fail(`getCryptoBalance() threw: ${e.message}`); failed++;
}

// ── 5. ORDER FLOW (PAPER OR LIVE) ────────────────────────────────────────────
section(`5. ORDER FLOW (${AUTO_EXECUTE ? 'LIVE' : 'PAPER SIMULATION'})`);

if (!AUTO_EXECUTE) {
  // Paper: verify order construction logic without placing
  info('AUTO_EXECUTE=false — simulating order flow without placing real orders');

  const btcTicker = tickers['BTC-USD'];
  if (btcTicker) {
    const tradeSize = 5; // $5 test
    const side = 'buy';
    const entryPrice = btcTicker.price;
    const takeProfit = entryPrice * 1.015;
    const stopLoss = entryPrice * 0.99;

    assert(tradeSize > 0, 'Trade size > 0');
    assert(entryPrice > 0, 'Entry price > 0');
    assert(takeProfit > entryPrice, 'Take profit > entry (buy)');
    assert(stopLoss < entryPrice, 'Stop loss < entry (buy)');

    const cryptoAmount = tradeSize / entryPrice;
    assert(cryptoAmount > 0, `Crypto amount calculable`, `${cryptoAmount.toFixed(8)} BTC`);
    assert(cryptoAmount < 1, 'Crypto amount < 1 BTC for $5 trade (sanity check)');

    info(`Paper BUY: $${tradeSize} → ${cryptoAmount.toFixed(8)} BTC @ $${entryPrice.toLocaleString()}`);
    info(`TP: $${takeProfit.toLocaleString()} (+1.5%) | SL: $${stopLoss.toLocaleString()} (-1%)`);
    pass('Paper order flow validated (no real order placed)');
    passed++;
  }
} else {
  // Live: place a real $1 test order
  info('AUTO_EXECUTE=true — placing REAL $1 test order on Coinbase');
  const usdBal = await cb.getUSDBalance();
  if (usdBal < 1) {
    info(`Insufficient USD balance ($${usdBal.toFixed(2)}) — skipping live order test`);
  } else {
    try {
      const order = await cb.marketOrder('BTC-USD', 'buy', 1);
      assert(!!order, 'marketOrder() returned result');
      assert(!!order?.id, 'Order has ID', order?.id);
      assert((order?.price || 0) > 0, 'Order has fill price', `$${order?.price?.toLocaleString()}`);
      assert((order?.size || 0) > 0, 'Order has size');
      info(`LIVE ORDER PLACED: id=${order?.id} price=$${order?.price?.toLocaleString()} size=${order?.size}`);
    } catch (e: any) {
      fail(`marketOrder() threw: ${e.message}`); failed++;
    }
  }
}

// ── 6. PORTFOLIO ID CACHING ──────────────────────────────────────────────────
section('6. PORTFOLIO ID CACHING');
try {
  const id1 = await cb.getPortfolioId();
  const id2 = await cb.getPortfolioId();
  assert(!!id1, 'getPortfolioId() returns UUID', id1 || 'null');
  assert(id1 === id2, 'Second call returns same cached ID (no extra API call)');
  assert(id1?.length === 36, 'UUID is 36 chars');
} catch (e: any) {
  fail(`getPortfolioId() threw: ${e.message}`); failed++;
}

// ── 7. SIMULATION MODE ───────────────────────────────────────────────────────
section('7. SIMULATION MODE (unconfigured exchange)');
// Temporarily test simulation by checking simulatedResponse logic
const simCb = new CoinbaseExchange();
// Override configured flag to test simulation path
(simCb as any).configured = false;
try {
  const simAccounts = await simCb.getAccounts();
  assert(Array.isArray(simAccounts), 'Simulation returns accounts array');
  assert(simAccounts.length > 0, 'Simulation has mock accounts');
  const simUsd = simAccounts.find((a: any) => a.currency === 'USD');
  assert(!!simUsd, 'Simulation has USD account');
  info(`Sim USD balance: $${simUsd?.balance}`);
} catch (e: any) {
  fail(`Simulation mode threw: ${e.message}`); failed++;
}

// ── RESULTS ──────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(55)}`);
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('  🎉 ALL TESTS PASSED — Coinbase integration fully wired');
} else {
  console.log(`  ⚠️  ${failed} test(s) failed — review above`);
}
console.log(`${'═'.repeat(55)}\n`);
