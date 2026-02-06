#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// Check both databases for photos
const FREE_URL = 'https://nqkbqtiramecvmmpaxzk.supabase.co';
const PRO_URL = 'https://rdbuwyefbgnbuhmjrizo.supabase.co';

const FREE_KEY = process.env.FREE_KEY || process.argv[2];
const PRO_KEY = process.env.PRO_KEY || process.argv[3];

if (!FREE_KEY || !PRO_KEY) {
  console.error('Usage: npx tsx find-photos-anywhere.ts <FREE_KEY> <PRO_KEY>');
  process.exit(1);
}

const freeSupabase = createClient(FREE_URL, FREE_KEY);
const proSupabase = createClient(PRO_URL, PRO_KEY);

async function main() {
  console.log('=== Finding Photos Anywhere ===\n');
  
  // Check FREE database - pets table
  console.log('1. Checking FREE database pets table...');
  const { data: freePets, error: freeError } = await freeSupabase
    .from('pets')
    .select('photo_url, image_url, photo, image')
    .not('photo_url', 'is', null)
    .neq('photo_url', '')
    .limit(10);
  
  if (!freeError && freePets && freePets.length > 0) {
    console.log(`   ✅ Found ${freePets.length} pets with photos in FREE pets table`);
  } else {
    console.log('   ❌ No photos in FREE pets table');
  }
  
  // Check PRO database - lost_pets table
  console.log('\n2. Checking PRO database lost_pets table...');
  const { data: proPets, error: proError } = await proSupabase
    .from('lost_pets')
    .select('photo_url')
    .not('photo_url', 'is', null)
    .neq('photo_url', '')
    .limit(10);
  
  if (!proError && proPets && proPets.length > 0) {
    console.log(`   ✅ Found ${proPets.length} pets with photos in PRO lost_pets table`);
    console.log('   Sample photo URLs:');
    proPets.slice(0, 3).forEach((pet, i) => {
      console.log(`     ${i + 1}. ${pet.photo_url?.substring(0, 60)}...`);
    });
  } else {
    console.log('   ❌ No photos in PRO lost_pets table');
  }
  
  // Check if there are other tables with photos
  console.log('\n3. Checking for other pet-related tables...');
  
  // Check FREE database for other tables
  const { data: freeTables } = await freeSupabase
    .from('pets')
    .select('*')
    .limit(1);
  
  // Check PRO database for other tables
  const { data: proTables } = await proSupabase
    .from('lost_pets')
    .select('*')
    .limit(1);
  
  console.log('   Tables checked: pets (FREE), lost_pets (PRO)');
  
  // Check Supabase Storage (if accessible)
  console.log('\n4. Photos might be in Supabase Storage...');
  console.log('   Check Storage buckets in Supabase Dashboard:');
  console.log('   - FREE: https://supabase.com/dashboard/project/nqkbqtiramecvmmpaxzk/storage/buckets');
  console.log('   - PRO: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/storage/buckets');
  
  // Final recommendation
  console.log('\n=== CONCLUSION ===\n');
  
  if (proPets && proPets.length > 0) {
    console.log('✅ Some pets in PRO database HAVE photos');
    console.log('   - These were likely added manually or via API');
    console.log('   - Pet of Day should work with these pets');
    console.log('   - Check how many total: Run CHECK_FULL_RECOVERY_STATUS.sql');
  } else {
    console.log('❌ NO photos found anywhere');
    console.log('   - Source database has no photos');
    console.log('   - PRO database has no photos');
    console.log('   - Photos need to be uploaded separately');
    console.log('   - Or photos are in Supabase Storage buckets');
  }
  
  console.log('\n✅ Check complete!');
}

main().catch(console.error);
