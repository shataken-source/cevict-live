import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function addColumn() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE headlines ADD COLUMN IF NOT EXISTS bias_label TEXT CHECK (bias_label IN ('mainstream', 'alternative', 'neutral'));`
  });
  
  if (error) {
    console.error('Error:', error.message);
    // Try direct SQL
    const { error: e2 } = await supabase.from('headlines').select('id').limit(0);
    if (e2?.message?.includes('schema cache')) {
      console.log('Schema cache issue - need to refresh');
    }
  } else {
    console.log('bias_label column added successfully');
  }
}

addColumn();
