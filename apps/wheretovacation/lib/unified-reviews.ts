/**
 * Unified Reviews Helper
 * Simple utility to create and manage cross-platform reviews
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export type UnifiedReviewType = 'wtv_property' | 'wtv_booking' | 'gcc_vessel' | 'gcc_booking' | 'gcc_captain' | 'package';

export interface UnifiedReview {
  id: string;
  user_id: string;
  review_type: UnifiedReviewType;
  
  // WTV references
  wtv_booking_id?: string;
  wtv_property_id?: string;
  
  // GCC references
  gcc_booking_id?: string;
  gcc_vessel_id?: string;
  gcc_captain_id?: string;
  
  // Unified booking
  unified_booking_id?: string;
  
  // Review content
  rating: number;
  title?: string;
  content?: string;
  
  // Specific ratings
  communication_rating?: number;
  value_rating?: number;
  cleanliness_rating?: number;
  location_rating?: number;
  experience_rating?: number;
  
  // Photos
  photos: string[];
  
  // Response
  owner_response?: string;
  owner_response_at?: string;
  
  // Status
  status: 'pending' | 'approved' | 'hidden' | 'rejected';
  platform: 'gcc' | 'wtv' | 'both';
  
  created_at: string;
  updated_at: string;
}

/**
 * Create a unified review
 */
export async function createUnifiedReview(
  userId: string,
  reviewData: {
    review_type: UnifiedReviewType;
    platform: 'gcc' | 'wtv' | 'both';
    rating: number;
    title?: string;
    content?: string;
    wtv_property_id?: string;
    wtv_booking_id?: string;
    gcc_vessel_id?: string;
    gcc_booking_id?: string;
    gcc_captain_id?: string;
    unified_booking_id?: string;
    communication_rating?: number;
    value_rating?: number;
    cleanliness_rating?: number;
    location_rating?: number;
    experience_rating?: number;
    photos?: string[];
  }
): Promise<UnifiedReview | null> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured');
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('unified_reviews')
    .insert({
      user_id: userId,
      review_type: reviewData.review_type,
      platform: reviewData.platform,
      rating: reviewData.rating,
      title: reviewData.title,
      content: reviewData.content,
      wtv_property_id: reviewData.wtv_property_id,
      wtv_booking_id: reviewData.wtv_booking_id,
      gcc_vessel_id: reviewData.gcc_vessel_id,
      gcc_booking_id: reviewData.gcc_booking_id,
      gcc_captain_id: reviewData.gcc_captain_id,
      unified_booking_id: reviewData.unified_booking_id,
      communication_rating: reviewData.communication_rating,
      value_rating: reviewData.value_rating,
      cleanliness_rating: reviewData.cleanliness_rating,
      location_rating: reviewData.location_rating,
      experience_rating: reviewData.experience_rating,
      photos: reviewData.photos || [],
      status: 'pending', // Auto-approve or require moderation
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating unified review:', error);
    return null;
  }

  return data as UnifiedReview;
}

/**
 * Get unified review by ID
 */
export async function getUnifiedReview(reviewId: string): Promise<UnifiedReview | null> {
  if (!supabaseAdmin) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('unified_reviews')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (error) {
    return null;
  }

  return data as UnifiedReview;
}

/**
 * Get reviews for a property/vessel/captain
 */
export async function getReviewsForEntity(
  reviewType: UnifiedReviewType,
  options: {
    wtv_property_id?: string;
    gcc_vessel_id?: string;
    gcc_captain_id?: string;
    status?: 'approved' | 'pending' | 'all';
  }
): Promise<UnifiedReview[]> {
  if (!supabaseAdmin) {
    return [];
  }

  let query = supabaseAdmin
    .from('unified_reviews')
    .select('*')
    .eq('review_type', reviewType);

  if (options.wtv_property_id) {
    query = query.eq('wtv_property_id', options.wtv_property_id);
  }
  if (options.gcc_vessel_id) {
    query = query.eq('gcc_vessel_id', options.gcc_vessel_id);
  }
  if (options.gcc_captain_id) {
    query = query.eq('gcc_captain_id', options.gcc_captain_id);
  }

  if (options.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return [];
  }

  return (data || []) as UnifiedReview[];
}

/**
 * Get average rating using SQL function
 */
export async function getAverageRating(
  reviewType: UnifiedReviewType,
  options: {
    wtv_property_id?: string;
    gcc_vessel_id?: string;
    gcc_captain_id?: string;
  }
): Promise<number> {
  if (!supabaseAdmin) {
    return 0;
  }

  const { data, error } = await supabaseAdmin.rpc('get_average_rating', {
    p_review_type: reviewType,
    p_wtv_property_id: options.wtv_property_id || null,
    p_gcc_vessel_id: options.gcc_vessel_id || null,
    p_gcc_captain_id: options.gcc_captain_id || null,
  });

  if (error) {
    console.error('Error getting average rating:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Get review count using SQL function
 */
export async function getReviewCount(
  reviewType: UnifiedReviewType,
  options: {
    wtv_property_id?: string;
    gcc_vessel_id?: string;
    gcc_captain_id?: string;
  }
): Promise<number> {
  if (!supabaseAdmin) {
    return 0;
  }

  const { data, error } = await supabaseAdmin.rpc('get_review_count', {
    p_review_type: reviewType,
    p_wtv_property_id: options.wtv_property_id || null,
    p_gcc_vessel_id: options.gcc_vessel_id || null,
    p_gcc_captain_id: options.gcc_captain_id || null,
  });

  if (error) {
    console.error('Error getting review count:', error);
    return 0;
  }

  return data || 0;
}
