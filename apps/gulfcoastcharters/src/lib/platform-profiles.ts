/**
 * Platform Profiles Helper
 * Simple utility to work with platform-specific user profiles
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export interface GCCProfile {
  user_id: string;
  is_captain: boolean;
  captain_verified: boolean;
  vessel_count: number;
  total_bookings: number;
  total_reviews_received: number;
  average_rating?: number;
  captain_rating?: number;
  specialties: string[];
  created_at: string;
  updated_at: string;
}

export interface WTVProfile {
  user_id: string;
  is_property_owner: boolean;
  owner_verified: boolean;
  property_count: number;
  total_bookings: number;
  total_reviews_received: number;
  average_rating?: number;
  travel_preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Get or create GCC profile
 */
export async function getOrCreateGCCProfile(userId: string): Promise<GCCProfile | null> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured');
    return null;
  }

  const { data: existing } = await supabaseAdmin
    .from('gcc_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existing) {
    return existing as GCCProfile;
  }

  // Create new profile
  const { data, error } = await supabaseAdmin
    .from('gcc_profiles')
    .insert({
      user_id: userId,
      is_captain: false,
      captain_verified: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating GCC profile:', error);
    return null;
  }

  return data as GCCProfile;
}

/**
 * Get GCC profile
 */
export async function getGCCProfile(userId: string): Promise<GCCProfile | null> {
  if (!supabaseAdmin) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('gcc_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    return null;
  }

  return data as GCCProfile;
}

/**
 * Update GCC profile
 */
export async function updateGCCProfile(
  userId: string,
  updates: Partial<GCCProfile>
): Promise<boolean> {
  if (!supabaseAdmin) {
    return false;
  }

  const { error } = await supabaseAdmin
    .from('gcc_profiles')
    .update(updates)
    .eq('user_id', userId);

  return !error;
}
