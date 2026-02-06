#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// FREE DATABASE (SOURCE)
const FREE_URL = 'https://nqkbqtiramecvmmpaxzk.supabase.co';
const FREE_KEY = process.env.FREE_KEY || process.argv[2];

if (!FREE_KEY) {
  console.error('Usage: npx tsx check-storage-buckets.ts <FREE_SERVICE_KEY>');
  process.exit(1);
}

const freeSupabase = createClient(FREE_URL, FREE_KEY);

async function main() {
  console.log('=== Checking Supabase Storage ===\n');
  console.log('Database: nqkbqtiramecvmmpaxzk\n');
  
  // First, verify the key works by checking a simple query
  console.log('Step 0: Verifying service role key...\n');
  const { data: testData, error: testError } = await freeSupabase
    .from('pets')
    .select('id')
    .limit(1);
  
  if (testError) {
    console.error('❌ Service role key is invalid or incorrect!');
    console.error('   Error:', testError.message);
    console.error('\n💡 Make sure you copied the FULL service_role key from:');
    console.error('   Supabase Dashboard → Settings → API → service_role (secret)');
    console.error('   It should start with "eyJ..." and be very long');
    return;
  }
  
  console.log('✅ Service role key is valid\n');
  
  // List all buckets
  console.log('Step 1: Listing all Storage buckets...\n');
  const { data: buckets, error: bucketsError } = await freeSupabase.storage.listBuckets();
  
  if (bucketsError) {
    console.error('❌ Error listing buckets:', bucketsError.message);
    console.error('\n💡 This might mean:');
    console.error('   1. Storage is not enabled in this project');
    console.error('   2. The service role key doesn\'t have Storage permissions');
    console.error('   3. Check Storage manually in dashboard:');
    console.error('      https://supabase.com/dashboard/project/nqkbqtiramecvmmpaxzk/storage/buckets');
    return;
  }
  
  if (!buckets || buckets.length === 0) {
    console.log('❌ No Storage buckets found');
    return;
  }
  
  console.log(`✅ Found ${buckets.length} bucket(s):\n`);
  buckets.forEach((bucket, i) => {
    console.log(`   ${i + 1}. ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
  });
  console.log('');
  
  // Check each bucket for files
  for (const bucket of buckets) {
    console.log(`Step 2: Checking bucket "${bucket.name}" for files...\n`);
    
    const { data: files, error: filesError } = await freeSupabase.storage
      .from(bucket.name)
      .list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (filesError) {
      console.error(`   Error listing files: ${filesError.message}\n`);
      continue;
    }
    
    if (!files || files.length === 0) {
      console.log(`   ❌ No files in bucket "${bucket.name}"\n`);
      continue;
    }
    
    console.log(`   ✅ Found ${files.length} file(s) (showing first 10):\n`);
    
    // Show first 10 files
    files.slice(0, 10).forEach((file, i) => {
      const publicUrl = freeSupabase.storage
        .from(bucket.name)
        .getPublicUrl(file.name);
      
      console.log(`      ${i + 1}. ${file.name}`);
      console.log(`         URL: ${publicUrl.data.publicUrl}`);
      console.log(`         Size: ${(file.metadata?.size || 0) / 1024} KB`);
      console.log('');
    });
    
    // Count total files
    const { data: allFiles } = await freeSupabase.storage
      .from(bucket.name)
      .list('', { limit: 1000 });
    
    if (allFiles) {
      console.log(`   📊 Total files in bucket: ${allFiles.length}\n`);
    }
  }
  
  // Check if there's a pattern for pet photos
  console.log('Step 3: Looking for pet photo patterns...\n');
  
  for (const bucket of buckets) {
    const { data: files } = await freeSupabase.storage
      .from(bucket.name)
      .list('', { limit: 100 });
    
    if (files && files.length > 0) {
      // Check if files look like pet photos
      const photoFiles = files.filter(f => 
        f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
        f.name.match(/pet|photo|image/i)
      );
      
      if (photoFiles.length > 0) {
        console.log(`   ✅ Found ${photoFiles.length} potential photo files in "${bucket.name}"`);
        console.log(`      Sample: ${photoFiles[0].name}\n`);
        
        // Show how to construct URL
        const sampleUrl = freeSupabase.storage
          .from(bucket.name)
          .getPublicUrl(photoFiles[0].name);
        console.log(`      Sample URL: ${sampleUrl.data.publicUrl}\n`);
      }
    }
  }
  
  console.log('✅ Storage check complete!');
  console.log('\n💡 If photos are in Storage, you need to:');
  console.log('   1. Update photo_url in pets table to point to Storage URLs');
  console.log('   2. Or update recover-all-pets.ts to construct Storage URLs');
}

main().catch(console.error);
