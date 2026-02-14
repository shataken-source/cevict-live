import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log('📄 Found .env.local');
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} else {
  console.log('❌ .env.local file not found!');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n🔍 Checking Configuration...');
console.log(`   URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`   Key: ${supabaseKey ? '✅ Set' : '❌ Missing'}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ ERROR: Missing Supabase environment variables.');
  console.log('   Please create .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('\n🔌 Connecting to Supabase...');
  
  // 1. Check Connection (basic query)
  const { data, error: connError } = await supabase.from('shelters').select('count', { count: 'exact', head: true });
  
  if (connError && connError.code !== '42P01') { // 42P01 is table missing, which means connection worked
    console.error('❌ Connection Failed:', connError.message);
    return;
  }
  console.log('✅ Connected to Supabase');

  // 2. Check lost_pets table
  console.log('\n📋 Checking lost_pets table...');
  const { error: tableError } = await supabase.from('lost_pets').select('count', { count: 'exact', head: true });

  if (tableError) {
    if (tableError.code === '42P01') {
      console.error('❌ Table "lost_pets" DOES NOT EXIST.');
      console.log('\n🛠️  SOLUTION: Run the SQL migration script provided in the output.');
    } else {
      console.error('❌ Error checking table:', tableError.message);
    }
  } else {
    console.log('✅ Table "lost_pets" exists and is accessible.');
  }
}

checkDatabase();













