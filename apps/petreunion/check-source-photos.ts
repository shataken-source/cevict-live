#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// FREE DATABASE (SOURCE - has pets table with 26,190 pets)
const FREE_URL = 'https://nqkbqtiramecvmmpaxzk.supabase.co';
const FREE_KEY = process.env.FREE_KEY || process.argv[2];

if (!FREE_KEY) {
  console.error('Usage: npx tsx check-source-photos.ts <FREE_SERVICE_KEY>');
  console.error('FREE: nqkbqtiramecvmmpaxzk (source database)');
  process.exit(1);
}

const freeSupabase = createClient(FREE_URL, FREE_KEY);

async function main() {
  console.log('=== Checking Source Photos in FREE Database ===\n');
  console.log('Database: nqkbqtiramecvmmpaxzk\n');
  
  // Step 1: Get total count
  console.log('Step 1: Checking total pets...');
  const { count: totalCount, error: countError } = await freeSupabase
    .from('pets')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('Error:', countError.message);
    return;
  }
  
  console.log(`✅ Found ${totalCount || 0} pets in FREE database\n`);
  
  if (!totalCount || totalCount === 0) {
    console.log('❌ No pets found in FREE database');
    return;
  }
  
  // Step 2: Get sample pets to check field names
  console.log('Step 2: Checking field names and sample data...');
  const { data: samplePets, error: sampleError } = await freeSupabase
    .from('pets')
    .select('*')
    .limit(10);
  
  if (sampleError) {
    console.error('Error fetching sample:', sampleError.message);
    return;
  }
  
  if (!samplePets || samplePets.length === 0) {
    console.log('❌ Could not fetch sample pets');
    return;
  }
  
  // Step 3: Analyze photo fields
  console.log('\nStep 3: Analyzing photo fields...\n');
  
  const photoFields: string[] = [];
  const samplePet = samplePets[0];
  
  // Check all possible photo field names
  const possibleFields = ['photo_url', 'image_url', 'photo', 'image', 'img', 'picture', 'pic', 'url'];
  for (const field of possibleFields) {
    if (samplePet[field] !== undefined) {
      photoFields.push(field);
    }
  }
  
  console.log('📋 Photo-related fields found:', photoFields.length > 0 ? photoFields.join(', ') : 'NONE');
  
  // Step 4: Count pets with photos in each field
  console.log('\nStep 4: Counting pets with photos...\n');
  
  for (const field of photoFields) {
    const { count, error } = await freeSupabase
      .from('pets')
      .select('*', { count: 'exact', head: true })
      .not(field, 'is', null)
      .neq(field, '');
    
    if (!error && count) {
      const percentage = ((count / totalCount!) * 100).toFixed(2);
      console.log(`  ${field}: ${count} pets (${percentage}%)`);
    }
  }
  
  // Step 5: Count pets with ANY photo field
  console.log('\nStep 5: Checking pets with ANY photo field...');
  
  // Fetch all pets and check in memory (since we can't do OR in Supabase easily)
  const { data: allPets, error: fetchError } = await freeSupabase
    .from('pets')
    .select('*')
    .limit(10000); // Check first 10k for speed
  
  if (fetchError) {
    console.error('Error:', fetchError.message);
    return;
  }
  
  let petsWithPhotos = 0;
  const photoFieldUsage: Record<string, number> = {};
  
  for (const pet of allPets || []) {
    let hasPhoto = false;
    for (const field of photoFields) {
      const value = pet[field];
      if (value && value !== '' && value !== 'null') {
        hasPhoto = true;
        photoFieldUsage[field] = (photoFieldUsage[field] || 0) + 1;
        break; // Count once per pet
      }
    }
    if (hasPhoto) petsWithPhotos++;
  }
  
  const percentage = allPets ? ((petsWithPhotos / allPets.length) * 100).toFixed(2) : '0';
  console.log(`\n✅ Pets with photos: ${petsWithPhotos} / ${allPets?.length || 0} (${percentage}%)`);
  
  if (Object.keys(photoFieldUsage).length > 0) {
    console.log('\n📊 Photo field usage:');
    for (const [field, count] of Object.entries(photoFieldUsage)) {
      console.log(`  ${field}: ${count} pets`);
    }
  }
  
  // Step 6: Show sample pets with photos
  console.log('\nStep 6: Sample pets WITH photos...\n');
  
  const petsWithPhotosList = (allPets || []).filter(pet => {
    for (const field of photoFields) {
      const value = pet[field];
      if (value && value !== '' && value !== 'null') {
        return true;
      }
    }
    return false;
  }).slice(0, 5);
  
  if (petsWithPhotosList.length > 0) {
    for (const pet of petsWithPhotosList) {
      const photoField = photoFields.find(f => pet[f] && pet[f] !== '' && pet[f] !== 'null');
      console.log(`  - ${pet.name || 'Unknown'}: ${photoField} = ${pet[photoField!]?.substring(0, 50)}...`);
    }
  } else {
    console.log('  ❌ No pets with photos found in sample');
  }
  
  // Step 7: Recommendations
  console.log('\n=== RECOMMENDATIONS ===\n');
  
  if (petsWithPhotos === 0) {
    console.log('❌ NO PHOTOS FOUND in source database');
    console.log('   - Photos might be in Supabase Storage');
    console.log('   - Photos might be in a different table');
    console.log('   - Photos need to be uploaded separately');
  } else {
    const primaryField = Object.entries(photoFieldUsage).sort((a, b) => b[1] - a[1])[0]?.[0];
    console.log(`✅ Photos found! Primary field: ${primaryField}`);
    console.log(`\n   Update recover-all-pets.ts line 91:`);
    console.log(`   photo_url: pet.${primaryField} || pet.photo_url || pet.image_url || null,`);
    console.log(`\n   Then re-run: .\\RUN_RECOVERY.ps1`);
  }
  
  console.log('\n✅ Analysis complete!');
}

main().catch(console.error);
