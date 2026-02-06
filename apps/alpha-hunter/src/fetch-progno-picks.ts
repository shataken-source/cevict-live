/**
 * Fetch and summarize today's Progno picks.
 * Use PROGNO_BASE_URL for Progno (default http://localhost:3008 when running Progno locally).
 * Run: npm run progno-picks
 */

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const PROGNO_BASE = process.env.PROGNO_BASE_URL || 'http://localhost:3008';
const BOT_API_KEY = process.env.BOT_API_KEY;

async function main() {
  console.log('\n📡 Fetching Progno picks from:', PROGNO_BASE);
  console.log('   Endpoint: /api/picks/today\n');

  try {
    const res = await fetch(`${PROGNO_BASE}/api/picks/today`, {
      headers: BOT_API_KEY ? { 'x-api-key': BOT_API_KEY } : {},
    });
    const text = await res.text();
    if (!res.ok) {
      console.error('❌ HTTP', res.status, text.slice(0, 300));
      process.exit(1);
    }
    const data = JSON.parse(text) as { message?: string; picks?: unknown[]; hint?: string };
    const picks = data.picks || [];
    const msg = data.message || (picks.length ? `${picks.length} picks` : 'No picks');
    console.log('✅', msg);
    if (data.hint) console.log('   Hint:', data.hint);
    console.log('   Total picks:', picks.length, '\n');

    if (picks.length === 0) {
      console.log('   No games today or Odds API quota/region issue. See apps/progno/docs/ODDS_API_SETUP.md\n');
      return;
    }

    const bySport = new Map<string, number>();
    const byPickType = new Map<string, number>();
    let valueCount = 0;
    for (const p of picks as Array<{ sport?: string; pick_type?: string; has_value?: boolean }>) {
      const sport = p.sport || 'Unknown';
      bySport.set(sport, (bySport.get(sport) || 0) + 1);
      const pt = p.pick_type || 'Unknown';
      byPickType.set(pt, (byPickType.get(pt) || 0) + 1);
      if (p.has_value) valueCount++;
    }

    console.log('   By sport:');
    [...bySport.entries()].sort((a, b) => b[1] - a[1]).forEach(([s, n]) => console.log('     ', s, n));
    console.log('\n   By pick type:');
    [...byPickType.entries()].sort((a, b) => b[1] - a[1]).forEach(([t, n]) => console.log('     ', t, n));
    console.log('\n   Value picks (has_value):', valueCount);

    const sample = (picks as Array<{ sport?: string; home_team?: string; away_team?: string; pick?: string; pick_type?: string; confidence?: number }>).slice(0, 5);
    console.log('\n   Sample (first 5):');
    sample.forEach((p, i) => {
      console.log(`     ${i + 1}. ${p.sport} ${p.home_team} vs ${p.away_team} → ${p.pick} (${p.pick_type}) ${p.confidence ?? '-'}%`);
    });
    console.log('\n');
  } catch (e) {
    console.error('❌', (e as Error).message);
    if (PROGNO_BASE.includes('localhost')) {
      console.log('\n   Tip: Start Progno with: cd apps/progno && npm run dev\n');
    }
    process.exit(1);
  }
}

main();
