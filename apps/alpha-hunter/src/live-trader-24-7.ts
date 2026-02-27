/**
 * Live Trader 24/7
 * Runs the TradingBot in a persistent loop with auto-restart on crash.
 * Exponential backoff on consecutive failures, resets on clean exit.
 *
 * Usage: npx tsx src/live-trader-24-7.ts
 */

import { TradingBot } from './index';

let running = true;
const BASE_DELAY = 10_000;   // 10 seconds
const MAX_DELAY = 300_000;   // 5 minutes
let consecutiveCrashes = 0;

async function run(): Promise<void> {
  while (running) {
    const bot = new TradingBot();
    try {
      console.log(`[LIVE] ${new Date().toISOString()} Starting bot (crashes=${consecutiveCrashes})`);
      await bot.start();
      console.log('[LIVE] Bot exited cleanly');
      consecutiveCrashes = 0;
    } catch (e: unknown) {
      consecutiveCrashes++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[LIVE] Bot crashed (#${consecutiveCrashes}): ${msg}`);
    }
    if (!running) break;
    const delay = Math.min(MAX_DELAY, BASE_DELAY * Math.pow(2, Math.min(consecutiveCrashes - 1, 5)));
    console.log(`[LIVE] Restarting in ${(delay / 1000).toFixed(0)}s...`);
    await sleep(delay);
  }
  console.log('[LIVE] Shutting down.');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

process.on('SIGINT', () => { running = false; });
process.on('SIGTERM', () => { running = false; });

run().catch(err => {
  console.error('[LIVE] FATAL:', err);
  process.exit(1);
});
