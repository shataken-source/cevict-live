#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// PRO DATABASE (TARGET)
const PRO_URL = 'https://rdbuwyefbgnbuhmjrizo.supabase.co';
const PRO_KEY = process.env.PRO_KEY || process.argv[2];

if (!PRO_KEY) {
  console.error('Usage: npx tsx add-photos-to-existing-pets.ts <PRO_SERVICE_KEY>');
  process.exit(1);
}

const proSupabase = createClient(PRO_URL, PRO_KEY);

// Placeholder photos (same as scraper uses)
const DOG_PHOTOS = [
  "https://images.dog.ceo/breeds/labrador/n02099712_1902.jpg",
  "https://images.dog.ceo/breeds/beagle/n02088364_11136.jpg",
  "https://images.dog.ceo/breeds/bulldog-english/jager-2.jpg",
  "https://images.dog.ceo/breeds/husky/n02110185_1469.jpg",
  "https://images.dog.ceo/breeds/poodle-toy/n02113624_955.jpg",
  "https://images.dog.ceo/breeds/retriever-golden/n02099601_3052.jpg",
  "https://images.dog.ceo/breeds/corgi-cardigan/n02113186_1038.jpg",
];

const CAT_PHOTOS = [
  "https://cdn2.thecatapi.com/images/MTY3ODIyMQ.jpg",
  "https://cdn2.thecatapi.com/images/MTk4NTcxMw.jpg",
  "https://cdn2.thecatapi.com/images/MTY5OTYyMQ.jpg",
  "https://cdn2.thecatapi.com/images/MTY2MTcwNQ.jpg",
  "https://cdn2.thecatapi.com/images/MTY3Nzg0MQ.jpg",
  "https://cdn2.thecatapi.com/images/MTc2ODMyMw.jpg",
  "https://cdn2.thecatapi.com/images/MTYyODIyMQ.jpg",
];

function randomPhoto(petType: string): string {
  const isDog = petType?.toLowerCase() === 'dog' || petType?.toLowerCase() === 'dogs';
  const photos = isDog ? DOG_PHOTOS : CAT_PHOTOS;
  return photos[Math.floor(Math.random() * photos.length)];
}

async function main() {
  console.log('=== Adding Photos to Existing Pets ===\n');
  console.log('Database: rdbuwyefbgnbuhmjrizo (PRO)\n');
  
  // Step 1: Count pets without photos
  console.log('Step 1: Finding pets without photos...\n');
  
  // Get ALL pets without photos (no limit)
  let petsWithoutPhotos: any[] = [];
  let offset = 0;
  const fetchBatchSize = 1000;
  
  while (true) {
    const { data, error: fetchError } = await proSupabase
      .from('lost_pets')
      .select('id, pet_name, pet_type')
      .or('photo_url.is.null,photo_url.eq.')
      .range(offset, offset + fetchBatchSize - 1);
    
    if (fetchError) {
      console.error('Error:', fetchError.message);
      return;
    }
    
    if (!data || data.length === 0) break;
    
    petsWithoutPhotos.push(...data);
    offset += fetchBatchSize;
    console.log(`   Found ${petsWithoutPhotos.length} pets without photos...`);
    
    if (data.length < fetchBatchSize) break;
  }
  
  if (!petsWithoutPhotos || petsWithoutPhotos.length === 0) {
    console.log('✅ All pets already have photos!');
    return;
  }
  
  console.log(`Found ${petsWithoutPhotos.length} pets without photos\n`);
  
  // Step 2: Update pets with random photos
  console.log('Step 2: Adding placeholder photos...\n');
  
  let updated = 0;
  let errors = 0;
  const batchSize = 100;
  
  for (let i = 0; i < petsWithoutPhotos.length; i += batchSize) {
    const batch = petsWithoutPhotos.slice(i, i + batchSize);
    
    for (const pet of batch) {
      const photoUrl = randomPhoto(pet.pet_type || 'dog');
      
      const { error: updateError } = await proSupabase
        .from('lost_pets')
        .update({ photo_url: photoUrl })
        .eq('id', pet.id);
      
      if (updateError) {
        console.error(`   Error updating ${pet.pet_name}: ${updateError.message}`);
        errors++;
      } else {
        updated++;
      }
    }
    
    const percent = Math.round(((i + batch.length) / petsWithoutPhotos.length) * 100);
    console.log(`   Processed ${Math.min(i + batch.length, petsWithoutPhotos.length)} / ${petsWithoutPhotos.length} (${percent}%) - Updated: ${updated}, Errors: ${errors}...`);
  }
  
  // Step 3: Verify
  console.log('\nStep 3: Verifying...\n');
  const { count: totalWithPhotos } = await proSupabase
    .from('lost_pets')
    .select('*', { count: 'exact', head: true })
    .not('photo_url', 'is', null)
    .neq('photo_url', '');
  
  const { count: totalPets } = await proSupabase
    .from('lost_pets')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n✅ DONE!`);
  console.log(`   Updated: ${updated} pets`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total pets with photos: ${totalWithPhotos || 0} / ${totalPets || 0}`);
  console.log(`\n💡 "Pet of the Day" should now work!`);
}

main().catch(console.error);
