/**
 * Apply syndicated_picks migration via Supabase JS client
 * Run: node apply-migration.cjs
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://rdbuwyefbgnbuhmjrizo.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkYnV3eWVmYmduYnVobWpyaXpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyOTg3OSwiZXhwIjoyMDc5MjA1ODc5fQ.JQBc_tHs2rZ9seyy8SygTzroB2ZVZo5JfrC8nriXo6I';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Individual DDL statements to run in order
// We can't run raw SQL via the JS client directly, but we can use the
// Supabase Management API's /pg endpoint or test by doing a probe insert.
// Instead: use the rpc() call with a custom function, OR just test the table
// by attempting an insert with all columns and catching the specific error.

async function applyMigration() {
  console.log('Testing syndicated_picks table schema...\n');

  // Step 1: Check if table exists by doing a select
  const { data: existing, error: selectErr } = await supabase
    .from('syndicated_picks')
    .select('id')
    .limit(1);

  if (selectErr) {
    if (selectErr.message.includes('does not exist') || selectErr.code === '42P01') {
      console.log('Table does not exist — needs to be created via SQL Editor.');
      console.log('\nPaste this SQL into: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/sql\n');
      console.log(fs.readFileSync(path.join(__dirname, '001_syndicated_picks.sql'), 'utf8'));
      return;
    }
    console.error('Select error:', selectErr.message);
  } else {
    console.log('✅ Table exists. Checking columns...');
  }

  // Step 2: Probe for game_time column by inserting a test row
  const testRow = {
    batch_id: 'migration-test',
    tier: 'free',
    pick_index: 0,
    game_id: 'migration-test-game',
    sport: 'TEST',
    home_team: 'Home',
    away_team: 'Away',
    game_time: new Date().toISOString(),
    pick_type: 'MONEYLINE',
    pick_selection: 'Home',
    confidence: 60,
    odds: -110,
    expected_value: 5.0,
    edge: 3.0,
    recommended_line: null,
    mc_win_probability: 0.6,
    analysis: 'Migration test row',
    source_file: 'apply-migration.cjs',
    raw_data: { test: true },
  };

  const { data: inserted, error: insertErr } = await supabase
    .from('syndicated_picks')
    .insert([testRow])
    .select('id, game_time');

  if (insertErr) {
    console.error('\n❌ Insert failed:', insertErr.message);
    console.error('Code:', insertErr.code);

    if (insertErr.message.includes('game_time') || insertErr.message.includes('column')) {
      console.log('\n⚠️  Missing columns detected. Run this SQL in the Supabase SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/sql\n');
      // Print just the ALTER TABLE statements
      const sql = fs.readFileSync(path.join(__dirname, '001_syndicated_picks.sql'), 'utf8');
      const alterStatements = sql.split('\n')
        .filter(l => l.trim().startsWith('DO $$') || l.trim().startsWith('ALTER') || l.trim().startsWith('EXCEPTION') || l.trim().startsWith('END') || l.trim().startsWith('CREATE INDEX'))
        .join('\n');
      console.log(alterStatements);
    }
    return;
  }

  console.log('✅ Test insert succeeded — all columns exist!');
  console.log('   Inserted row id:', inserted?.[0]?.id);
  console.log('   game_time:', inserted?.[0]?.game_time);

  // Clean up test row
  if (inserted?.[0]?.id) {
    await supabase.from('syndicated_picks').delete().eq('id', inserted[0].id);
    console.log('✅ Test row cleaned up');
  }

  console.log('\n✅ syndicated_picks schema is correct — no migration needed!');
}

applyMigration().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
