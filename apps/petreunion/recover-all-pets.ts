#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// FREE DATABASE (SOURCE - has pets table with 26,190 pets)
const FREE_URL = 'https://nqkbqtiramecvmmpaxzk.supabase.co';
const FREE_KEY = process.env.FREE_KEY || process.argv[2];

// PRO DATABASE (TARGET - where data needs to go)
const PRO_URL = 'https://rdbuwyefbgnbuhmjrizo.supabase.co';
const PRO_KEY = process.env.PRO_KEY || process.argv[3];

if (!FREE_KEY || !PRO_KEY) {
  console.error('Usage: npx tsx recover-all-pets.ts <FREE_SERVICE_KEY> <PRO_SERVICE_KEY>');
  console.error('FREE: nqkbqtiramecvmmpaxzk (source)');
  console.error('PRO: rdbuwyefbgnbuhmjrizo (target)');
  process.exit(1);
}

const freeSupabase = createClient(FREE_URL, FREE_KEY);
const proSupabase = createClient(PRO_URL, PRO_KEY);

async function main() {
  console.log('=== Pet Recovery Program ===');
  console.log('FROM: FREE (nqkbqtiramecvmmpaxzk) → TO: PRO (rdbuwyefbgnbuhmjrizo)\n');
  
  // Step 1: Check pets table in FREE database
  console.log('Step 1: Checking pets table in FREE database...');
  const { count: petsCount, error: petsError } = await freeSupabase
    .from('pets')
    .select('*', { count: 'exact', head: true });
  
  if (petsError) {
    console.error('Error:', petsError.message);
    return;
  }
  
  console.log(`Found ${petsCount || 0} pets in FREE database pets table\n`);
  
  if (!petsCount || petsCount === 0) {
    console.log('❌ No pets found in FREE database. Check Supabase Backups!');
    return;
  }
  
  // Step 2: Fetch all pets from FREE database
  console.log(`Step 2: Fetching all ${petsCount} pets from FREE database...`);
  const allPets: any[] = [];
  let offset = 0;
  const batchSize = 1000;
  
  while (true) {
    const { data, error } = await freeSupabase
      .from('pets')
      .select('*')
      .range(offset, offset + batchSize - 1);
    
    if (error) {
      console.error('Error fetching pets:', error);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    allPets.push(...data);
    offset += batchSize;
    console.log(`  Fetched ${allPets.length} / ${petsCount} pets...`);
    
    if (data.length < batchSize) break;
  }
  
  console.log(`\nStep 3: Copying ${allPets.length} pets to PRO database lost_pets table...\n`);
  
  // Step 3: Transform and insert into PRO database
  // Use created_at as date_lost if available, otherwise use today
  const defaultDateLost = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
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
  
  const petsToInsert = allPets.map(pet => {
    const createdDate = pet.created_at ? new Date(pet.created_at).toISOString().split('T')[0] : defaultDateLost;
    const petType = pet.pet_type || pet.type || 'dog';
    
    return {
      pet_name: pet.name || null,
      pet_type: petType,
      breed: pet.breed || null,
      color: pet.color || 'unknown', // Required field
      size: pet.size || null,
      date_lost: pet.date_lost ? new Date(pet.date_lost).toISOString().split('T')[0] : createdDate, // Required field
      location_city: pet.location_city || 'Unknown', // Required field
      location_state: pet.location_state || 'AL', // Required field (default to AL)
      location_zip: pet.location_zip || null,
      location_detail: pet.location_detail || null,
      description: pet.description || null,
      // Assign random placeholder photo if source has no photo
      photo_url: pet.photo_url || pet.image_url || randomPhoto(petType),
      age: pet.age || null,
      gender: pet.gender || null,
      owner_name: pet.owner_name || 'Community', // Required field
      owner_email: pet.owner_email || null,
      owner_phone: pet.owner_phone || null,
      status: 'lost',
      created_at: pet.created_at || new Date().toISOString(),
      updated_at: pet.updated_at || pet.created_at || new Date().toISOString(),
    };
  });
  
  // Step 4: Insert into PRO database in batches (skip duplicates)
  let totalInserted = 0;
  let totalSkipped = 0;
  const insertBatchSize = 100; // Smaller batches to handle duplicates better
  
  for (let i = 0; i < petsToInsert.length; i += insertBatchSize) {
    const batch = petsToInsert.slice(i, i + insertBatchSize);
    
    // Try batch insert first
    const { data, error } = await proSupabase
      .from('lost_pets')
      .insert(batch)
      .select();
    
    if (error) {
      // If batch fails due to duplicates, insert one by one
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        let batchInserted = 0;
        
        for (const pet of batch) {
          const { error: singleError } = await proSupabase
            .from('lost_pets')
            .insert(pet);
          
          if (!singleError) {
            batchInserted++;
          } else if (!singleError.message.includes('duplicate') && !singleError.message.includes('unique')) {
            // Log non-duplicate errors
            console.error(`    Error inserting pet ${pet.pet_name}:`, singleError.message);
          }
        }
        
        totalInserted += batchInserted;
        totalSkipped += (batch.length - batchInserted);
      } else {
        console.error(`  Error in batch ${Math.floor(i / insertBatchSize) + 1}:`, error.message);
        totalSkipped += batch.length;
      }
    } else {
      totalInserted += data?.length || 0;
    }
    
    const percent = Math.round(((i + batch.length) / petsToInsert.length) * 100);
    console.log(`  Processed ${Math.min(i + batch.length, petsToInsert.length)} / ${petsToInsert.length} (${percent}%) - Inserted: ${totalInserted}, Skipped: ${totalSkipped}...`);
  }
  
  // Step 5: Verify in PRO database
  console.log('\nStep 4: Verifying in PRO database...');
  const { count: finalCount } = await proSupabase
    .from('lost_pets')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n✅ DONE!`);
  console.log(`   Inserted: ${totalInserted} new pets`);
  console.log(`   Skipped: ${totalSkipped} duplicates`);
  console.log(`   Total in PRO lost_pets: ${finalCount || 0}`);
}

main().catch(console.error);
