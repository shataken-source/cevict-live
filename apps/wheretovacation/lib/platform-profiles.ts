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
 * Get or create WTV profile
 */
export async function getOrCreateWTVProfile(userId: string): Promise<WTVProfile | null> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured');
    return null;
  }

  const { data: existing } = await supabaseAdmin
    .from('wtv_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existing) {
    return existing as WTVProfile;
  }

  // Create new profile
  const { data, error } = await supabaseAdmin
    .from('wtv_profiles')
    .insert({
      user_id: userId,
      is_property_owner: false,
      owner_verified: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating WTV profile:', error);
    return null;
  }

  return data as WTVProfile;
}

/**
 * Get WTV profile
 */
export async function getWTVProfile(userId: string): Promise<WTVProfile | null> {
  if (!supabaseAdmin) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('wtv_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    return null;
  }

  return data as WTVProfile;
}

/**
 * Update WTV profile
 */
export async function updateWTVProfile(
  userId: string,
  updates: Partial<WTVProfile>
): Promise<boolean> {
  if (!supabaseAdmin) {
    return false;
  }

  const { error } = await supabaseAdmin
    .from('wtv_profiles')
    .update(updates)
    .eq('user_id', userId);

  return !error;
}
