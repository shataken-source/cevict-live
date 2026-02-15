/**
 * Script to clear all odds cache data from Supabase
 * Run with: npx ts-node scripts/clear-odds-cache.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearOddsCache() {
  console.log('Clearing odds_cache table...')
  
  const { error } = await supabase
    .from('odds_cache')
    .delete()
    .neq('id', '') // Delete all rows
  
  if (error) {
    console.error('Error clearing odds_cache:', error)
    return
  }
  
  console.log('✅ odds_cache table cleared successfully')
}

// Also clear any other cache tables
async function clearAllCache() {
  try {
    await clearOddsCache()
    console.log('\n✅ All cache tables cleared successfully')
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}

clearAllCache()
