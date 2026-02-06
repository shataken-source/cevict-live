#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const PRO_URL = 'https://rdbuwyefbgnbuhmjrizo.supabase.co';
const PRO_KEY = process.argv[2];

if (!PRO_KEY) {
  console.error('Usage: npx tsx check-pets-status.ts <PRO_SERVICE_ROLE_KEY>');
  process.exit(1);
}

const supabase = createClient(PRO_URL, PRO_KEY);

async function main() {
  console.log('=== Checking PRO Database Status ===\n');
  
  // Check pets table
  const { count: petsCount, error: petsError } = await supabase
    .from('pets')
    .select('*', { count: 'exact', head: true });
  
  console.log(`pets table: ${petsCount || 0} rows`);
  if (petsError) console.error('Error:', petsError.message);
  
  // Check lost_pets table
  const { count: lostPetsCount, error: lostError } = await supabase
    .from('lost_pets')
    .select('*', { count: 'exact', head: true });
  
  console.log(`lost_pets table: ${lostPetsCount || 0} rows`);
  if (lostError) console.error('Error:', lostError.message);
  
  // Try to get a sample from pets table
  const { data: sample, error: sampleError } = await supabase
    .from('pets')
    .select('*')
    .limit(5);
  
  if (sampleError) {
    console.error('\nCannot read pets table:', sampleError.message);
  } else {
    console.log(`\nSample pets: ${sample?.length || 0} rows returned`);
  }
  
  console.log('\nIf pets table shows 0, check Supabase Backups to restore!');
}

main().catch(console.error);
