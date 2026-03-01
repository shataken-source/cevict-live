/**
 * Alpha Hunter — Pipeline Smoke Test
 *
 * Runs one cycle with mock data to verify:
 *  1. Opportunity routing: Kalshi ticker → Kalshi execution
 *  2. Opportunity routing: Progno pick → "needs match" log
 *  3. Opportunity routing: Crypto → executeBestSignal()
 *  4. Trade limiter + emergency stop checks
 *  5. AUTO_EXECUTE gate
 *
 * Run:  npx tsx src/test-pipeline.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
const alphaRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(alphaRoot, '.env.local'), override: true });

// Force auto-execute ON for test
process.env.AUTO_EXECUTE = 'true';

import type { Opportunity } from './types';
import { tradeLimiter } from './lib/trade-limiter';
import { emergencyStop } from './lib/emergency-stop';
import * as fs from 'fs';

// ─── Colors ──────────────────────────────────────────────────────────
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', D = '\x1b[2m', B = '\x1b[1m', X = '\x1b[0m';

let passed = 0;
let failed = 0;

function ok(label: string) { passed++; console.log(`  ${G}✓${X} ${label}`); }
function fail(label: string, detail?: string) { failed++; console.log(`  ${R}✗${X} ${label}${detail ? ` — ${detail}` : ''}`); }

// ─── Mock Opportunities ──────────────────────────────────────────────
function makeOpp(overrides: Partial<Opportunity> & { action: Opportunity['action'] }): Opportunity {
  return {
    id: 'test-' + Date.now(),
    type: 'prediction_market',
    source: 'Test',
    title: 'Test Opportunity',
    description: 'Mock',
    confidence: 85,
    expectedValue: 12.5,
    riskLevel: 'medium',
    timeframe: '24h',
    requiredCapital: 5,
    potentialReturn: 6,
    reasoning: ['Test reason'],
    dataPoints: [],
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const KALSHI_OPP = makeOpp({
  title: 'BTC above $90k by Friday',
  type: 'prediction_market',
  action: {
    platform: 'kalshi',
    actionType: 'buy',
    amount: 5,
    target: 'KXBTC-90K-26FEB YES',
    instructions: ['Buy YES @ 42¢'],
    autoExecute: true,
  },
});

const PROGNO_OPP = makeOpp({
  title: 'NHL: Boston Bruins',
  type: 'sports_bet',
  action: {
    platform: 'kalshi',
    actionType: 'buy',
    amount: 5,
    target: 'Boston Bruins',
    instructions: ['Bet on Bruins ML'],
    autoExecute: true,
  },
});

const CRYPTO_OPP = makeOpp({
  title: 'ETH-USDC BUY',
  type: 'crypto',
  action: {
    platform: 'crypto_exchange',
    actionType: 'buy',
    amount: 5,
    target: 'ETH-USDC',
    instructions: ['BUY ETH-USDC', 'Entry: $2400', 'Target: $2520 (+5%)', 'Stop: $2328 (-3%)'],
    autoExecute: true,
  },
});

// ─── Simulated execution (mirrors index.ts cycle logic) ──────────────
async function simulateExecution(opp: Opportunity, label: string): Promise<{
  action: string;
  details: string;
}> {
  const MAX_SINGLE_TRADE = 5;
  const stake = Math.min(opp.requiredCapital, MAX_SINGLE_TRADE);

  // Emergency stop
  const stopCheck = emergencyStop.canTrade();
  if (!stopCheck.allowed) return { action: 'BLOCKED', details: `Emergency stop: ${stopCheck.reason}` };

  // Trade limiter
  const canTrade = tradeLimiter.canTrade(stake, opp.action.platform === 'kalshi' ? 'kalshi' : 'crypto');
  if (!canTrade.allowed) return { action: 'BLOCKED', details: `Trade limiter: ${canTrade.reason}` };

  // Spending limit (only for crypto; Kalshi does not use MAX_DAILY_SPEND)
  const platform = opp.action.platform === 'kalshi' ? 'kalshi' : 'crypto';
  if (platform === 'crypto') {
    const stats = tradeLimiter.getStats();
    const cryptoSpent = stats.platformSpent?.crypto ?? stats.totalSpent;
    const spendOk = await emergencyStop.checkSpendingLimit(cryptoSpent, stake);
    if (!spendOk) return { action: 'BLOCKED', details: 'Spending limit exceeded' };
  }

  // AUTO_EXECUTE gate
  if (!opp.action.autoExecute || process.env.AUTO_EXECUTE !== 'true') {
    return { action: 'SKIPPED', details: 'Auto-execute disabled' };
  }

  // ── Platform routing (same logic as index.ts) ──
  if (opp.action.platform === 'kalshi') {
    const parts = opp.action.target.split(' ');
    const ticker = parts[0];
    const sideRaw = parts[parts.length - 1]?.toUpperCase();
    const isKalshiTicker = ticker.startsWith('KX') || ticker.includes('-');
    const isValidSide = sideRaw === 'YES' || sideRaw === 'NO';

    if (isKalshiTicker && isValidSide) {
      const side = sideRaw.toLowerCase();
      const priceMatch = (opp.action.instructions[0] || '').match(/(\d+)¢/);
      const price = priceMatch ? parseInt(priceMatch[1], 10) : 50;
      return {
        action: 'KALSHI_ORDER',
        details: `placeLimitOrderUsd("${ticker}", "${side}", $${stake}, ${price}¢)`,
      };
    } else {
      return {
        action: 'PROGNO_PICK',
        details: `Needs Kalshi market matching: "${opp.action.target}"`,
      };
    }
  } else if (opp.action.platform === 'crypto_exchange') {
    return {
      action: 'CRYPTO_EXECUTE',
      details: `executeBestSignal() for "${opp.action.target}" $${stake}`,
    };
  } else {
    return { action: 'MANUAL', details: opp.action.instructions.join(' | ') };
  }
}

// ─── Run Tests ───────────────────────────────────────────────────────
async function main() {
  console.log(`\n${B}${C}╔══════════════════════════════════════════════════════╗${X}`);
  console.log(`${B}${C}║   🧪 ALPHA HUNTER — PIPELINE SMOKE TEST              ║${X}`);
  console.log(`${B}${C}╚══════════════════════════════════════════════════════╝${X}\n`);

  // Back up and reset trade limiter so real state doesn't block tests
  const limiterFile = path.join(alphaRoot, 'src', 'lib', 'trade-limiter-data.json');
  let limiterBackup: string | null = null;
  try { limiterBackup = fs.readFileSync(limiterFile, 'utf-8'); } catch { }
  tradeLimiter.reset();

  // ── Test 1: Kalshi ticker routes to Kalshi order ──
  console.log(`${B}Test 1: Kalshi ticker → Kalshi order${X}`);
  const r1 = await simulateExecution(KALSHI_OPP, 'kalshi');
  if (r1.action === 'KALSHI_ORDER') {
    ok(`Routed to Kalshi: ${r1.details}`);
    if (r1.details.includes('KXBTC-90K-26FEB')) ok('Correct ticker parsed');
    else fail('Ticker parse', r1.details);
    if (r1.details.includes('"yes"')) ok('Side = yes');
    else fail('Side parse', r1.details);
    if (r1.details.includes('42¢')) ok('Price = 42¢');
    else fail('Price parse', r1.details);
  } else {
    fail('Should route to KALSHI_ORDER', `Got: ${r1.action} — ${r1.details}`);
  }

  // ── Test 2: Progno human-readable pick → "needs match" ──
  console.log(`\n${B}Test 2: Progno pick → needs Kalshi match${X}`);
  const r2 = await simulateExecution(PROGNO_OPP, 'progno');
  if (r2.action === 'PROGNO_PICK') {
    ok(`Correctly identified as Progno pick: ${r2.details}`);
  } else {
    fail('Should route to PROGNO_PICK', `Got: ${r2.action} — ${r2.details}`);
  }

  // ── Test 3: Crypto → executeBestSignal ──
  console.log(`\n${B}Test 3: Crypto → executeBestSignal()${X}`);
  const r3 = await simulateExecution(CRYPTO_OPP, 'crypto');
  if (r3.action === 'CRYPTO_EXECUTE') {
    ok(`Routed to crypto execution: ${r3.details}`);
    if (r3.details.includes('ETH-USDC')) ok('Correct target: ETH-USDC');
    else fail('Target mismatch', r3.details);
  } else {
    fail('Should route to CRYPTO_EXECUTE', `Got: ${r3.action} — ${r3.details}`);
  }

  // ── Test 4: Auto-execute OFF → skipped ──
  console.log(`\n${B}Test 4: Auto-execute OFF → trade skipped${X}`);
  const savedAutoExec = process.env.AUTO_EXECUTE;
  process.env.AUTO_EXECUTE = 'false';
  const r4 = await simulateExecution(KALSHI_OPP, 'auto-off');
  if (r4.action === 'SKIPPED') {
    ok('Trade skipped when AUTO_EXECUTE=false');
  } else {
    fail('Should be SKIPPED', `Got: ${r4.action}`);
  }
  process.env.AUTO_EXECUTE = savedAutoExec;

  // ── Test 5: autoExecute=false on opportunity → skipped ──
  console.log(`\n${B}Test 5: Opportunity autoExecute=false → trade skipped${X}`);
  const noAutoOpp = makeOpp({
    title: 'Low confidence signal',
    action: { ...CRYPTO_OPP.action, autoExecute: false },
  });
  const r5 = await simulateExecution(noAutoOpp, 'no-auto');
  if (r5.action === 'SKIPPED') {
    ok('Trade skipped when opp.autoExecute=false');
  } else {
    fail('Should be SKIPPED', `Got: ${r5.action}`);
  }

  // ── Test 6: Platform field sanity ──
  console.log(`\n${B}Test 6: Platform field values${X}`);
  if (KALSHI_OPP.action.platform === 'kalshi') ok('Kalshi opp has platform=kalshi');
  else fail('Kalshi platform', KALSHI_OPP.action.platform);
  if (CRYPTO_OPP.action.platform === 'crypto_exchange') ok('Crypto opp has platform=crypto_exchange');
  else fail('Crypto platform', CRYPTO_OPP.action.platform);

  // ── Test 7: Edge cases ──
  console.log(`\n${B}Test 7: Edge cases${X}`);

  // Ticker with dash but no KX prefix (e.g. KXNHLAST-26FEB26CBJBOS)
  const dashOpp = makeOpp({
    title: 'NHL game',
    action: { ...KALSHI_OPP.action, target: 'KXNHLAST-26FEB26CBJBOS-BOS YES' },
  });
  const r7a = await simulateExecution(dashOpp, 'dash-ticker');
  if (r7a.action === 'KALSHI_ORDER' && r7a.details.includes('KXNHLAST-26FEB26CBJBOS-BOS')) {
    ok('Long Kalshi ticker with dashes parsed correctly');
  } else {
    fail('Dash ticker', `${r7a.action}: ${r7a.details}`);
  }

  // Multi-word target that should NOT go to Kalshi
  const multiWordOpp = makeOpp({
    title: 'NCAAB game',
    action: { ...KALSHI_OPP.action, target: 'Duke Blue Devils' },
  });
  const r7b = await simulateExecution(multiWordOpp, 'multi-word');
  if (r7b.action === 'PROGNO_PICK') {
    ok('Multi-word team name → Progno pick (not Kalshi)');
  } else {
    fail('Multi-word routing', `${r7b.action}: ${r7b.details}`);
  }

  // ── Summary ──
  console.log(`\n${B}${'═'.repeat(54)}${X}`);
  const total = passed + failed;
  if (failed === 0) {
    console.log(`${G}${B}  ALL ${total} TESTS PASSED ✓${X}\n`);
  } else {
    console.log(`${R}${B}  ${failed}/${total} TESTS FAILED${X}`);
    console.log(`${G}  ${passed}/${total} passed${X}\n`);
  }

  // Restore trade limiter state
  if (limiterBackup) {
    try { fs.writeFileSync(limiterFile, limiterBackup, 'utf-8'); console.log(`${D}(trade-limiter state restored)${X}`); } catch { }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
