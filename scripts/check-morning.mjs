// Morning health check — queries Supabase + Odds API to verify cron jobs and picks
import fs from 'fs';
import path from 'path';

// Read vault secrets
const VAULT_PATH = 'C:\\Cevict_Vault\\env-store.json';
let secrets = {};
try {
  const raw = fs.readFileSync(VAULT_PATH, 'utf8');
  secrets = JSON.parse(raw).secrets || {};
} catch (e) {
  console.error('Cannot read vault:', e.message);
  process.exit(1);
}

const SB_URL = secrets.NEXT_PUBLIC_SUPABASE_URL || secrets.SUPABASE_URL;
const SB_KEY = secrets.SUPABASE_SERVICE_ROLE_KEY || secrets.SUPABASE_SERVICE_KEY;
const ODDS_KEY = secrets.ODDS_API_KEY;

if (!SB_URL || !SB_KEY) { console.error('Missing Supabase creds in vault'); process.exit(1); }

const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
const today = new Date().toISOString().split('T')[0]; // 2026-03-02
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

async function sbQuery(table, params) {
  const url = `${SB_URL}/rest/v1/${table}?${params}`;
  const r = await fetch(url, { headers: sbHeaders });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

console.log(`\n========== MORNING HEALTH CHECK (${today}) ==========\n`);

// 1. Picks for today
console.log('--- TODAY PICKS ---');
try {
  const picks = await sbQuery('picks', `game_date=eq.${today}&select=id,game_date,home_team,away_team,pick,pick_type,confidence,league,status,early_lines&order=confidence.desc`);
  console.log(`  ${picks.length} picks for ${today}`);
  if (picks.length > 0) {
    const byLeague = {};
    picks.forEach(p => { byLeague[p.league] = (byLeague[p.league] || 0) + 1; });
    console.log('  By league:', byLeague);
    picks.slice(0, 8).forEach(p => {
      const el = p.early_lines ? ' [EARLY]' : '';
      console.log(`    ${p.away_team} @ ${p.home_team} -> ${p.pick} (${p.pick_type} ${p.confidence}%) [${p.status}]${el}`);
    });
    if (picks.length > 8) console.log(`    ... and ${picks.length - 8} more`);
  }
} catch (e) { console.error('  ERROR:', e.message); }

// 2. Yesterday results
console.log('\n--- YESTERDAY RESULTS ---');
try {
  const picks = await sbQuery('picks', `game_date=eq.${yesterday}&select=id,home_team,away_team,pick,status,result,league&order=league`);
  if (picks.length === 0) {
    console.log(`  No picks for ${yesterday}`);
  } else {
    const wins = picks.filter(p => p.result === 'win' || p.status === 'win').length;
    const losses = picks.filter(p => p.result === 'lose' || p.result === 'loss' || p.status === 'lose').length;
    const pending = picks.filter(p => !p.result && p.status === 'pending').length;
    const graded = wins + losses;
    console.log(`  ${picks.length} total: ${wins}W / ${losses}L / ${pending}P`);
    if (graded > 0) console.log(`  Win rate: ${(wins / graded * 100).toFixed(1)}% (of ${graded} graded)`);
  }
} catch (e) { console.error('  ERROR:', e.message); }

// 3. Recent picks (any date, last 20)
console.log('\n--- RECENT PICKS (last 20, any date) ---');
try {
  const picks = await sbQuery('picks', 'select=game_date,league,status,early_lines,created_at&order=created_at.desc&limit=20');
  if (picks.length === 0) {
    console.log('  No picks in DB at all');
  } else {
    const byDate = {};
    picks.forEach(p => {
      if (!byDate[p.game_date]) byDate[p.game_date] = { regular: 0, early: 0 };
      if (p.early_lines) byDate[p.game_date].early++;
      else byDate[p.game_date].regular++;
    });
    for (const [d, c] of Object.entries(byDate)) {
      console.log(`  ${d}: ${c.regular} regular, ${c.early} early`);
    }
    console.log(`  Most recent created_at: ${picks[0].created_at}`);
  }
} catch (e) { console.error('  ERROR:', e.message); }

// 4. Kalshi actual bets
console.log('\n--- KALSHI ACTUAL BETS (last 10) ---');
try {
  const bets = await sbQuery('actual_bets', 'select=id,ticker,side,contracts,stake_cents,result,status,created_at&order=created_at.desc&limit=10');
  if (bets.length === 0) {
    console.log('  No bets');
  } else {
    bets.forEach(b => {
      const stake = b.stake_cents ? (b.stake_cents / 100).toFixed(2) : '?';
      const dt = b.created_at ? b.created_at.substring(0, 10) : '?';
      console.log(`  ${dt} ${b.ticker} ${b.side} $${stake} [${b.status}] result=${b.result || 'pending'}`);
    });
  }
} catch (e) { console.error('  ERROR:', e.message); }

// 5. Prediction files in storage
console.log('\n--- PREDICTION FILES (storage) ---');
try {
  const url = `${SB_URL}/storage/v1/object/list/predictions`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { ...sbHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: '', limit: 15, offset: 0, sortBy: { column: 'created_at', order: 'desc' } }),
  });
  const files = await r.json();
  if (Array.isArray(files) && files.length > 0) {
    files.forEach(f => {
      const size = f.metadata?.size ? (f.metadata.size / 1024).toFixed(1) + 'KB' : '?';
      console.log(`  ${f.name}  ${size}  ${(f.created_at || '').substring(0, 19)}`);
    });
  } else {
    console.log('  No files');
  }
} catch (e) { console.error('  ERROR:', e.message); }

// 6. Odds API — check NBA, NHL, NCAAB games available today
console.log('\n--- ODDS API GAME CHECK ---');
if (ODDS_KEY) {
  for (const sport of ['basketball_nba', 'icehockey_nhl', 'basketball_ncaab']) {
    try {
      const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${ODDS_KEY}&regions=us&markets=h2h&oddsFormat=american`;
      const r = await fetch(url);
      if (!r.ok) {
        console.log(`  ${sport}: HTTP ${r.status} ${r.statusText}`);
        if (r.status === 401) console.log('    Key may be expired/invalid!');
        continue;
      }
      const remaining = r.headers.get('x-requests-remaining');
      const used = r.headers.get('x-requests-used');
      const games = await r.json();
      const todayGames = games.filter(g => g.commence_time && g.commence_time.startsWith(today));
      console.log(`  ${sport}: ${games.length} total, ${todayGames.length} today (API: used=${used} remaining=${remaining})`);
      todayGames.slice(0, 5).forEach(g => {
        console.log(`    ${g.away_team} vs ${g.home_team} ${g.commence_time}`);
      });
      if (todayGames.length > 5) console.log(`    ... and ${todayGames.length - 5} more`);
    } catch (e) {
      console.log(`  ${sport}: ERROR ${e.message}`);
    }
  }
} else {
  console.log('  No ODDS_API_KEY in vault');
}

// 7. Check prediction file for today specifically
console.log('\n--- PREDICTION FILE FOR TODAY ---');
try {
  const url = `${SB_URL}/storage/v1/object/predictions/predictions-${today}.json`;
  const r = await fetch(url, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
  if (r.ok) {
    const data = await r.json();
    console.log(`  predictions-${today}.json: ${data.count || data.picks?.length || 0} picks, generated ${data.generatedAt}`);
  } else {
    console.log(`  predictions-${today}.json: NOT FOUND (${r.status})`);
  }
} catch (e) { console.error('  ERROR:', e.message); }

// 8. Check Vercel deployment (if token available)
console.log('\n--- VERCEL DEPLOYMENT ---');
const VERCEL_TOKEN = secrets.VERCEL_TOKEN;
if (VERCEL_TOKEN) {
  try {
    const url = `https://api.vercel.com/v6/deployments?limit=3&projectId=prj_YkBvkVUhZ8bJJAFJ2pYlVOhNVlNP`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } });
    const data = await r.json();
    if (data.deployments) {
      data.deployments.forEach(d => {
        const created = new Date(d.created).toISOString().substring(0, 19);
        console.log(`  ${created} state=${d.state} ready=${d.readyState} url=${d.url}`);
      });
    }
  } catch (e) { console.error('  ERROR:', e.message); }
} else {
  console.log('  No VERCEL_TOKEN in vault — skipping');
}

console.log('\n========== CHECK COMPLETE ==========\n');
