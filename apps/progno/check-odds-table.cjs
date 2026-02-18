const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rdbuwyefbgnbuhmjrizo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkYnV3eWVmYmduYnVobWpyaXpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyOTg3OSwiZXhwIjoyMDc5MjA1ODc5fQ.JQBc_tHs2rZ9seyy8SygTzroB2ZVZo5JfrC8nriXo6I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOdds() {
  console.log('Checking historical_odds table...');
  const { count, error } = await supabase
    .from('historical_odds')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`historical_odds count: ${count}`);
  }
}

checkOdds();