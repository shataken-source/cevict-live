// @ts-nocheck
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

console.log('Checking bot_learnings table...');
const { data, error } = await client.from('bot_learnings').select('*').limit(10);
if (error) {
  console.log('ERROR:', error.code, error.message);
} else {
  console.log(`Rows: ${data?.length ?? 0}`);
  console.log(JSON.stringify(data, null, 2));
}

console.log('\nChecking bot_metrics table...');
const { data: m, error: me } = await client.from('bot_metrics').select('*').limit(10);
if (me) console.log('ERROR:', me.code, me.message);
else console.log(`Rows: ${m?.length ?? 0}`, JSON.stringify(m, null, 2));

console.log('\nChecking trade_history for open positions...');
const { data: t, error: te } = await client
  .from('trade_history')
  .select('id, symbol, platform, outcome, entry_price, amount, opened_at')
  .eq('outcome', 'open')
  .order('opened_at', { ascending: false })
  .limit(10);
if (te) console.log('ERROR:', te.code, te.message);
else {
  console.log(`Open trades: ${t?.length ?? 0}`);
  for (const row of (t || [])) {
    console.log(`  ${row.platform} ${row.symbol} $${row.amount} @ ${row.entry_price} opened=${row.opened_at}`);
  }
}
