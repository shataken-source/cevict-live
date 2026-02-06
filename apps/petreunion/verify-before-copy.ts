#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// FREE DATABASE (SOURCE)
const FREE_URL = 'https://nqkbqtiramecvmmpaxzk.supabase.co';
const FREE_KEY = process.argv[2];

// PRO DATABASE (TARGET)
const PRO_URL = 'https://rdbuwyefbgnbuhmjrizo.supabase.co';
const PRO_KEY = process.argv[3];

if (!FREE_KEY || !PRO_KEY) {
  console.error('Usage: npx tsx verify-before-copy.ts <FREE_KEY> <PRO_KEY>');
  console.error('This script is READ-ONLY - it does NOT modify anything');
  process.exit(1);
}

const freeSupabase = createClient(FREE_URL, FREE_KEY);
const proSupabase = createClient(PRO_URL, PRO_KEY);

async function main() {
  console.log('=== SAFE VERIFICATION (READ-ONLY) ===\n');
  console.log('This script does NOT modify anything. It only checks.\n');
  
  // Check FREE database
  console.log('FREE Database (nqkbqtiramecvmmpaxzk):');
  console.log('  Checking pets table...');
  const { count: freePetsCount, error: freePetsError } = await freeSupabase
    .from('pets')
    .select('*', { count: 'exact', head: true });
  
  if (freePetsError) {
    console.error('  ❌ Error:', freePetsError.message);
  } else {
    console.log(`  ✅ Found ${freePetsCount || 0} pets in pets table`);
  }
  
  // Check PRO database
  console.log('\nPRO Database (rdbuwyefbgnbuhmjrizo):');
  console.log('  Checking lost_pets table...');
  const { count: proLostCount, error: proLostError } = await proSupabase
    .from('lost_pets')
    .select('*', { count: 'exact', head: true });
  
  if (proLostError) {
    console.error('  ❌ Error:', proLostError.message);
  } else {
    console.log(`  ✅ Found ${proLostCount || 0} pets in lost_pets table`);
  }
  
  // Show sample from FREE
  console.log('\n--- Sample from FREE pets table (first 3) ---');
  const { data: freeSample, error: freeSampleError } = await freeSupabase
    .from('pets')
    .select('id, name, pet_type, photo_url')
    .limit(3);
  
  if (freeSampleError) {
    console.error('  ❌ Error:', freeSampleError.message);
  } else if (freeSample && freeSample.length > 0) {
    freeSample.forEach((pet, i) => {
      console.log(`  ${i + 1}. ${pet.name || 'unnamed'} (${pet.pet_type || 'unknown'})`);
    });
  } else {
    console.log('  (no pets found)');
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`FREE database has: ${freePetsCount || 0} pets`);
  console.log(`PRO database has: ${proLostCount || 0} pets`);
  console.log(`\nIf FREE has pets and PRO doesn't, you can safely run:`);
  console.log(`  npx tsx recover-all-pets.ts <FREE_KEY> <PRO_KEY>`);
  console.log(`\nThe copy script will ADD pets to PRO (it won't delete anything)`);
}

main().catch(console.error);
