#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// PRO DATABASE (TARGET)
const PRO_URL = 'https://rdbuwyefbgnbuhmjrizo.supabase.co';
const PRO_KEY = process.env.PRO_KEY || process.argv[2];

if (!PRO_KEY) {
  console.error('Usage: npx tsx check-pro-storage.ts <PRO_SERVICE_KEY>');
  process.exit(1);
}

const proSupabase = createClient(PRO_URL, PRO_KEY);

async function main() {
  console.log('=== Checking PRO Database Storage ===\n');
  console.log('Database: rdbuwyefbgnbuhmjrizo\n');
  
  // Verify key
  console.log('Step 0: Verifying service role key...\n');
  const { data: testData, error: testError } = await proSupabase
    .from('lost_pets')
    .select('id')
    .limit(1);
  
  if (testError) {
    console.error('❌ Service role key is invalid!');
    console.error('   Error:', testError.message);
    return;
  }
  
  console.log('✅ Service role key is valid\n');
  
  // List buckets
  console.log('Step 1: Listing Storage buckets...\n');
  const { data: buckets, error: bucketsError } = await proSupabase.storage.listBuckets();
  
  if (bucketsError) {
    console.error('❌ Error:', bucketsError.message);
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
  
  // Check each bucket
  for (const bucket of buckets) {
    console.log(`Step 2: Checking bucket "${bucket.name}"...\n`);
    
    const { data: files } = await proSupabase.storage
      .from(bucket.name)
      .list('', { limit: 100 });
    
    if (files && files.length > 0) {
      console.log(`   ✅ Found ${files.length} file(s) (showing first 5):\n`);
      files.slice(0, 5).forEach((file, i) => {
        const publicUrl = proSupabase.storage
          .from(bucket.name)
          .getPublicUrl(file.name);
        console.log(`      ${i + 1}. ${file.name}`);
        console.log(`         URL: ${publicUrl.data.publicUrl}\n`);
      });
    } else {
      console.log(`   ❌ No files in bucket "${bucket.name}"\n`);
    }
  }
  
  console.log('✅ Check complete!');
}

main().catch(console.error);
