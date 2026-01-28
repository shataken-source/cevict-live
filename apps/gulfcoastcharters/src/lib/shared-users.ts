/**
 * Shared Users Helper
 * Simple utility to work with cross-platform user data
 * Extends Supabase Auth with cross-platform metadata
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Use service role for admin operations
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export interface SharedUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  home_location?: string;
  preferred_currency: string;
  notification_preferences: Record<string, any>;
  gcc_active: boolean;
  wtv_active: boolean;
  last_gcc_activity?: string;
  last_wtv_activity?: string;
  total_points: number;
  loyalty_tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  primary_platform?: 'gcc' | 'wtv';
  signup_source?: string;
  signup_platform?: 'gcc' | 'wtv';
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

/**
 * Get or create shared user record
 * Syncs with auth.users when user signs up
 */
export async function getOrCreateSharedUser(
  userId: string,
  email: string
): Promise<SharedUser | null> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured');
    return null;
  }

  // Try to get existing
  const { data: existing } = await supabaseAdmin
    .from('shared_users')
    .select('*')
    .eq('id', userId)
    .single();

  if (existing) {
    return existing as SharedUser;
  }

  // Create new shared user record
  const { data, error } = await supabaseAdmin
    .from('shared_users')
    .insert({
      id: userId,
      email,
      email_verified: false,
      gcc_active: true, // Since they're using GCC
      last_gcc_activity: new Date().toISOString(),
      signup_platform: 'gcc',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating shared user:', error);
    return null;
  }

  return data as SharedUser;
}

/**
 * Get shared user by ID
 */
export async function getSharedUser(userId: string): Promise<SharedUser | null> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured');
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('shared_users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching shared user:', error);
    return null;
  }

  return data as SharedUser;
}

/**
 * Update platform activity (when user uses a platform)
 */
export async function updatePlatformActivity(
  userId: string,
  platform: 'gcc' | 'wtv'
): Promise<boolean> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured');
    return false;
  }

  const updateData: any = {
    [`${platform}_active`]: true,
    [`last_${platform}_activity`]: new Date().toISOString(),
  };

  // Set primary platform if not set
  const user = await getSharedUser(userId);
  if (user && !user.primary_platform) {
    updateData.primary_platform = platform;
  }

  const { error } = await supabaseAdmin
    .from('shared_users')
    .update(updateData)
    .eq('id', userId);

  if (error) {
    console.error('Error updating platform activity:', error);
    return false;
  }

  return true;
}

/**
 * Update loyalty tier (calls the database function)
 */
export async function refreshLoyaltyTier(userId: string): Promise<string | null> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured');
    return null;
  }

  const { data, error } = await supabaseAdmin.rpc('update_loyalty_tier', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Error updating loyalty tier:', error);
    return null;
  }

  return data as string;
}
