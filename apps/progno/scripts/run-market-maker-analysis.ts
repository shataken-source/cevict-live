/**
 * Run market-maker analysis and print the output it suggests.
 * Requires Progno dev server: npm run dev (port 3008)
 *
 * Usage: npx tsx scripts/run-market-maker-analysis.ts
 *        npx tsx scripts/run-market-maker-analysis.ts --limit=20
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const BASE = process.env.PROGNO_BASE_URL || 'http://localhost:3008';
const limit = process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || '15';

async function main() {
  const url = `${BASE.replace(/\/$/, '')}/api/markets/market-makers?limit=${limit}`;
  console.log('\n📡 Market Maker Analysis');
  console.log(`   URL: ${url}\n`);

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      console.error('   ❌ API error:', data?.message || res.statusText);
      process.exit(1);
    }

    if (!data.success) {
      console.error('   ❌', data.message || data.error);
      process.exit(1);
    }

    const analyses = data.analyses || [];
    const duration = data.duration || '?';

    console.log(`   Duration: ${duration}  |  Markets: ${analyses.length}\n`);
    console.log('═'.repeat(72));
    console.log('  SUGGESTIONS (trade / wait / avoid)');
    console.log('═'.repeat(72));

    if (analyses.length === 0) {
      console.log('\n   No markets analyzed (Kalshi/Polymarket may need API keys in .env.local).');
      console.log('   Example of what the API suggests when markets exist:');
      console.log('   ────────────────────────────────────────────────────────────────');
      console.log('   [kalshi] Will Team X beat Team Y?');
      console.log('     → TRADE | Entry: limit @ 55¢');
      console.log('     High liquidity and tight spread - good execution conditions');
      console.log('     Liquidity: high  |  MM: high (Tight bid-ask spread, Deep order book)');
      console.log('   ────────────────────────────────────────────────────────────────');
      console.log('   Summary: N trade, N wait, N avoid\n');
      return;
    }

    for (let i = 0; i < analyses.length; i++) {
      const a = analyses[i];
      const rec = a.tradingRecommendation || {};
      const action = (rec.action || 'wait').toUpperCase();
      const reason = rec.reason || '';
      const liquidity = a.liquidity?.level || '?';
      const mm = a.marketMakerActivity;
      const mmStr = mm?.detected ? `MM: ${mm.confidence} (${(mm.indicators || []).join(', ')})` : 'MM: none';
      const opt = rec.optimalEntry ? ` | Entry: ${rec.optimalEntry}` : '';
      const price = rec.suggestedLimitPrice != null ? ` @ ${rec.suggestedLimitPrice}¢` : '';

      const title = (a.question || a.marketId || '').slice(0, 56);
      console.log(`\n  ${i + 1}. [${a.platform}] ${title}`);
      console.log(`     → ${action}${opt}${price}`);
      console.log(`     ${reason}`);
      console.log(`     Liquidity: ${liquidity}  |  ${mmStr}`);
    }

    console.log('\n' + '═'.repeat(72));
    const trade = analyses.filter((a: any) => (a.tradingRecommendation?.action || '') === 'trade').length;
    const wait = analyses.filter((a: any) => (a.tradingRecommendation?.action || '') === 'wait').length;
    const avoid = analyses.filter((a: any) => (a.tradingRecommendation?.action || '') === 'avoid').length;
    console.log(`  Summary: ${trade} trade, ${wait} wait, ${avoid} avoid\n`);
  } catch (err: any) {
    console.error('   ❌', err.message || err);
    console.log('\n   Tip: Start Progno first: cd apps/progno && npm run dev\n');
    process.exit(1);
  }
}

main();
