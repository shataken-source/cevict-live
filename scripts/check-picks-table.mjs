// Investigate empty picks table: check schema, RLS, and try a test insert
import fs from 'fs';

const VAULT_PATH = 'C:\\Cevict_Vault\\env-store.json';
let secrets = {};
try { secrets = JSON.parse(fs.readFileSync(VAULT_PATH, 'utf8')).secrets || {}; } catch { process.exit(1); }

const SB_URL = secrets.NEXT_PUBLIC_SUPABASE_URL || secrets.SUPABASE_URL;
const SB_KEY = secrets.SUPABASE_SERVICE_ROLE_KEY || secrets.SUPABASE_SERVICE_KEY;
const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

console.log('\n========== PICKS TABLE INVESTIGATION ==========\n');

// 1. Check table exists and columns
console.log('--- TABLE INFO (via RPC or introspection) ---');
try {
  // Use Supabase's PostgREST schema introspection
  const url = `${SB_URL}/rest/v1/picks?select=*&limit=0`;
  const r = await fetch(url, { headers: { ...sbHeaders, Prefer: 'count=exact' } });
  console.log(`  HTTP ${r.status}`);
  console.log(`  Content-Range: ${r.headers.get('content-range')}`);
  console.log(`  Content-Type: ${r.headers.get('content-type')}`);
  
  // Check if there's a definition header
  const body = await r.text();
  console.log(`  Body: ${body.substring(0, 200)}`);
} catch (e) { console.error('  ERROR:', e.message); }

// 2. Try raw SQL via Supabase RPC (if rpc function exists)
console.log('\n--- CHECK TABLE ROW COUNT VIA RPC ---');
try {
  const url = `${SB_URL}/rest/v1/rpc/`;
  // Try a simple count query
  const countUrl = `${SB_URL}/rest/v1/picks?select=count`;
  const r = await fetch(countUrl, { headers: { ...sbHeaders, Prefer: 'count=exact' } });
  const range = r.headers.get('content-range');
  console.log(`  Exact count via Prefer header: ${range}`);
} catch (e) { console.error('  ERROR:', e.message); }

// 3. Check if picks table has RLS enabled and what policies exist
console.log('\n--- CHECK RLS POLICIES ---');
try {
  // Query pg_policies via Supabase
  const url = `${SB_URL}/rest/v1/rpc/get_policies`;
  const r = await fetch(url, { method: 'POST', headers: sbHeaders, body: '{}' });
  if (r.ok) {
    const policies = await r.json();
    console.log(`  Policies:`, JSON.stringify(policies).substring(0, 500));
  } else {
    console.log(`  RPC get_policies not available (${r.status})`);
  }
} catch (e) { console.log(`  Cannot check RLS: ${e.message}`); }

// 4. Check if data was recently deleted (look at related tables)
console.log('\n--- CHECK RELATED TABLES ---');

// Check picks_archive or similar
for (const table of ['picks_archive', 'picks_backup', 'picks_history', 'daily_picks']) {
  try {
    const url = `${SB_URL}/rest/v1/${table}?select=id&limit=1`;
    const r = await fetch(url, { headers: sbHeaders });
    if (r.ok) {
      const data = await r.json();
      console.log(`  ${table}: exists, ${data.length} rows (sample)`);
    } else {
      // Table doesn't exist - that's fine
    }
  } catch { }
}

// 5. Check if the cron writes picks to a different table name
console.log('\n--- SUPABASE TABLE LIST (common tables) ---');
for (const table of ['picks', 'predictions', 'daily_predictions', 'prediction_daily_summary', 'actual_bets', 'historical_odds', 'trailervegas_pending', 'trailervegas_reports', 'odds_snapshots', 'injury_data', 'sentiment_data', 'news_articles']) {
  try {
    const url = `${SB_URL}/rest/v1/${table}?select=id&limit=1`;
    const r = await fetch(url, { headers: { ...sbHeaders, Prefer: 'count=exact' } });
    const range = r.headers.get('content-range');
    if (r.ok) {
      console.log(`  ✅ ${table}: ${range}`);
    } else {
      const err = await r.text();
      if (err.includes('does not exist') || err.includes('404') || r.status === 404) {
        console.log(`  ❌ ${table}: not found`);
      } else {
        console.log(`  ⚠️ ${table}: ${r.status} ${err.substring(0, 100)}`);
      }
    }
  } catch { }
}

// 6. Check the daily-predictions cron route to see how it writes
console.log('\n--- CRON WRITE BEHAVIOR ---');
console.log('  The daily-predictions cron calls /api/picks/today which inserts into picks table.');
console.log('  The cron then also writes to storage (predictions-YYYY-MM-DD.json).');
console.log('  Storage files exist through Mar 1, but picks table is empty.');
console.log('  This suggests picks were either:');
console.log('    a) Never inserted (picks API inserts failed silently)');
console.log('    b) Deleted (table truncated or recreated)');
console.log('    c) RLS blocking service_role reads (unlikely with service_role key)');

// 7. Try a test insert and read
console.log('\n--- TEST INSERT INTO PICKS ---');
try {
  const testPick = {
    game_date: '2099-01-01',
    game_time: '2099-01-01T00:00:00Z',
    home_team: 'TEST_HOME',
    away_team: 'TEST_AWAY',
    pick: 'TEST_HOME',
    pick_type: 'moneyline',
    confidence: 99,
    league: 'TEST',
    status: 'test',
    game_matchup: 'TEST_AWAY @ TEST_HOME',
  };
  const url = `${SB_URL}/rest/v1/picks`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(testPick),
  });
  if (r.ok) {
    const data = await r.json();
    console.log(`  ✅ INSERT succeeded: id=${data[0]?.id}`);
    
    // Now read it back
    const readUrl = `${SB_URL}/rest/v1/picks?game_date=eq.2099-01-01&select=id,game_date,home_team`;
    const r2 = await fetch(readUrl, { headers: sbHeaders });
    const rows = await r2.json();
    console.log(`  ✅ READ back: ${rows.length} rows`);
    
    // Delete test row
    if (data[0]?.id) {
      const delUrl = `${SB_URL}/rest/v1/picks?id=eq.${data[0].id}`;
      await fetch(delUrl, { method: 'DELETE', headers: sbHeaders });
      console.log(`  ✅ CLEANED UP test row`);
    }
  } else {
    const err = await r.text();
    console.log(`  ❌ INSERT failed (${r.status}): ${err.substring(0, 300)}`);
  }
} catch (e) { console.error('  ERROR:', e.message); }

console.log('\n========== INVESTIGATION COMPLETE ==========\n');
