// Test script to verify Supabase connection and odds_cache table
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rdbuwyefbgnbuhmjrizo.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
  console.log('🔍 Testing Supabase connection to production database...\n');

  try {
    // Test 1: Basic connection
    console.log('Test 1: Basic connection...');
    const { data: health, error: healthError } = await supabase.from('odds_cache').select('count', { count: 'exact', head: true });

    if (healthError) {
      console.error('❌ Connection failed:', healthError.message);
      return false;
    }
    console.log('✅ Connection successful\n');

    // Test 2: Table structure
    console.log('Test 2: Checking table structure...');
    try {
      const { error: structureError } = await supabase
        .from('odds_cache')
        .select('id, external_id, sport, home_team, away_team, game_date, odds_data')
        .limit(1);

      if (structureError) {
        console.error('❌ Table structure issue:', structureError.message);
        return false;
      }
    } catch (e) {
      console.error('❌ Table structure error:', e);
      return false;
    }
    console.log('✅ Table structure looks good\n');

    // Test 3: Count records
    console.log('Test 3: Counting records...');
    const { count, error: countError } = await supabase
      .from('odds_cache')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Count failed:', countError.message);
      return false;
    }
    console.log(`✅ Table has ${count || 0} records\n`);

    // Test 4: Insert test record
    console.log('Test 4: Testing insert...');
    const testRecord = {
      external_id: `test-${Date.now()}`,
      sport: 'nba',
      sport_key: 'basketball_nba',
      home_team: 'Test Lakers',
      away_team: 'Test Warriors',
      commence_time: new Date().toISOString(),
      game_date: new Date().toISOString().split('T')[0],
      odds_data: { moneyline: { home: -150, away: 130 } },
      home_moneyline: -150,
      away_moneyline: 130,
      source: 'test'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('odds_cache')
      .insert(testRecord)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert failed:', insertError.message);
      return false;
    }
    console.log('✅ Insert successful, record ID:', insertData.id);

    // Test 5: Delete test record
    console.log('Test 5: Cleaning up test record...');
    const { error: deleteError } = await supabase
      .from('odds_cache')
      .delete()
      .eq('id', insertData.id);

    if (deleteError) {
      console.error('❌ Delete failed:', deleteError.message);
      return false;
    }
    console.log('✅ Cleanup successful\n');

    // Test 6: Check indexes (optional)
    console.log('Test 6: Checking indexes (optional)...');
    try {
      const { data: indexes } = await supabase
        .rpc('get_indexes', { table_name: 'odds_cache' });

      if (indexes) {
        console.log(`✅ Found ${indexes.length} indexes\n`);
      } else {
        console.log('⚠️ Could not verify indexes (RPC not available, but this is OK)\n');
      }
    } catch {
      console.log('⚠️ Could not verify indexes (RPC not available, but this is OK)\n');
    }

    // Summary
    console.log('🎉 ALL TESTS PASSED!');
    console.log('📊 Database is ready for production use');
    console.log(`🔗 Connected to: ${SUPABASE_URL}`);
    console.log(`📈 Current record count: ${count || 0}`);

    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
