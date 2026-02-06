/**
 * Utility functions for scrapers to prevent duplicate inserts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface PetToInsert {
  pet_name: string | null;
  pet_type: string;
  breed?: string | null;
  color: string;
  size?: string | null;
  age?: string | null;
  gender?: string | null;
  description?: string | null;
  photo_url?: string | null;
  location_city: string;
  location_state: string;
  location_zip?: string | null;
  location_detail?: string | null;
  date_lost?: string | null;
  date_found?: string | null;
  status: 'lost' | 'found';
  owner_name: string;
  owner_email?: string | null;
  owner_phone?: string | null;
  source_platform?: string | null;
  source_url?: string | null;
  source_post_id?: string | null;
  shelter_name?: string | null;
}

/**
 * Check if a pet already exists in the database
 * Uses the same signature as uniq_lost_pets_signature: pet_name, pet_type, location_city, location_state
 */
export async function checkPetExists(
  supabase: SupabaseClient,
  pet: PetToInsert
): Promise<boolean> {
  // Check by unique signature (matches uniq_lost_pets_signature constraint)
  const { data, error } = await supabase
    .from('lost_pets')
    .select('id')
    .eq('pet_name', pet.pet_name || '')
    .eq('pet_type', pet.pet_type)
    .eq('location_city', pet.location_city || 'Unknown')
    .eq('location_state', pet.location_state || '')
    .limit(1)
    .maybeSingle();

  if (error && !error.message.includes('PGRST')) {
    console.error('Error checking for duplicate:', error);
    // If error, assume it doesn't exist to be safe (but log it)
    return false;
  }

  return !!data;
}

/**
 * Check multiple pets for duplicates and return only new ones
 * Checks each pet individually to ensure accuracy
 */
export async function filterDuplicates(
  supabase: SupabaseClient,
  pets: PetToInsert[]
): Promise<{ newPets: PetToInsert[]; duplicates: PetToInsert[] }> {
  if (!pets.length) {
    return { newPets: [], duplicates: [] };
  }

  const newPets: PetToInsert[] = [];
  const duplicates: PetToInsert[] = [];

  // Check each pet individually (most reliable method)
  // This ensures we catch duplicates even if the unique constraint is missing
  for (const pet of pets) {
    const exists = await checkPetExists(supabase, pet);
    if (exists) {
      duplicates.push(pet);
    } else {
      newPets.push(pet);
    }
  }

  return { newPets, duplicates };
}

/**
 * Insert pets with duplicate checking
 * Returns: { inserted: number, skipped: number, errors: string[] }
 */
export async function insertPetsSafely(
  supabase: SupabaseClient,
  pets: PetToInsert[]
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  if (!pets.length) {
    return { inserted: 0, skipped: 0, errors: [] };
  }

  const { newPets, duplicates } = await filterDuplicates(supabase, pets);
  const errors: string[] = [];

  if (newPets.length === 0) {
    return { inserted: 0, skipped: duplicates.length, errors: [] };
  }

  // Add required fields with defaults
  const petsToInsert = newPets.map(pet => ({
    ...pet,
    color: pet.color || 'unknown',
    location_city: pet.location_city || 'Unknown',
    location_state: pet.location_state || 'AL',
    date_lost: pet.date_lost || (pet.status === 'lost' ? new Date().toISOString().split('T')[0] : null),
    owner_name: pet.owner_name || 'Community',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // Insert in batches to avoid overwhelming the database
  const batchSize = 100;
  let totalInserted = 0;

  for (let i = 0; i < petsToInsert.length; i += batchSize) {
    const batch = petsToInsert.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('lost_pets')
      .insert(batch)
      .select();

    if (error) {
      // If batch fails, try one by one to identify which ones fail
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        // Duplicate constraint hit - check each individually
        for (const pet of batch) {
          const exists = await checkPetExists(supabase, pet);
          if (!exists) {
            const { error: singleError } = await supabase
              .from('lost_pets')
              .insert(pet);
            
            if (!singleError) {
              totalInserted++;
            } else if (!singleError.message.includes('duplicate') && !singleError.message.includes('unique')) {
              errors.push(`Error inserting ${pet.pet_name}: ${singleError.message}`);
            }
          }
        }
      } else {
        // Other error - log and continue
        errors.push(`Batch insert error: ${error.message}`);
      }
    } else {
      totalInserted += data?.length || 0;
    }
  }

  return {
    inserted: totalInserted,
    skipped: duplicates.length,
    errors,
  };
}
