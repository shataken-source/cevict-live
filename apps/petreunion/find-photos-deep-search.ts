#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// FREE DATABASE (SOURCE)
const FREE_URL = 'https://nqkbqtiramecvmmpaxzk.supabase.co';
const FREE_KEY = process.env.FREE_KEY || process.argv[2];

if (!FREE_KEY) {
  console.error('Usage: npx tsx find-photos-deep-search.ts <FREE_SERVICE_KEY>');
  process.exit(1);
}

const freeSupabase = createClient(FREE_URL, FREE_KEY);

async function main() {
  console.log('=== Deep Search for Photos ===\n');
  console.log('Database: nqkbqtiramecvmmpaxzk\n');
  
  // Step 1: Get sample pets and check ALL fields
  console.log('Step 1: Analyzing ALL fields in pets table...\n');
  const { data: samplePets, error: sampleError } = await freeSupabase
    .from('pets')
    .select('*')
    .limit(20);
  
  if (sampleError || !samplePets || samplePets.length === 0) {
    console.error('Error:', sampleError?.message || 'No pets found');
    return;
  }
  
  // Get all field names from first pet
  const allFields = Object.keys(samplePets[0]);
  console.log(`Found ${allFields.length} fields in pets table:`);
  console.log(allFields.join(', '));
  console.log('');
  
  // Step 2: Check each field for URL-like values
  console.log('Step 2: Searching for URL-like values in all fields...\n');
  
  const urlFields: string[] = [];
  const urlPattern = /https?:\/\/[^\s]+/i;
  
  for (const pet of samplePets) {
    for (const [field, value] of Object.entries(pet)) {
      if (value && typeof value === 'string' && urlPattern.test(value)) {
        if (!urlFields.includes(field)) {
          urlFields.push(field);
        }
      }
    }
  }
  
  if (urlFields.length > 0) {
    console.log('✅ Found URL-like fields:', urlFields.join(', '));
  } else {
    console.log('❌ No URL-like values found in sample');
  }
  
  // Step 3: Check each URL field for photo URLs
  console.log('\nStep 3: Checking which fields contain photo URLs...\n');
  
  const photoFields: Record<string, number> = {};
  const photoPatterns = [
    /\.(jpg|jpeg|png|gif|webp|svg)/i,
    /photo|image|img|pic|picture/i,
    /supabase\.co.*storage/i,
    /\.supabase\.co\/storage/i
  ];
  
  for (const field of urlFields) {
    let photoCount = 0;
    for (const pet of samplePets) {
      const value = pet[field];
      if (value && typeof value === 'string') {
        for (const pattern of photoPatterns) {
          if (pattern.test(value)) {
            photoCount++;
            break;
          }
        }
      }
    }
    if (photoCount > 0) {
      photoFields[field] = photoCount;
    }
  }
  
  if (Object.keys(photoFields).length > 0) {
    console.log('✅ Fields with photo URLs:');
    for (const [field, count] of Object.entries(photoFields)) {
      console.log(`   ${field}: ${count} pets in sample`);
    }
  } else {
    console.log('❌ No photo URLs found in URL fields');
  }
  
  // Step 4: Check for JSON fields that might contain photos
  console.log('\nStep 4: Checking for JSON fields...\n');
  
  const jsonFields: string[] = [];
  for (const pet of samplePets) {
    for (const [field, value] of Object.entries(pet)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!jsonFields.includes(field)) {
          jsonFields.push(field);
        }
      }
    }
  }
  
  if (jsonFields.length > 0) {
    console.log('✅ Found JSON/object fields:', jsonFields.join(', '));
    console.log('   Checking if they contain photo URLs...\n');
    
    for (const field of jsonFields) {
      for (const pet of samplePets) {
        const value = pet[field];
        if (value && typeof value === 'object') {
          const jsonStr = JSON.stringify(value);
          if (urlPattern.test(jsonStr)) {
            console.log(`   ✅ ${field} contains URLs!`);
            console.log(`      Sample: ${JSON.stringify(value).substring(0, 100)}...`);
            break;
          }
        }
      }
    }
  }
  
  // Step 5: Count total pets with photos in any field
  console.log('\nStep 5: Counting pets with photos in ANY field...\n');
  
  const { data: allPets, error: fetchError } = await freeSupabase
    .from('pets')
    .select('*')
    .limit(1000); // Check first 1000
  
  if (!fetchError && allPets) {
    let petsWithPhotos = 0;
    const fieldUsage: Record<string, number> = {};
    
    for (const pet of allPets) {
      let hasPhoto = false;
      for (const [field, value] of Object.entries(pet)) {
        if (value && typeof value === 'string') {
          // Check if it's a photo URL
          if (urlPattern.test(value) && photoPatterns.some(p => p.test(value))) {
            hasPhoto = true;
            fieldUsage[field] = (fieldUsage[field] || 0) + 1;
            break;
          }
        } else if (value && typeof value === 'object') {
          // Check JSON fields
          const jsonStr = JSON.stringify(value);
          if (urlPattern.test(jsonStr) && photoPatterns.some(p => p.test(jsonStr))) {
            hasPhoto = true;
            fieldUsage[field] = (fieldUsage[field] || 0) + 1;
            break;
          }
        }
      }
      if (hasPhoto) petsWithPhotos++;
    }
    
    const percentage = ((petsWithPhotos / allPets.length) * 100).toFixed(2);
    console.log(`✅ Pets with photos: ${petsWithPhotos} / ${allPets.length} (${percentage}%)`);
    
    if (Object.keys(fieldUsage).length > 0) {
      console.log('\n📊 Photo field usage:');
      for (const [field, count] of Object.entries(fieldUsage).sort((a, b) => b[1] - a[1])) {
        console.log(`   ${field}: ${count} pets`);
      }
    }
  }
  
  // Step 6: Show sample pets with photos
  console.log('\nStep 6: Sample pets with photos...\n');
  
  if (allPets) {
    const petsWithPhotos = allPets.filter(pet => {
      for (const [field, value] of Object.entries(pet)) {
        if (value && typeof value === 'string') {
          if (urlPattern.test(value) && photoPatterns.some(p => p.test(value))) {
            return true;
          }
        }
      }
      return false;
    }).slice(0, 5);
    
    if (petsWithPhotos.length > 0) {
      for (const pet of petsWithPhotos) {
        for (const [field, value] of Object.entries(pet)) {
          if (value && typeof value === 'string' && urlPattern.test(value) && photoPatterns.some(p => p.test(value))) {
            console.log(`  - ${pet.name || 'Unknown'}: ${field} = ${value.substring(0, 60)}...`);
            break;
          }
        }
      }
    } else {
      console.log('  ❌ No pets with photos found');
    }
  }
  
  // Step 7: Recommendations
  console.log('\n=== RECOMMENDATIONS ===\n');
  
  if (Object.keys(photoFields).length > 0 || Object.keys(fieldUsage || {}).length > 0) {
    const primaryField = Object.entries(fieldUsage || {}).sort((a, b) => b[1] - a[1])[0]?.[0] ||
                        Object.keys(photoFields)[0];
    console.log(`✅ Photos found in field: ${primaryField}`);
    console.log(`\n   Update recover-all-pets.ts line 91:`);
    console.log(`   photo_url: pet.${primaryField} || pet.photo_url || pet.image_url || null,`);
    console.log(`\n   Then re-run: .\\RUN_RECOVERY.ps1`);
  } else {
    console.log('❌ No photos found in any field');
    console.log('   - Photos might be in Supabase Storage only');
    console.log('   - Photos might be in a different table');
    console.log('   - Check Storage buckets in dashboard');
  }
  
  console.log('\n✅ Deep search complete!');
}

main().catch(console.error);
