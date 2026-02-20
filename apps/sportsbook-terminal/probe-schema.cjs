/**
 * Probe syndicated_picks schema and apply missing columns via Supabase Management API
 */
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rdbuwyefbgnbuhmjrizo.supabase.co';
const PROJECT_REF  = 'rdbuwyefbgnbuhmjrizo';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkYnV3eWVmYmduYnVobWpyaXpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyOTg3OSwiZXhwIjoyMDc5MjA1ODc5fQ.JQBc_tHs2rZ9seyy8SygTzroB2ZVZo5JfrC8nriXo6I';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// All columns the code tries to insert
const REQUIRED_COLUMNS = [
  { name: 'batch_id',           type: 'text' },
  { name: 'tier',               type: 'text' },
  { name: 'pick_index',         type: 'integer' },
  { name: 'source_file',        type: 'text' },
  { name: 'game_id',            type: 'text' },
  { name: 'sport',              type: 'text' },
  { name: 'home_team',          type: 'text' },
  { name: 'away_team',          type: 'text' },
  { name: 'game_time',          type: 'timestamptz' },
  { name: 'pick_type',          type: 'text' },
  { name: 'pick_selection',     type: 'text' },
  { name: 'confidence',         type: 'numeric' },
  { name: 'odds',               type: 'numeric' },
  { name: 'expected_value',     type: 'numeric' },
  { name: 'edge',               type: 'numeric' },
  { name: 'recommended_line',   type: 'numeric' },
  { name: 'mc_win_probability', type: 'numeric' },
  { name: 'analysis',           type: 'text' },
  { name: 'raw_data',           type: 'jsonb' },
];

// Use Supabase Management API to run SQL
function runSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('=== syndicated_picks Schema Fix ===\n');

  // Step 1: Get existing columns from information_schema
  console.log('1. Querying existing columns...');
  const colResult = await runSQL(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='syndicated_picks' ORDER BY ordinal_position"
  );

  let existingCols = new Set();
  if (colResult.status === 200 && Array.isArray(colResult.body)) {
    existingCols = new Set(colResult.body.map(r => r.column_name));
    console.log('   Existing columns:', [...existingCols].join(', '));
  } else {
    console.log('   Management API response:', colResult.status, JSON.stringify(colResult.body).substring(0, 200));
    console.log('\n   Falling back to test-insert probe...');
  }

  // Step 2: Find missing columns
  const missing = REQUIRED_COLUMNS.filter(c => !existingCols.has(c.name));

  if (existingCols.size > 0 && missing.length === 0) {
    console.log('\n✅ All required columns exist — no migration needed!');
    return;
  }

  if (existingCols.size > 0) {
    console.log(`\n2. Missing columns: ${missing.map(c => c.name).join(', ')}`);
  } else {
    console.log('\n2. Could not verify columns via Management API. Applying all ALTER statements...');
  }

  // Step 3: Apply ALTER TABLE for each missing column
  const toAdd = existingCols.size > 0 ? missing : REQUIRED_COLUMNS;
  let applied = 0;
  let failed = 0;

  for (const col of toAdd) {
    const sql = `ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`;
    console.log(`   Adding: ${col.name} (${col.type})...`);
    const result = await runSQL(sql);
    if (result.status === 200 || result.status === 204) {
      console.log(`   ✅ ${col.name} added`);
      applied++;
    } else {
      console.log(`   ⚠️  ${col.name}: ${result.status} — ${JSON.stringify(result.body).substring(0, 100)}`);
      failed++;
    }
  }

  // Step 4: Add indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_syndicated_picks_game_time ON public.syndicated_picks (game_time);',
    'CREATE INDEX IF NOT EXISTS idx_syndicated_picks_confidence ON public.syndicated_picks (confidence DESC);',
    'CREATE INDEX IF NOT EXISTS idx_syndicated_picks_batch_id ON public.syndicated_picks (batch_id);',
  ];
  for (const idx of indexes) {
    await runSQL(idx);
  }

  console.log(`\n=== Done: ${applied} columns added, ${failed} failed ===`);

  if (failed > 0) {
    console.log('\nFor failed columns, run this SQL manually in the Supabase SQL Editor:');
    console.log('  https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql\n');
    for (const col of toAdd) {
      console.log(`ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
    }
  }

  // Step 5: Verify with test insert
  console.log('\n3. Verifying with test insert...');
  const testRow = {
    batch_id: 'schema-verify', tier: 'free', pick_index: 0,
    game_id: 'verify-game', sport: 'TEST', home_team: 'Home', away_team: 'Away',
    game_time: new Date().toISOString(), pick_type: 'MONEYLINE',
    pick_selection: 'Home', confidence: 60, odds: -110,
    expected_value: 5.0, edge: 3.0, mc_win_probability: 0.6,
    analysis: 'schema verify', source_file: 'probe-schema.cjs', raw_data: {},
  };
  const { data, error } = await sb.from('syndicated_picks').insert([testRow]).select('id,game_time');
  if (error) {
    console.log('   ❌ Still failing:', error.message);
    console.log('\n   Run the SQL manually at:');
    console.log('   https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql');
  } else {
    console.log('   ✅ Insert succeeded! game_time:', data[0]?.game_time);
    if (data[0]?.id) {
      await sb.from('syndicated_picks').delete().eq('id', data[0].id);
      console.log('   ✅ Test row cleaned up');
    }
    console.log('\n✅ syndicated_picks schema is fully fixed!');
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
