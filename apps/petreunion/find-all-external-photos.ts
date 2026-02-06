#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// PRO DATABASE (TARGET)
const PRO_URL = 'https://rdbuwyefbgnbuhmjrizo.supabase.co';
const PRO_KEY = process.env.PRO_KEY || process.argv[2];

if (!PRO_KEY) {
  console.error('Usage: npx tsx find-all-external-photos.ts <PRO_SERVICE_KEY>');
  process.exit(1);
}

const proSupabase = createClient(PRO_URL, PRO_KEY);

async function main() {
  console.log('=== Finding ALL Pets with External Photo URLs ===\n');
  console.log('Database: rdbuwyefbgnbuhmjrizo (PRO)\n');
  
  // Get ALL pets with ANY photo_url (not null, not empty)
  console.log('Step 1: Finding all pets with photo_url...\n');
  
  let allPetsWithPhotos: any[] = [];
  let offset = 0;
  const batchSize = 1000;
  
  while (true) {
    const { data, error } = await proSupabase
      .from('lost_pets')
      .select('id, pet_name, pet_type, photo_url')
      .not('photo_url', 'is', null)
      .neq('photo_url', '')
      .range(offset, offset + batchSize - 1);
    
    if (error) {
      console.error('Error:', error.message);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    allPetsWithPhotos.push(...data);
    offset += batchSize;
    console.log(`   Found ${allPetsWithPhotos.length} pets with photos...`);
    
    if (data.length < batchSize) break;
  }
  
  console.log(`\n✅ Total pets with photo_url: ${allPetsWithPhotos.length}\n`);
  
  if (allPetsWithPhotos.length === 0) {
    console.log('❌ No pets with photos found');
    return;
  }
  
  // Categorize by source
  console.log('Step 2: Categorizing photo sources...\n');
  
  const sources: Record<string, number> = {};
  const sampleUrls: Record<string, string[]> = {};
  
  for (const pet of allPetsWithPhotos) {
    const url = pet.photo_url;
    if (!url) continue;
    
    let source = 'unknown';
    if (url.includes('adoptapet.com')) source = 'adoptapet.com';
    else if (url.includes('dog.ceo')) source = 'dog.ceo';
    else if (url.includes('thecatapi.com')) source = 'thecatapi.com';
    else if (url.includes('supabase.co/storage')) source = 'supabase-storage';
    else if (url.includes('placeholder')) source = 'placeholder';
    else if (url.match(/https?:\/\//)) source = 'external';
    
    sources[source] = (sources[source] || 0) + 1;
    if (!sampleUrls[source] || sampleUrls[source].length < 3) {
      if (!sampleUrls[source]) sampleUrls[source] = [];
      sampleUrls[source].push(url);
    }
  }
  
  console.log('📊 Photo sources:');
  for (const [source, count] of Object.entries(sources).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${source}: ${count} pets`);
    if (sampleUrls[source]) {
      sampleUrls[source].forEach((url, i) => {
        console.log(`      ${i + 1}. ${url.substring(0, 100)}...`);
      });
    }
  }
  
  // Check total pets
  const { count: totalPets } = await proSupabase
    .from('lost_pets')
    .select('*', { count: 'exact', head: true });
  
  const { count: petsWithoutPhotos } = await proSupabase
    .from('lost_pets')
    .select('*', { count: 'exact', head: true })
    .or('photo_url.is.null,photo_url.eq.');
  
  console.log(`\n📈 Summary:`);
  console.log(`   Total pets: ${totalPets || 0}`);
  console.log(`   Pets with photos: ${allPetsWithPhotos.length}`);
  console.log(`   Pets without photos: ${petsWithoutPhotos || 0}`);
  console.log(`   Percentage with photos: ${totalPets ? ((allPetsWithPhotos.length / totalPets) * 100).toFixed(2) : 0}%`);
  
  console.log('\n✅ Analysis complete!');
}

main().catch(console.error);
