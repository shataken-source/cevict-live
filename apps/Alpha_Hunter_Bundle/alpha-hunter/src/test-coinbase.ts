// @ts-nocheck
/**
 * Coinbase Connection Test
 * Tests auth, balance fetch, ticker, and candles
 * Run: npx tsx src/test-coinbase.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { CoinbaseExchange } from './exchanges/coinbase';

async function main() {
  console.log('\n🔵 COINBASE CONNECTION TEST\n' + '='.repeat(50));

  const cb = new CoinbaseExchange();

  if (!cb.isConfigured()) {
    console.log('❌ Not configured — check COINBASE_API_KEY and COINBASE_API_SECRET in .env.local');
    process.exit(1);
  }

  console.log('✅ Credentials loaded\n');

  // 1. Balance
  console.log('── 1. Fetching accounts/balance...');
  try {
    const usd = await cb.getUSDBalance();
    console.log(`   USD balance: $${usd.toFixed(2)}`);
    const accounts = await cb.getAccounts();
    const nonZero = accounts.filter(a => a.balance > 0.0001);
    console.log(`   Non-zero accounts: ${nonZero.map(a => `${a.currency}=${a.balance}`).join(', ') || 'none'}`);
  } catch (e: any) {
    console.log(`   ❌ Balance failed: ${e.message}`);
  }

  // 2. Ticker
  console.log('\n── 2. Fetching BTC-USD ticker...');
  try {
    const ticker = await cb.getTicker('BTC-USD');
    console.log(`   BTC price: $${ticker.price.toLocaleString()}`);
    console.log(`   Bid: $${ticker.bid.toLocaleString()}  Ask: $${ticker.ask.toLocaleString()}`);
    console.log(`   24h volume: ${ticker.volume.toLocaleString()}`);
  } catch (e: any) {
    console.log(`   ❌ Ticker failed: ${e.message}`);
  }

  // 3. Candles (public, no auth needed)
  console.log('\n── 3. Fetching BTC-USD candles (5m)...');
  try {
    const candles = await cb.getCandles('BTC-USD', 300);
    console.log(`   Got ${candles.length} candles`);
    if (candles.length > 0) {
      const last = candles[candles.length - 1];
      console.log(`   Latest close: $${last.close.toLocaleString()} @ ${new Date(last.timestamp * 1000).toISOString()}`);
    }
  } catch (e: any) {
    console.log(`   ❌ Candles failed: ${e.message}`);
  }

  // 4. Portfolio
  console.log('\n── 4. Fetching portfolio...');
  try {
    const portfolio = await cb.getPortfolio();
    console.log(`   Total value: $${portfolio.totalValue.toFixed(2)}`);
    console.log(`   USD: $${portfolio.usdBalance.toFixed(2)}`);
    if (portfolio.positions.length > 0) {
      portfolio.positions.forEach(p => {
        console.log(`   ${p.symbol}: ${p.amount} @ $${p.price.toLocaleString()} = $${p.value.toFixed(2)}`);
      });
    } else {
      console.log('   No crypto positions');
    }
  } catch (e: any) {
    console.log(`   ❌ Portfolio failed: ${e.message}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('Test complete.\n');
}

main().catch(console.error);
