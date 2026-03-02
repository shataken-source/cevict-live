// Get exact picks table schema and pinpoint NOT NULL violation
import fs from 'fs';

const VAULT_PATH = 'C:\\Cevict_Vault\\env-store.json';
let secrets = {};
try { secrets = JSON.parse(fs.readFileSync(VAULT_PATH, 'utf8')).secrets || {}; } catch { process.exit(1); }

const SB_URL = secrets.NEXT_PUBLIC_SUPABASE_URL || secrets.SUPABASE_URL;
const SB_KEY = secrets.SUPABASE_SERVICE_ROLE_KEY || secrets.SUPABASE_SERVICE_KEY;
const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

// 1. Get full error on insert attempt with all known columns populated
console.log('--- FULL INSERT ERROR ---');
const testPick = {
  game_id: 'test-game-id',
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
  odds: -110,
  commence_time: '2099-01-01T20:00:00Z',
  expected_value: 5.5,
  kelly_fraction: 0.05,
  is_home: true,
  result: null,
};
try {
  const r = await fetch(`${SB_URL}/rest/v1/picks`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(testPick),
  });
  const body = await r.text();
  console.log(`  HTTP ${r.status}: ${body}`);
  if (r.ok) {
    // Clean up
    const data = JSON.parse(body);
    if (data[0]?.id) {
      await fetch(`${SB_URL}/rest/v1/picks?id=eq.${data[0].id}`, { method: 'DELETE', headers: sbHeaders });
      console.log('  Cleaned up test row');
    }
  }
} catch (e) { console.error('  ERROR:', e.message); }

// 2. Get all column names by trying one at a time
console.log('\n--- ALL COLUMNS IN PICKS TABLE ---');
const possibleColumns = [
  'id', 'game_id', 'game_date', 'game_time', 'game_matchup',
  'home_team', 'away_team', 'pick', 'pick_type', 'confidence',
  'odds', 'league', 'sport', 'status', 'result', 'early_lines',
  'commence_time', 'expected_value', 'kelly_fraction', 'is_home',
  'is_favorite_pick', 'is_premium', 'has_value', 'composite_score',
  'claude_effect', 'sentiment_field', 'narrative_momentum',
  'information_asymmetry', 'chaos_sensitivity', 'news_impact',
  'temporal_decay', 'external_pressure', 'mc_win_probability',
  'mc_spread_probability', 'mc_total_probability', 'mc_predicted_score',
  'value_bet_edge', 'value_bet_ev', 'value_bet_kelly',
  'tier', 'source', 'created_at', 'updated_at',
  'actual_score_home', 'actual_score_away', 'home_score', 'away_score',
  'experimental_factors', 'massager_adjustment', 'injury_signal',
  'true_edge', 'line_movement', 'weather_impact', 'betting_splits',
  'arbitrage', 'teaser', 'parlay', 'bankroll_recommendation',
];
const existingCols = [];
for (const col of possibleColumns) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/picks?select=${col}&limit=0`, { headers: sbHeaders });
    if (r.ok) existingCols.push(col);
  } catch { }
}
console.log(`  Found ${existingCols.length} columns: ${existingCols.join(', ')}`);

// 3. Now try inserting with ONLY the existing columns, one null at a time, to find which is NOT NULL
console.log('\n--- FINDING NOT NULL COLUMNS ---');
// Start with a fully populated row, then remove one column at a time
const fullPick = {};
for (const col of existingCols) {
  if (col === 'id' || col === 'created_at' || col === 'updated_at') continue;
  // Set a reasonable default
  switch (col) {
    case 'game_date': fullPick[col] = '2099-01-01'; break;
    case 'game_time': fullPick[col] = '20:00:00'; break;
    case 'game_matchup': fullPick[col] = 'A @ B'; break;
    case 'home_team': fullPick[col] = 'B'; break;
    case 'away_team': fullPick[col] = 'A'; break;
    case 'pick': fullPick[col] = 'B'; break;
    case 'pick_type': fullPick[col] = 'moneyline'; break;
    case 'confidence': fullPick[col] = 99; break;
    case 'odds': fullPick[col] = -110; break;
    case 'league': fullPick[col] = 'TEST'; break;
    case 'sport': fullPick[col] = 'test'; break;
    case 'status': fullPick[col] = 'pending'; break;
    case 'early_lines': fullPick[col] = false; break;
    case 'commence_time': fullPick[col] = '2099-01-01T20:00:00Z'; break;
    case 'is_home': fullPick[col] = true; break;
    case 'source': fullPick[col] = 'test'; break;
    case 'tier': fullPick[col] = 'free'; break;
    default: fullPick[col] = null; break;
  }
}

// Try the full insert first
const r = await fetch(`${SB_URL}/rest/v1/picks`, {
  method: 'POST',
  headers: { ...sbHeaders, Prefer: 'return=representation' },
  body: JSON.stringify(fullPick),
});
const body = await r.text();
console.log(`  Full insert: HTTP ${r.status}`);
if (r.ok) {
  const data = JSON.parse(body);
  console.log('  ✅ Full insert succeeded! Row:');
  console.log('  ', JSON.stringify(data[0], null, 2).substring(0, 1000));
  // Clean up
  if (data[0]?.id) {
    await fetch(`${SB_URL}/rest/v1/picks?id=eq.${data[0].id}`, { method: 'DELETE', headers: sbHeaders });
  }
} else {
  console.log(`  ❌ Full insert failed: ${body.substring(0, 500)}`);
}

// 4. Now settle Kalshi bets
console.log('\n--- SETTLING KALSHI BETS ---');

// MIN@DEN: MIN won 117-108, bet was YES on DEN → LOSS
try {
  const r = await fetch(`${SB_URL}/rest/v1/actual_bets?ticker=eq.KXNBAGAME-26MAR01MINDEN-DEN`, {
    method: 'PATCH',
    headers: { ...sbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify({
      result: 'loss',
      status: 'settled',
      settled_at: new Date().toISOString(),
    }),
  });
  const data = await r.json();
  console.log(`  MIN@DEN: ${r.ok ? '✅ SETTLED (LOSS)' : '❌ Failed'} ${r.ok ? '' : JSON.stringify(data)}`);
} catch (e) { console.error('  ERROR:', e.message); }

// SAS@NYK: NYK won 114-89, bet was YES on NYK → WIN
try {
  const r = await fetch(`${SB_URL}/rest/v1/actual_bets?ticker=eq.KXNBAGAME-26MAR01SASNYK-NYK`, {
    method: 'PATCH',
    headers: { ...sbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify({
      result: 'win',
      status: 'settled',
      settled_at: new Date().toISOString(),
    }),
  });
  const data = await r.json();
  console.log(`  SAS@NYK: ${r.ok ? '✅ SETTLED (WIN)' : '❌ Failed'} ${r.ok ? '' : JSON.stringify(data)}`);
} catch (e) { console.error('  ERROR:', e.message); }

console.log('\n========== DONE ==========\n');
