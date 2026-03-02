// Part 4: Deep check — picks table schema, Coinbase, deploy status
import fs from 'fs';

const VAULT_PATH = 'C:\\Cevict_Vault\\env-store.json';
let secrets = {};
try { secrets = JSON.parse(fs.readFileSync(VAULT_PATH, 'utf8')).secrets || {}; } catch { process.exit(1); }

const SB_URL = secrets.NEXT_PUBLIC_SUPABASE_URL || secrets.SUPABASE_URL;
const SB_KEY = secrets.SUPABASE_SERVICE_ROLE_KEY || secrets.SUPABASE_SERVICE_KEY;
const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

const today = '2026-03-02';

// 1. Check if picks table exists and has any rows at all
console.log('\n--- PICKS TABLE HEALTH ---');
try {
  const url = `${SB_URL}/rest/v1/picks?select=id,game_date,created_at&order=created_at.desc&limit=5`;
  const r = await fetch(url, { headers: sbHeaders });
  console.log(`  HTTP ${r.status}`);
  const data = await r.json();
  console.log(`  Total rows returned: ${Array.isArray(data) ? data.length : 'ERROR: ' + JSON.stringify(data).substring(0, 200)}`);
  if (Array.isArray(data) && data.length > 0) {
    data.forEach(d => console.log(`    id=${d.id} date=${d.game_date} created=${d.created_at}`));
  }
} catch (e) { console.error('  ERROR:', e.message); }

// 2. Check picks count with no filters
console.log('\n--- PICKS COUNT (no filter) ---');
try {
  const url = `${SB_URL}/rest/v1/picks?select=id&limit=1`;
  const r = await fetch(url, { headers: { ...sbHeaders, Prefer: 'count=exact' } });
  const count = r.headers.get('content-range');
  console.log(`  Content-Range: ${count}`);
} catch (e) { console.error('  ERROR:', e.message); }

// 3. Download and inspect predictions-2026-03-01.json from storage
console.log('\n--- PREDICTIONS FILE 2026-03-01 (from storage) ---');
try {
  const url = `${SB_URL}/storage/v1/object/predictions/predictions-2026-03-01.json`;
  const r = await fetch(url, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
  if (r.ok) {
    const data = await r.json();
    console.log(`  count=${data.count} generated=${data.generatedAt} earlyLines=${data.earlyLines}`);
    if (data.picks && data.picks.length > 0) {
      console.log(`  Sample pick: ${data.picks[0].away_team} @ ${data.picks[0].home_team} -> ${data.picks[0].pick} (${data.picks[0].confidence}%)`);
    }
  } else {
    console.log(`  NOT FOUND: ${r.status}`);
  }
} catch (e) { console.error('  ERROR:', e.message); }

// 4. Download results-2026-03-01.json
console.log('\n--- RESULTS FILE 2026-03-01 ---');
try {
  const url = `${SB_URL}/storage/v1/object/predictions/results-2026-03-01.json`;
  const r = await fetch(url, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
  if (r.ok) {
    const data = await r.json();
    console.log(`  date=${data.date} total=${data.summary?.total} correct=${data.summary?.correct} wrong=${data.summary?.wrong} pending=${data.summary?.pending} winRate=${data.summary?.winRate}%`);
  } else {
    console.log(`  NOT FOUND: ${r.status}`);
  }
} catch (e) { console.error('  ERROR:', e.message); }

// 5. Check if yesterday's Kalshi bets (Mar 1) games are settled
console.log('\n--- MAR 1 KALSHI BET STATUS ---');
const mar1Tickers = ['KXNBAGAME-26MAR01MINDEN-DEN', 'KXNBAGAME-26MAR01SASNYK-NYK'];
for (const ticker of mar1Tickers) {
  try {
    const url = `${SB_URL}/rest/v1/actual_bets?ticker=eq.${ticker}&select=id,ticker,side,stake_cents,result,status,settled_at`;
    const r = await fetch(url, { headers: sbHeaders });
    const rows = await r.json();
    if (rows.length > 0) {
      const b = rows[0];
      console.log(`  ${b.ticker}: side=${b.side} stake=$${(b.stake_cents/100).toFixed(2)} result=${b.result || 'PENDING'} status=${b.status}`);
    }
  } catch (e) { console.error(`  ${ticker}: ERROR`, e.message); }
}

// 6. Check prediction_daily_summary table
console.log('\n--- PREDICTION DAILY SUMMARY ---');
try {
  const url = `${SB_URL}/rest/v1/prediction_daily_summary?select=*&order=date.desc&limit=5`;
  const r = await fetch(url, { headers: sbHeaders });
  if (r.ok) {
    const data = await r.json();
    if (data.length > 0) {
      data.forEach(s => console.log(`  ${s.date}: ${s.total}T ${s.correct}W ${s.wrong}L ${s.pending}P wr=${s.win_rate}%`));
    } else {
      console.log('  No summaries (table may not exist or empty)');
    }
  } else {
    const err = await r.text();
    console.log(`  HTTP ${r.status}: ${err.substring(0, 200)}`);
  }
} catch (e) { console.error('  ERROR:', e.message); }

// 7. Check historical_odds table (recent entries)
console.log('\n--- HISTORICAL ODDS (recent) ---');
try {
  const url = `${SB_URL}/rest/v1/historical_odds?select=id,sport_key,home_team,away_team,commence_time&order=created_at.desc&limit=5`;
  const r = await fetch(url, { headers: sbHeaders });
  if (r.ok) {
    const data = await r.json();
    if (data.length > 0) {
      data.forEach(o => console.log(`  ${o.sport_key}: ${o.away_team} @ ${o.home_team} ${o.commence_time}`));
    } else {
      console.log('  No historical odds');
    }
  } else {
    const err = await r.text();
    console.log(`  HTTP ${r.status}: ${err.substring(0, 200)}`);
  }
} catch (e) { console.error('  ERROR:', e.message); }

// 8. Check Coinbase keys exist
console.log('\n--- COINBASE CONFIG ---');
const cbKey = secrets.COINBASE_API_KEY;
const cbSecret = secrets.COINBASE_API_SECRET;
console.log(`  COINBASE_API_KEY: ${cbKey ? `set (${cbKey.length} chars)` : 'MISSING'}`);
console.log(`  COINBASE_API_SECRET: ${cbSecret ? `set (${cbSecret.substring(0, 20)}...)` : 'MISSING'}`);

// 9. Check alpha-hunter env manifest
console.log('\n--- ALPHA-HUNTER ENV MANIFEST ---');
try {
  const manifest = JSON.parse(fs.readFileSync('C:\\cevict-live\\apps\\alpha-hunter\\env.manifest.json', 'utf8'));
  const vars = manifest.outputs?.[0]?.vars || {};
  const keys = Object.keys(vars);
  console.log(`  ${keys.length} env vars configured: ${keys.join(', ')}`);
} catch (e) { console.log(`  Cannot read manifest: ${e.message}`); }

console.log('\n========== PART 4 COMPLETE ==========\n');
