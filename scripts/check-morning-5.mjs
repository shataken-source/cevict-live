// Part 5: Check predictions table, settle Kalshi, investigate picks table schema
import fs from 'fs';

const VAULT_PATH = 'C:\\Cevict_Vault\\env-store.json';
let secrets = {};
try { secrets = JSON.parse(fs.readFileSync(VAULT_PATH, 'utf8')).secrets || {}; } catch { process.exit(1); }

const SB_URL = secrets.NEXT_PUBLIC_SUPABASE_URL || secrets.SUPABASE_URL;
const SB_KEY = secrets.SUPABASE_SERVICE_ROLE_KEY || secrets.SUPABASE_SERVICE_KEY;
const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

// 1. Check predictions table (352 rows)
console.log('\n--- PREDICTIONS TABLE (recent 10) ---');
try {
  const url = `${SB_URL}/rest/v1/predictions?select=id,game_date,home_team,away_team,pick,confidence,league,created_at&order=created_at.desc&limit=10`;
  const r = await fetch(url, { headers: sbHeaders });
  if (r.ok) {
    const data = await r.json();
    data.forEach(p => console.log(`  ${p.game_date} ${p.league} ${p.away_team} @ ${p.home_team} -> ${p.pick} (${p.confidence}%) created=${(p.created_at||'').substring(0,19)}`));
  } else {
    const err = await r.text();
    console.log(`  HTTP ${r.status}: ${err.substring(0, 200)}`);
  }
} catch (e) { console.error('  ERROR:', e.message); }

// 2. Check picks table schema by attempting OPTIONS or reading error on bad column
console.log('\n--- PICKS TABLE COLUMN CHECK ---');
try {
  // Try selecting known columns to see which exist
  for (const col of ['id', 'game_date', 'home_team', 'away_team', 'pick', 'confidence', 'league', 'status', 'result', 'early_lines', 'game_time', 'game_matchup', 'commence_time', 'odds', 'sport', 'pick_type', 'created_at']) {
    const url = `${SB_URL}/rest/v1/picks?select=${col}&limit=0`;
    const r = await fetch(url, { headers: sbHeaders });
    if (r.ok) {
      process.stdout.write(`  ✅ ${col}  `);
    } else {
      process.stdout.write(`  ❌ ${col}  `);
    }
  }
  console.log('');
} catch (e) { console.error('  ERROR:', e.message); }

// 3. Check if picks table has the unique constraint the upsert needs
console.log('\n--- TEST UPSERT INTO PICKS ---');
try {
  const testPick = {
    game_date: '2099-01-01',
    game_matchup: 'TEST_AWAY @ TEST_HOME',
    home_team: 'TEST_HOME',
    away_team: 'TEST_AWAY',
    pick: 'TEST_HOME',
    pick_type: 'moneyline',
    confidence: 99,
    league: 'TEST',
    sport: 'test',
    status: 'pending',
    early_lines: false,
  };
  const url = `${SB_URL}/rest/v1/picks`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(testPick),
  });
  const body = await r.text();
  if (r.ok) {
    const data = JSON.parse(body);
    console.log(`  ✅ INSERT succeeded: id=${data[0]?.id}`);
    // Try upsert
    const r2 = await fetch(url, {
      method: 'POST',
      headers: { ...sbHeaders, Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify({ ...testPick, confidence: 88 }),
    });
    const body2 = await r2.text();
    if (r2.ok) {
      console.log(`  ✅ UPSERT succeeded`);
    } else {
      console.log(`  ❌ UPSERT failed: ${body2.substring(0, 200)}`);
    }
    // Clean up
    const delUrl = `${SB_URL}/rest/v1/picks?game_date=eq.2099-01-01`;
    await fetch(delUrl, { method: 'DELETE', headers: sbHeaders });
    console.log(`  ✅ Cleaned up test row`);
  } else {
    console.log(`  ❌ INSERT failed (${r.status}): ${body.substring(0, 300)}`);
  }
} catch (e) { console.error('  ERROR:', e.message); }

// 4. Check if the picks upsert conflict key exists
console.log('\n--- CHECK UPSERT CONFLICT KEYS ---');
try {
  // The cron uses: onConflict: 'game_date,home_team,away_team,early_lines'
  // Let's see if there's a unique index on those columns by inserting a duplicate
  const pick1 = {
    game_date: '2099-01-02',
    game_matchup: 'A @ B',
    home_team: 'B',
    away_team: 'A',
    pick: 'B',
    pick_type: 'moneyline',
    confidence: 90,
    league: 'TEST',
    sport: 'test',
    status: 'pending',
    early_lines: false,
  };
  const url = `${SB_URL}/rest/v1/picks`;
  const r1 = await fetch(url, { method: 'POST', headers: { ...sbHeaders, Prefer: 'return=representation' }, body: JSON.stringify(pick1) });
  if (!r1.ok) {
    console.log(`  Insert 1 failed: ${(await r1.text()).substring(0, 200)}`);
  } else {
    console.log('  Insert 1: OK');
    // Try duplicate
    const r2 = await fetch(url, { method: 'POST', headers: sbHeaders, body: JSON.stringify(pick1) });
    if (r2.ok) {
      console.log('  Insert 2 (duplicate): OK — NO unique constraint on (game_date,home_team,away_team,early_lines)');
    } else {
      const err = await r2.text();
      if (err.includes('duplicate') || err.includes('unique') || err.includes('23505')) {
        console.log('  Insert 2 (duplicate): Blocked — unique constraint EXISTS ✅');
      } else {
        console.log(`  Insert 2: Failed for other reason: ${err.substring(0, 200)}`);
      }
    }
    // Clean up
    await fetch(`${SB_URL}/rest/v1/picks?game_date=eq.2099-01-02`, { method: 'DELETE', headers: sbHeaders });
    console.log('  Cleaned up');
  }
} catch (e) { console.error('  ERROR:', e.message); }

// 5. Settle Kalshi bets
console.log('\n--- SETTLE KALSHI BETS ---');
// Check NBA scores for Mar 1 games
try {
  // MIN vs DEN and SAS vs NYK - check actual scores
  const ODDS_KEY = secrets.ODDS_API_KEY;
  if (ODDS_KEY) {
    const scoresUrl = `https://api.the-odds-api.com/v4/sports/basketball_nba/scores/?apiKey=${ODDS_KEY}&daysFrom=2`;
    const r = await fetch(scoresUrl);
    if (r.ok) {
      const scores = await r.json();
      const mar1Games = scores.filter(g => g.commence_time && g.commence_time.startsWith('2026-03-0'));
      console.log(`  NBA scores (recent): ${scores.length} total, ${mar1Games.length} from Mar 1-2`);
      mar1Games.forEach(g => {
        const completed = g.completed ? '✅ FINAL' : '⏳ In Progress';
        const scoreStr = g.scores ? g.scores.map(s => `${s.name}: ${s.score}`).join(', ') : 'no scores';
        console.log(`    ${g.away_team} @ ${g.home_team} — ${completed} — ${scoreStr}`);
      });
    } else {
      console.log(`  Scores API: HTTP ${r.status}`);
    }
  }
} catch (e) { console.error('  ERROR:', e.message); }

console.log('\n========== PART 5 COMPLETE ==========\n');
