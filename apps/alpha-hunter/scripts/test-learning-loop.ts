/**
 * Test Kalshi Learning Loop (session implementation)
 * Run from alpha-hunter: npx tsx scripts/test-learning-loop.ts
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Can hang if Supabase is unreachable; run with env set in apps/alpha-hunter.
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import {
  getAllKalshiCalibrations,
  getRecentKalshiTrades,
  getKalshiCalibration,
  getCalibrationAdjustment,
} from '../src/services/kalshi/learning-loop';

async function main() {
  console.log('Testing Kalshi Learning Loop...\n');

  let passed = 0;
  let failed = 0;

  try {
    const calibrations = await getAllKalshiCalibrations();
    const ok = Array.isArray(calibrations);
    console.log('  getAllKalshiCalibrations():', ok ? `OK (${calibrations.length} categories)` : 'FAIL');
    if (ok) passed++; else failed++;
  } catch (e: unknown) {
    console.log('  getAllKalshiCalibrations(): FAIL', (e as Error).message);
    failed++;
  }

  try {
    const trades = await getRecentKalshiTrades(undefined, 10);
    const ok = Array.isArray(trades);
    console.log('  getRecentKalshiTrades():', ok ? `OK (${trades.length} trades)` : 'FAIL');
    if (ok) passed++; else failed++;
  } catch (e: unknown) {
    console.log('  getRecentKalshiTrades(): FAIL', (e as Error).message);
    failed++;
  }

  try {
    const cal = await getKalshiCalibration('sports');
    const ok = cal === null || (typeof cal === 'object' && cal !== null && 'category' in cal);
    console.log('  getKalshiCalibration("sports"):', ok ? 'OK' : 'FAIL');
    if (ok) passed++; else failed++;
  } catch (e: unknown) {
    console.log('  getKalshiCalibration(): FAIL', (e as Error).message);
    failed++;
  }

  try {
    const adj = await getCalibrationAdjustment('sports', 55);
    const ok = typeof adj === 'number';
    console.log('  getCalibrationAdjustment("sports", 55):', ok ? `OK (${adj})` : 'FAIL');
    if (ok) passed++; else failed++;
  } catch (e: unknown) {
    console.log('  getCalibrationAdjustment(): FAIL (RPC may be missing)', (e as Error).message);
    failed++;
  }

  console.log('\n' + (failed === 0 ? 'All learning-loop tests passed.' : `${passed} passed, ${failed} failed.`));
  process.exit(failed > 0 ? 1 : 0);
}

main();
