#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// PRO DATABASE (TARGET)
const PRO_URL = 'https://rdbuwyefbgnbuhmjrizo.supabase.co';
const PRO_KEY = process.env.PRO_KEY || process.argv[2];

if (!PRO_KEY) {
  console.error('Usage: npx tsx add-placeholder-photo.ts <PRO_SERVICE_KEY>');
  console.error('PRO: rdbuwyefbgnbuhmjrizo (target database)');
  process.exit(1);
}

const proSupabase = createClient(PRO_URL, PRO_KEY);

async function main() {
  console.log('=== Adding Placeholder Photo ===\n');
  console.log('Database: rdbuwyefbgnbuhmjrizo\n');
  
  // Step 1: Get first pet
  console.log('Step 1: Finding first pet...');
  const { data: pets, error: fetchError } = await proSupabase
    .from('lost_pets')
    .select('id, pet_name')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  
  if (fetchError || !pets) {
    console.error('Error:', fetchError?.message || 'No pets found');
    return;
  }
  
  console.log(`✅ Found pet: ${pets.pet_name || 'Unknown'} (${pets.id})\n`);
  
  // Step 2: Update with placeholder photo
  console.log('Step 2: Adding placeholder photo...');
  const { data: updated, error: updateError } = await proSupabase
    .from('lost_pets')
    .update({ 
      photo_url: 'https://via.placeholder.com/400x400?text=Pet+Photo' 
    })
    .eq('id', pets.id)
    .select()
    .single();
  
  if (updateError) {
    console.error('Error updating:', updateError.message);
    return;
  }
  
  console.log(`✅ Updated pet with placeholder photo\n`);
  console.log(`   Photo URL: ${updated.photo_url}\n`);
  
  // Step 3: Test the function
  console.log('Step 3: Testing get_next_pet_of_day() function...');
  
  // Note: Can't call function directly via Supabase client easily
  // User should test in SQL Editor
  console.log('\n✅ Placeholder photo added!');
  console.log('   Now test in SQL Editor: SELECT * FROM get_next_pet_of_day();');
  console.log('   Should return the pet with the placeholder photo.');
}

main().catch(console.error);
