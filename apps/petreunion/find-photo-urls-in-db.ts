#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// FREE DATABASE (SOURCE)
const FREE_URL = 'https://nqkbqtiramecvmmpaxzk.supabase.co';
const FREE_KEY = process.env.FREE_KEY || process.argv[2];

if (!FREE_KEY) {
  console.error('Usage: npx tsx find-photo-urls-in-db.ts <FREE_SERVICE_KEY>');
  process.exit(1);
}

const freeSupabase = createClient(FREE_URL, FREE_KEY);

async function main() {
  console.log('=== Finding Photo URLs in Database ===\n');
  console.log('Database: nqkbqtiramecvmmpaxzk\n');
  
  // Get pets with ANY non-null, non-empty photo_url
  console.log('Step 1: Checking pets with photo_url field...\n');
  
  const { data: petsWithPhotos, error } = await freeSupabase
    .from('pets')
    .select('id, name, photo_url')
    .not('photo_url', 'is', null)
    .neq('photo_url', '')
    .limit(20);
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  if (!petsWithPhotos || petsWithPhotos.length === 0) {
    console.log('❌ No pets with photo_url found\n');
  } else {
    console.log(`✅ Found ${petsWithPhotos.length} pets with photo_url:\n`);
    petsWithPhotos.slice(0, 10).forEach((pet, i) => {
      console.log(`   ${i + 1}. ${pet.name || 'Unknown'}`);
      console.log(`      URL: ${pet.photo_url?.substring(0, 80)}...\n`);
    });
  }
  
  // Check for external URLs (not Supabase Storage)
  console.log('Step 2: Checking for external photo URLs...\n');
  
  const { data: allPets } = await freeSupabase
    .from('pets')
    .select('id, name, photo_url')
    .limit(1000);
  
  if (allPets) {
    const externalUrls = allPets
      .filter(p => p.photo_url && 
        !p.photo_url.includes('supabase.co/storage') &&
        !p.photo_url.includes('supabase.co/storage'))
      .slice(0, 10);
    
    if (externalUrls.length > 0) {
      console.log(`✅ Found ${externalUrls.length} pets with external URLs:\n`);
      externalUrls.forEach((pet, i) => {
        console.log(`   ${i + 1}. ${pet.name || 'Unknown'}`);
        console.log(`      URL: ${pet.photo_url}\n`);
      });
    } else {
      console.log('❌ No external photo URLs found\n');
    }
  }
  
  // Check for broken Storage URLs
  console.log('Step 3: Checking for Supabase Storage URLs...\n');
  
  const { data: storageUrls } = await freeSupabase
    .from('pets')
    .select('id, name, photo_url')
    .like('photo_url', '%supabase.co/storage%')
    .limit(10);
  
  if (storageUrls && storageUrls.length > 0) {
    console.log(`✅ Found ${storageUrls.length} pets with Storage URLs:\n`);
    storageUrls.forEach((pet, i) => {
      console.log(`   ${i + 1}. ${pet.name || 'Unknown'}`);
      console.log(`      URL: ${pet.photo_url}\n`);
    });
    console.log('💡 These URLs might be broken if files were deleted from Storage');
  } else {
    console.log('❌ No Storage URLs found in database\n');
  }
  
  console.log('✅ Check complete!');
}

main().catch(console.error);
