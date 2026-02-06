import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

// PROJECT 1 (current project - has 11 pets)
const PROJECT1_URL = process.env.PROJECT1_SUPABASE_URL || '';
const PROJECT1_KEY = process.env.PROJECT1_SERVICE_KEY || '';

// PROJECT 2 (rdbuwyefbgnbuhmjrizo - has 26,190 pets in pets table)
const PROJECT2_URL = process.env.PROJECT2_SUPABASE_URL || 'https://rdbuwyefbgnbuhmjrizo.supabase.co';
const PROJECT2_KEY = process.env.PROJECT2_SERVICE_KEY || '';

async function checkProject(url: string, key: string, projectName: string) {
  const supabase = createClient(url, key);
  
  console.log(`\n=== Checking ${projectName} ===`);
  
  // Check lost_pets
  const { count: lostPetsCount, error: lostError } = await supabase
    .from('lost_pets')
    .select('*', { count: 'exact', head: true });
  
  console.log(`lost_pets: ${lostPetsCount || 0} pets`);
  
  // Check pets table (if exists)
  const { count: petsCount, error: petsError } = await supabase
    .from('pets')
    .select('*', { count: 'exact', head: true });
  
  if (!petsError) {
    console.log(`pets table: ${petsCount || 0} pets`);
  }
  
  return { lostPetsCount: lostPetsCount || 0, petsCount: petsCount || 0 };
}

async function copyPetsToLostPets(sourceUrl: string, sourceKey: string, targetUrl: string, targetKey: string) {
  const sourceSupabase = createClient(sourceUrl, sourceKey);
  const targetSupabase = createClient(targetUrl, targetKey);
  
  console.log('\n=== Copying pets from pets table to lost_pets ===');
  
  // Fetch all pets from source
  const { data: pets, error: fetchError } = await sourceSupabase
    .from('pets')
    .select('*')
    .limit(50000); // Get all pets
  
  if (fetchError) {
    console.error('Error fetching pets:', fetchError);
    return;
  }
  
  if (!pets || pets.length === 0) {
    console.log('No pets found in pets table');
    return;
  }
  
  console.log(`Found ${pets.length} pets to copy`);
  
  // Transform and insert into lost_pets
  const petsToInsert = pets.map(pet => ({
    pet_name: pet.name || null,
    pet_type: pet.pet_type || 'dog',
    breed: pet.breed || null,
    description: pet.description || null,
    photo_url: pet.photo_url || null,
    status: 'lost',
    created_at: pet.created_at || new Date().toISOString(),
    updated_at: pet.updated_at || pet.created_at || new Date().toISOString(),
  }));
  
  // Insert in batches of 1000
  const batchSize = 1000;
  let totalInserted = 0;
  
  for (let i = 0; i < petsToInsert.length; i += batchSize) {
    const batch = petsToInsert.slice(i, i + batchSize);
    const { data, error } = await targetSupabase
      .from('lost_pets')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      totalInserted += batch.length;
      console.log(`Inserted ${totalInserted} / ${pets.length} pets...`);
    }
  }
  
  console.log(`\n✅ DONE: Copied ${totalInserted} pets to lost_pets`);
}

async function main() {
  console.log('=== Pet Recovery Script ===\n');
  
  // Check both projects
  const project1 = await checkProject(PROJECT1_URL, PROJECT1_KEY, 'Project 1');
  const project2 = await checkProject(PROJECT2_URL, PROJECT2_KEY, 'Project 2 (rdbuwyefbgnbuhmjrizo)');
  
  // Determine which project has the data
  if (project2.petsCount > 0) {
    console.log(`\n✅ Found ${project2.petsCount} pets in Project 2 pets table`);
    console.log('Copying to Project 2 lost_pets...');
    await copyPetsToLostPets(PROJECT2_URL, PROJECT2_KEY, PROJECT2_URL, PROJECT2_KEY);
  } else if (project1.petsCount > 0) {
    console.log(`\n✅ Found ${project1.petsCount} pets in Project 1 pets table`);
    console.log('Copying to Project 1 lost_pets...');
    await copyPetsToLostPets(PROJECT1_URL, PROJECT1_KEY, PROJECT1_URL, PROJECT1_KEY);
  } else {
    console.log('\n❌ No pets found in pets table in either project');
    console.log('Check Supabase Backups to restore data');
  }
}

main().catch(console.error);
