#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const FREE_URL = 'https://nqkbqtiramecvmmpaxzk.supabase.co';
const FREE_KEY = process.argv[2];
const PRO_URL = 'https://rdbuwyefbgnbuhmjrizo.supabase.co';
const PRO_KEY = process.argv[3];

if (!FREE_KEY || !PRO_KEY) {
  console.error('Usage: npx tsx check-schemas.ts <FREE_KEY> <PRO_KEY>');
  process.exit(1);
}

const freeSupabase = createClient(FREE_URL, FREE_KEY);
const proSupabase = createClient(PRO_URL, PRO_KEY);

async function main() {
  console.log('=== Schema Check ===\n');
  
  // Get sample from FREE pets table
  console.log('FREE database pets table (sample):');
  const { data: freeSample, error: freeError } = await freeSupabase
    .from('pets')
    .select('*')
    .limit(1);
  
  if (freeError) {
    console.error('Error:', freeError.message);
  } else if (freeSample && freeSample.length > 0) {
    console.log('Columns:', Object.keys(freeSample[0]).join(', '));
    console.log('Sample:', JSON.stringify(freeSample[0], null, 2));
  }
  
  // Get sample from PRO lost_pets table
  console.log('\nPRO database lost_pets table (sample):');
  const { data: proSample, error: proError } = await proSupabase
    .from('lost_pets')
    .select('*')
    .limit(1);
  
  if (proError) {
    console.error('Error:', proError.message);
  } else if (proSample && proSample.length > 0) {
    console.log('Columns:', Object.keys(proSample[0]).join(', '));
    console.log('Sample:', JSON.stringify(proSample[0], null, 2));
  }
}

main().catch(console.error);
