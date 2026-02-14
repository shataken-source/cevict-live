/**
 * Database schema validation and utilities
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Database indexes for performance
 */
export const REQUIRED_INDEXES = [
  {
    table: 'lost_pets',
    columns: ['status', 'pet_type', 'location_state', 'created_at'],
    name: 'idx_lost_pets_status_type_state'
  },
  {
    table: 'lost_pets',
    columns: ['pet_name', 'breed'],
    name: 'idx_lost_pets_search'
  },
  {
    table: 'lost_pets',
    columns: ['location_city', 'location_state'],
    name: 'idx_lost_pets_location'
  },
  {
    table: 'pet_matches',
    columns: ['match_score', 'status'],
    name: 'idx_pet_matches_score_status'
  },
  {
    table: 'pet_matches',
    columns: ['lost_pet_id', 'found_pet_id'],
    name: 'idx_pet_matches_pets'
  }
];

/**
 * Create database indexes (run once)
 */
export async function createIndexes(): Promise<{ success: boolean; errors: string[] }> {
  if (!supabase) {
    return { success: false, errors: ['Database not configured'] };
  }
  
  const errors: string[] = [];
  
  // Note: In Supabase, indexes are typically created via SQL migrations
  // This function is for reference/documentation
  console.log('[DATABASE] Indexes should be created via SQL migrations');
  console.log('[DATABASE] Required indexes:', REQUIRED_INDEXES);
  
  return { success: true, errors };
}

/**
 * Validate database connection
 */
export async function validateDatabaseConnection(): Promise<boolean> {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('lost_pets')
      .select('id')
      .limit(1);
    
    return !error;
  } catch {
    return false;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  totalPets: number;
  lostPets: number;
  foundPets: number;
  reunitedPets: number;
  totalMatches: number;
  lastUpdated: string;
}> {
  if (!supabase) {
    throw new Error('Database not configured');
  }
  
  const petsResult = await supabase.from('lost_pets').select('status', { count: 'exact', head: true });
  
  let matchesResult: { count: number | null } = { count: 0 };
  try {
    const result = await supabase.from('pet_matches').select('id', { count: 'exact', head: true });
    matchesResult = { count: result.count || 0 };
  } catch {
    // Table might not exist - that's okay
    matchesResult = { count: 0 };
  }
  
  // Get detailed counts
  const { data: allPets } = await supabase
    .from('lost_pets')
    .select('status');
  
  const stats = {
    totalPets: allPets?.length || 0,
    lostPets: allPets?.filter(p => p.status === 'lost').length || 0,
    foundPets: allPets?.filter(p => p.status === 'found').length || 0,
    reunitedPets: allPets?.filter(p => p.status === 'reunited').length || 0,
    totalMatches: matchesResult.count || 0,
    lastUpdated: new Date().toISOString()
  };
  
  return stats;
}

/**
 * Database transaction wrapper
 */
export async function withTransaction<T>(
  operations: (client: typeof supabase) => Promise<T>
): Promise<T> {
  if (!supabase) {
    throw new Error('Database not configured');
  }
  
  // Note: Supabase doesn't support explicit transactions in the client
  // This is a placeholder for transaction logic
  // In production, use Supabase Edge Functions or RPC for transactions
  
  try {
    return await operations(supabase);
  } catch (error) {
    // Rollback would happen here in a real transaction
    throw error;
  }
}

