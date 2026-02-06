/**
 * Auto Database Setup
 * Local Agent runs this to automatically create all database tables
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function setupDatabase() {
  console.log('\n🔧 AUTO DATABASE SETUP STARTING...\n');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials');
    return;
  }

  try {
    // Read the schema file
    const schemaPath = join(process.cwd(), 'database-schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    console.log('📋 Applying database schema...');
    
    // Apply schema to Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: schema }),
    });

    if (!response.ok) {
      throw new Error(`Failed: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Database schema applied successfully!');
    console.log('\n📊 Created tables:');
    console.log('   • trades');
    console.log('   • trading_stats');
    console.log('   • bot_memories');
    console.log('   • market_expertise');
    console.log('   • progno_predictions');
    console.log('   • progno_results');
    console.log('   • users (with subscription_status)');
    console.log('   • subscriptions');
    console.log('   • ai_sessions');
    console.log('   • ai_actions');
    
  } catch (error: any) {
    console.error('❌ Database setup failed:', error.message);
  }
}

// Run automatically
setupDatabase();

