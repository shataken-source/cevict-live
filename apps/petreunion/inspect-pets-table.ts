#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// FREE DATABASE (SOURCE)
const FREE_URL = 'https://nqkbqtiramecvmmpaxzk.supabase.co';
const FREE_KEY = process.env.FREE_KEY || process.argv[2];

if (!FREE_KEY) {
  console.error('Usage: npx tsx inspect-pets-table.ts <FREE_SERVICE_KEY>');
  process.exit(1);
}

const freeSupabase = createClient(FREE_URL, FREE_KEY);

async function main() {
  console.log('=== Inspecting pets Table ===\n');
  console.log('Database: nqkbqtiramecvmmpaxzk\n');
  
  // Get a sample of pets with ALL fields
  console.log('Fetching sample pets...\n');
  const { data: pets, error } = await freeSupabase
    .from('pets')
    .select('*')
    .limit(10);
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  if (!pets || pets.length === 0) {
    console.error('No pets found');
    return;
  }
  
  // Show all field names
  console.log('📋 All fields in pets table:');
  const allFields = Object.keys(pets[0]);
  allFields.forEach((field, i) => {
    console.log(`   ${i + 1}. ${field}`);
  });
  console.log('');
  
  // Show sample pet with ALL data
  console.log('📄 Sample pet (first one):');
  console.log(JSON.stringify(pets[0], null, 2));
  console.log('');
  
  // Check specifically for photo-related fields
  console.log('🔍 Checking for photo-related fields...\n');
  const photoFields: string[] = [];
  const urlPattern = /https?:\/\//i;
  
  for (const field of allFields) {
    const value = pets[0][field];
    if (value && typeof value === 'string' && urlPattern.test(value)) {
      photoFields.push(field);
      console.log(`   ✅ ${field}: ${value.substring(0, 80)}...`);
    } else if (value && typeof value === 'object' && value !== null) {
      const jsonStr = JSON.stringify(value);
      if (urlPattern.test(jsonStr)) {
        photoFields.push(field);
        console.log(`   ✅ ${field} (JSON): ${jsonStr.substring(0, 80)}...`);
      }
    }
  }
  
  if (photoFields.length === 0) {
    console.log('   ❌ No photo URLs found in sample');
  }
  
  // Check multiple pets for photos
  console.log('\n🔍 Checking all 10 sample pets for photos...\n');
  let petsWithPhotos = 0;
  const fieldUsage: Record<string, number> = {};
  
  for (const pet of pets) {
    for (const field of allFields) {
      const value = pet[field];
      if (value && typeof value === 'string' && urlPattern.test(value)) {
        petsWithPhotos++;
        fieldUsage[field] = (fieldUsage[field] || 0) + 1;
        break;
      }
    }
  }
  
  console.log(`   Pets with photos: ${petsWithPhotos} / ${pets.length}`);
  if (Object.keys(fieldUsage).length > 0) {
    console.log('\n   Fields containing URLs:');
    for (const [field, count] of Object.entries(fieldUsage)) {
      console.log(`      ${field}: ${count} pets`);
    }
  }
  
  // Check total count with photos
  console.log('\n📊 Checking total pets with photos_url field...\n');
  const { count: totalWithPhotos } = await freeSupabase
    .from('pets')
    .select('*', { count: 'exact', head: true })
    .not('photo_url', 'is', null)
    .neq('photo_url', '');
  
  const { count: totalPets } = await freeSupabase
    .from('pets')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   Total pets: ${totalPets || 0}`);
  console.log(`   Pets with photo_url: ${totalWithPhotos || 0}`);
  
  console.log('\n✅ Inspection complete!');
}

main().catch(console.error);
