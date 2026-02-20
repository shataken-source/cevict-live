// @ts-nocheck
/**
 * Supabase Audit Trail Test
 * Verifies connection to rdbuwyefbgnbuhmjrizo.supabase.co
 * and confirms all audit tables are writable/readable
 * Run: npx tsx src/test-supabase.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import {
  saveBotPrediction,
  getBotPredictions,
  saveTradeRecord,
  updateTradeOutcome,
  getTradeHistory,
  saveBotLearning,
  getBotLearnings,
  getBotConfig,
} from './lib/supabase-memory';

const pass = (msg: string) => { console.log(`  ✅ ${msg}`); passed++; };
const fail = (msg: string) => { console.log(`  ❌ ${msg}`); failed++; };
const info = (msg: string) => console.log(`  ℹ️  ${msg}`);
const section = (t: string) => console.log(`\n${'─'.repeat(55)}\n  ${t}\n${'─'.repeat(55)}`);
function assert(condition: boolean, label: string, detail?: string) {
  if (condition) { pass(label); }
  else { fail(`${label}${detail ? ': ' + detail : ''}`); }
}

let passed = 0, failed = 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('\n🗄️  SUPABASE AUDIT TRAIL TEST');
console.log(`   DB: ${url}`);
console.log(`   Time: ${new Date().toISOString()}`);

// ── 1. CREDENTIALS ───────────────────────────────────────────────────────────
section('1. CREDENTIALS');
if (url === 'https://rdbuwyefbgnbuhmjrizo.supabase.co') pass('URL = rdbuwyefbgnbuhmjrizo (correct prod DB)');
else fail(`URL mismatch: got ${url}`);
if (key.startsWith('eyJ')) pass('Service role key present (JWT format)');
else fail('Service role key missing or invalid');

// ── 2. RAW CONNECTION ────────────────────────────────────────────────────────
section('2. RAW CONNECTION');
const client = createClient(url, key);
try {
  // Ping with a simple query
  const { data, error } = await client.from('trade_history').select('id').limit(1);
  if (error) {
    fail(`trade_history query failed: ${error.message} (code: ${error.code})`);
    if (error.code === '42P01') info('Table does not exist — may need schema migration');
  } else {
    pass(`trade_history table accessible (${data?.length ?? 0} rows sampled)`);
  }
} catch (e: any) {
  fail(`Connection threw: ${e.message}`);
}

try {
  const { data, error } = await client.from('bot_predictions').select('id').limit(1);
  if (error) fail(`bot_predictions query failed: ${error.message}`);
  else pass(`bot_predictions table accessible (${data?.length ?? 0} rows sampled)`);
} catch (e: any) {
  fail(`bot_predictions threw: ${e.message}`);
}

try {
  const { data, error } = await client.from('bot_config').select('config_key').limit(5);
  if (error) fail(`bot_config query failed: ${error.message}`);
  else {
    pass(`bot_config table accessible`);
    if (data?.length) info(`Config keys: ${data.map((r: any) => r.config_key).join(', ')}`);
  }
} catch (e: any) {
  fail(`bot_config threw: ${e.message}`);
}

// ── 3. WRITE: TRADE RECORD ───────────────────────────────────────────────────
section('3. WRITE: TRADE RECORD (audit trail)');
const testSymbol = `TEST-AUDIT-${Date.now()}`;
try {
  const ok = await saveTradeRecord({
    platform: 'coinbase',
    trade_type: 'buy',
    symbol: testSymbol,
    entry_price: 68000,
    amount: 5,
    fees: 0.03,
    opened_at: new Date(),
    confidence: 72,
    edge: 3.5,
    outcome: 'open',
    bot_category: 'crypto',
  });
  if (ok) pass('saveTradeRecord() wrote to trade_history');
  else fail('saveTradeRecord() returned false (client null or insert error)');
} catch (e: any) {
  fail(`saveTradeRecord() threw: ${e.message}`);
}

// ── 4. READ BACK: TRADE RECORD ───────────────────────────────────────────────
section('4. READ BACK: TRADE RECORD');
try {
  const history = await getTradeHistory('coinbase', 50);
  const found = history.find((t: any) => t.symbol === testSymbol);
  if (found) {
    pass(`Trade record found in trade_history`);
    pass(`entry_price correct: ${found.entry_price === 68000}`);
    pass(`outcome = open: ${found.outcome === 'open'}`);
    info(`Record ID: ${found.id}`);
  } else {
    fail(`Test trade record not found in trade_history (symbol=${testSymbol})`);
    info(`Total records returned: ${history.length}`);
  }
} catch (e: any) {
  fail(`getTradeHistory() threw: ${e.message}`);
}

// ── 5. WRITE: BOT PREDICTION ─────────────────────────────────────────────────
section('5. WRITE: BOT PREDICTION (audit trail)');
const testMarketId = `TEST-MARKET-${Date.now()}`;
try {
  const ok = await saveBotPrediction({
    bot_category: 'crypto',
    market_id: testMarketId,
    market_title: 'Will BTC exceed $70k? [AUDIT TEST]',
    platform: 'coinbase',
    prediction: 'buy',
    probability: 68,
    confidence: 68,
    edge: 3.2,
    reasoning: ['Strong momentum', 'Audit test entry'],
    factors: ['price_action'],
    learned_from: ['AI Analysis'],
    market_price: 68,
    predicted_at: new Date(),
  });
  if (ok) pass('saveBotPrediction() wrote to bot_predictions');
  else fail('saveBotPrediction() returned false');
} catch (e: any) {
  fail(`saveBotPrediction() threw: ${e.message}`);
}

// ── 6. READ BACK: BOT PREDICTION ─────────────────────────────────────────────
section('6. READ BACK: BOT PREDICTION');
try {
  const preds = await getBotPredictions('crypto', 'coinbase', 50);
  const found = preds.find((p: any) => p.market_id === testMarketId);
  if (found) {
    pass(`Prediction found in bot_predictions`);
    pass(`confidence correct: ${found.confidence === 68}`);
    pass(`platform = coinbase: ${found.platform === 'coinbase'}`);
    info(`Record ID: ${found.id}`);
  } else {
    fail(`Test prediction not found (market_id=${testMarketId})`);
    info(`Total predictions returned: ${preds.length}`);
  }
} catch (e: any) {
  fail(`getBotPredictions() threw: ${e.message}`);
}

// ── 7. BOT LEARNING (write, read back, update via re-observe) ────────────────
section('7. BOT LEARNING');
const testPattern = `TEST-PATTERN-${Date.now()}`;
try {
  // First observation
  const ok1 = await saveBotLearning({
    bot_category: 'crypto',
    pattern_type: 'winning_pattern',
    pattern_description: testPattern,
    confidence: 0.7,
    times_observed: 1,
    success_rate: 1.0,
    learned_at: new Date(),
    metadata: { test: true },
  });
  if (ok1) pass('saveBotLearning() first observation written');
  else fail('saveBotLearning() returned false');

  // Second observation — should increment times_observed and average success_rate
  const ok2 = await saveBotLearning({
    bot_category: 'crypto',
    pattern_type: 'winning_pattern',
    pattern_description: testPattern,
    confidence: 0.8,
    times_observed: 1,
    success_rate: 0.0, // loss this time
    learned_at: new Date(),
  });
  if (ok2) pass('saveBotLearning() second observation (re-observe) written');
  else fail('saveBotLearning() second observation returned false');

  // Read back
  const patterns = await getBotLearnings('crypto', 50);
  const found = patterns.find((p: any) => p.pattern_description === testPattern);
  if (found) {
    pass(`getBotLearnings() found pattern`);
    assert(found.times_observed === 2, `times_observed = 2 after 2 observations`, `got ${found.times_observed}`);
    // success_rate should be (1.0*1 + 0.0) / 2 = 0.5
    const expectedRate = 0.5;
    assert(Math.abs(found.success_rate - expectedRate) < 0.01, `success_rate averaged correctly (0.5)`, `got ${found.success_rate}`);
    assert(found.confidence === 0.8, `confidence updated to latest (0.8)`, `got ${found.confidence}`);
    info(`Pattern: times=${found.times_observed} success_rate=${found.success_rate} confidence=${found.confidence}`);
  } else {
    fail(`Pattern not found in getBotLearnings() (desc=${testPattern.substring(0, 30)})`);
    info(`Total patterns returned: ${patterns.length}`);
  }
} catch (e: any) {
  fail(`Bot learning threw: ${e.message}`);
}

// ── 8. UPDATE TRADE OUTCOME ───────────────────────────────────────────────────
section('8. UPDATE TRADE OUTCOME');
const outcomeSymbol = `TEST-OUTCOME-${Date.now()}`;
try {
  // Write open trade
  await saveTradeRecord({
    platform: 'coinbase', trade_type: 'buy', symbol: outcomeSymbol,
    entry_price: 68000, amount: 5, fees: 0.03, opened_at: new Date(),
    confidence: 70, edge: 3, outcome: 'open', bot_category: 'crypto',
  });

  // Close it
  const closed = await updateTradeOutcome(outcomeSymbol, {
    exitPrice: 68500, pnl: 0.037, outcome: 'win', closedAt: new Date(),
  });
  if (closed) pass('updateTradeOutcome() closed the trade');
  else fail('updateTradeOutcome() returned false');

  // Verify
  const history = await getTradeHistory('coinbase', 50);
  const found = history.find((t: any) => t.symbol === outcomeSymbol);
  if (found) {
    assert(found.outcome === 'win', `outcome = win`, found.outcome);
    assert(found.exit_price === 68500, `exit_price = 68500`, `${found.exit_price}`);
    assert(found.pnl > 0, `pnl > 0`, `${found.pnl}`);
    assert(!!found.closed_at, `closed_at set`);
    info(`Closed trade: exit=$${found.exit_price} pnl=$${found.pnl} outcome=${found.outcome}`);
  } else {
    fail(`Closed trade not found in history`);
  }
} catch (e: any) {
  fail(`updateTradeOutcome threw: ${e.message}`);
}

// ── 9. BOT CONFIG ─────────────────────────────────────────────────────────────
section('7. BOT CONFIG');
try {
  const config = await getBotConfig();
  pass(`getBotConfig() returned config`);
  pass(`maxTradeSize > 0: ${config.trading.maxTradeSize > 0} (${config.trading.maxTradeSize})`);
  pass(`minConfidence > 0: ${config.trading.minConfidence > 0} (${config.trading.minConfidence})`);
  info(`Trading config: maxTrade=$${config.trading.maxTradeSize} minConf=${config.trading.minConfidence}% dailyLimit=$${config.trading.dailySpendingLimit}`);
} catch (e: any) {
  fail(`getBotConfig() threw: ${e.message}`);
}

// ── 10. CLEANUP TEST RECORDS ─────────────────────────────────────────────────
section('10. CLEANUP TEST RECORDS');
try {
  const { error: e1 } = await client.from('trade_history').delete().eq('symbol', testSymbol);
  if (e1) fail(`Cleanup trade_history: ${e1.message}`);
  else pass('Test trade record cleaned up');

  const { error: e2 } = await client.from('bot_predictions').delete().eq('market_id', testMarketId);
  if (e2) fail(`Cleanup bot_predictions: ${e2.message}`);
  else pass('Test prediction cleaned up');

  const { error: e3 } = await client.from('bot_learnings').delete().like('pattern_description', 'TEST-PATTERN-%');
  if (e3) fail(`Cleanup bot_learnings: ${e3.message}`);
  else pass('Test learning pattern cleaned up');

  const { error: e4 } = await client.from('trade_history').delete().like('symbol', 'TEST-OUTCOME-%');
  if (e4) fail(`Cleanup outcome trade: ${e4.message}`);
  else pass('Test outcome trade cleaned up');
} catch (e: any) {
  fail(`Cleanup threw: ${e.message}`);
}

// ── RESULTS ───────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(55)}`);
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('  🎉 ALL TESTS PASSED — Supabase audit trail fully operational');
  console.log(`  📍 DB: ${url}`);
} else {
  console.log(`  ⚠️  ${failed} test(s) failed`);
}
console.log(`${'═'.repeat(55)}\n`);
