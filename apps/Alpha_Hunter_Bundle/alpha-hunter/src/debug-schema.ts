// @ts-nocheck
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Check existing bot_predictions rows to understand valid edge range
const { data, error } = await client
  .from('bot_predictions')
  .select('edge, confidence, market_price, probability')
  .order('edge', { ascending: false })
  .limit(10);

console.log('Existing rows (max edge first):');
console.log(JSON.stringify(data, null, 2));
if (error) console.log('Error:', error);
