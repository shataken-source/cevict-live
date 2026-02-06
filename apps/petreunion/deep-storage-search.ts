#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// Check both databases
const FREE_URL = 'https://nqkbqtiramecvmmpaxzk.supabase.co';
const PRO_URL = 'https://rdbuwyefbgnbuhmjrizo.supabase.co';

const FREE_KEY = process.env.FREE_KEY || process.argv[2];
const PRO_KEY = process.env.PRO_KEY || process.argv[3];

if (!FREE_KEY || !PRO_KEY) {
  console.error('Usage: npx tsx deep-storage-search.ts <FREE_SERVICE_KEY> <PRO_SERVICE_KEY>');
  process.exit(1);
}

const freeSupabase = createClient(FREE_URL, FREE_KEY);
const proSupabase = createClient(PRO_URL, PRO_KEY);

async function listAllFiles(supabase: any, bucketName: string, path: string = '', allFiles: any[] = []): Promise<any[]> {
  const { data: files, error } = await supabase.storage
    .from(bucketName)
    .list(path, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
  
  if (error) {
    console.error(`   Error listing ${path}:`, error.message);
    return allFiles;
  }
  
  if (!files) return allFiles;
  
  for (const file of files) {
    if (file.id) {
      // It's a file
      const fullPath = path ? `${path}/${file.name}` : file.name;
      allFiles.push({ ...file, fullPath });
    } else {
      // It's a folder, recurse
      const folderPath = path ? `${path}/${file.name}` : file.name;
      await listAllFiles(supabase, bucketName, folderPath, allFiles);
    }
  }
  
  return allFiles;
}

async function checkDatabase(supabase: any, dbName: string, tableName: string) {
  console.log(`\n=== Checking ${dbName} Database ===\n`);
  
  // Check for ANY non-null photo_url
  const { data: withPhotos, error: e1 } = await supabase
    .from(tableName)
    .select('id, photo_url')
    .not('photo_url', 'is', null)
    .neq('photo_url', '')
    .limit(100);
  
  if (!e1 && withPhotos && withPhotos.length > 0) {
    console.log(`✅ Found ${withPhotos.length} pets with photo_url in database`);
    console.log('   Sample URLs:');
    withPhotos.slice(0, 5).forEach((p: any, i: number) => {
      console.log(`   ${i + 1}. ${p.photo_url?.substring(0, 100)}`);
    });
  } else {
    console.log(`❌ No photo_url values found in ${tableName} table`);
  }
  
  // Check for photo URLs in other fields
  const { data: sample } = await supabase
    .from(tableName)
    .select('*')
    .limit(10);
  
  if (sample && sample.length > 0) {
    const fields = Object.keys(sample[0]);
    const urlFields: string[] = [];
    
    for (const pet of sample) {
      for (const field of fields) {
        const value = pet[field];
        if (value && typeof value === 'string' && value.match(/https?:\/\//)) {
          if (!urlFields.includes(field)) {
            urlFields.push(field);
          }
        }
      }
    }
    
    if (urlFields.length > 0) {
      console.log(`\n✅ Found URL-like values in fields: ${urlFields.join(', ')}`);
    }
  }
}

async function main() {
  console.log('=== DEEP STORAGE SEARCH ===\n');
  console.log('Searching ALL buckets, ALL subdirectories, ALL files...\n');
  
  // Check FREE database Storage
  console.log('=== FREE Database Storage ===\n');
  const { data: freeBuckets } = await freeSupabase.storage.listBuckets();
  
  if (freeBuckets && freeBuckets.length > 0) {
    for (const bucket of freeBuckets) {
      console.log(`\n📁 Bucket: ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
      const allFiles = await listAllFiles(freeSupabase, bucket.name);
      
      if (allFiles.length > 0) {
        console.log(`   ✅ Found ${allFiles.length} total file(s)`);
        
        // Filter for image files
        const imageFiles = allFiles.filter(f => 
          f.name.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i) ||
          f.fullPath.match(/photo|image|pet|pic/i)
        );
        
        if (imageFiles.length > 0) {
          console.log(`   🖼️  Found ${imageFiles.length} image file(s):`);
          imageFiles.slice(0, 10).forEach((file, i) => {
            const url = freeSupabase.storage
              .from(bucket.name)
              .getPublicUrl(file.fullPath);
            console.log(`      ${i + 1}. ${file.fullPath}`);
            console.log(`         ${url.data.publicUrl}`);
          });
        } else {
          console.log(`   ❌ No image files found`);
        }
      } else {
        console.log(`   ❌ Empty bucket`);
      }
    }
  }
  
  // Check PRO database Storage
  console.log('\n\n=== PRO Database Storage ===\n');
  const { data: proBuckets } = await proSupabase.storage.listBuckets();
  
  if (proBuckets && proBuckets.length > 0) {
    for (const bucket of proBuckets) {
      console.log(`\n📁 Bucket: ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
      const allFiles = await listAllFiles(proSupabase, bucket.name);
      
      if (allFiles.length > 0) {
        console.log(`   ✅ Found ${allFiles.length} total file(s)`);
        
        // Filter for image files
        const imageFiles = allFiles.filter(f => 
          f.name.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i) ||
          f.fullPath.match(/photo|image|pet|pic/i)
        );
        
        if (imageFiles.length > 0) {
          console.log(`   🖼️  Found ${imageFiles.length} image file(s):`);
          imageFiles.slice(0, 10).forEach((file, i) => {
            const url = proSupabase.storage
              .from(bucket.name)
              .getPublicUrl(file.fullPath);
            console.log(`      ${i + 1}. ${file.fullPath}`);
            console.log(`         ${url.data.publicUrl}`);
          });
        } else {
          console.log(`   ❌ No image files found`);
        }
      } else {
        console.log(`   ❌ Empty bucket`);
      }
    }
  }
  
  // Check databases for photo URLs
  await checkDatabase(freeSupabase, 'FREE', 'pets');
  await checkDatabase(proSupabase, 'PRO', 'lost_pets');
  
  console.log('\n\n✅ Deep search complete!');
}

main().catch(console.error);
