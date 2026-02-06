/**
 * Fetch game results via results-apis (ESPN first, then other providers).
 * Usage: npx tsx scripts/fetch-espn-results.ts [YYYY-MM-DD]
 * Default date: yesterday.
 */

import { fetchAllLeaguesResultsForDate, PROGNO_LEAGUES } from '../lib/data-sources/results-apis';

function yesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const date = process.argv[2] ?? yesterday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error('Usage: npx tsx scripts/fetch-espn-results.ts [YYYY-MM-DD]');
    process.exit(1);
  }

  console.log(`Fetching results for ${date} (all providers, ESPN first)...\n`);
  const byLeague = await fetchAllLeaguesResultsForDate(date);

  for (const league of PROGNO_LEAGUES) {
    const games = byLeague[league] ?? [];
    console.log(`${league}: ${games.length} games`);
    games.slice(0, 3).forEach((g) => {
      console.log(`  ${g.awayTeam} @ ${g.homeTeam}: ${g.awayScore}-${g.homeScore} (winner: ${g.winner})`);
    });
    if (games.length > 3) console.log(`  ... and ${games.length - 3} more`);
    console.log('');
  }

  const total = Object.values(byLeague).reduce((s, arr) => s + arr.length, 0);
  console.log(`Total: ${total} games across all leagues`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
