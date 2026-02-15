// Simple test for Supabase connection
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rdbuwyefbgnbuhmjrizo.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function test() {
  if (!SUPABASE_KEY) {
    console.log('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
    return;
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  console.log('Testing connection to:', SUPABASE_URL);
  
  try {
    const { count, error } = await supabase
      .from('odds_cache')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }
    
    console.log('✅ Connected successfully!');
    console.log('📊 Records in odds_cache:', count);
    
    // Try to insert a test record
    const { data, error: insertError } = await supabase
      .from('odds_cache')
      .insert({
        external_id: `test-${Date.now()}`,
        sport: 'test',
        sport_key: 'test',
        home_team: 'Test Team A',
        away_team: 'Test Team B',
        commence_time: new Date().toISOString(),
        game_date: new Date().toISOString().split('T')[0],
        odds_data: {},
        source: 'test'
      })
      .select()
      .single();
    
    if (insertError) {
      console.log('❌ Insert failed:', insertError.message);
    } else {
      console.log('✅ Insert test passed! ID:', data.id);
      
      // Clean up
      await supabase.from('odds_cache').delete().eq('id', data.id);
      console.log('✅ Cleanup complete');
    }
    
  } catch (e) {
    console.log('❌ Exception:', e);
  }
}

test();
