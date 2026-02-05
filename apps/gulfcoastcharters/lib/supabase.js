// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database helper functions
export const db = {
  // User operations
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Captain operations
  async getCaptains(filters = {}) {
    let query = supabase
      .from('captain_profiles')
      .select(`
        *,
        profiles:user_id (*)
      `)
      .eq('status', 'active')
      .eq('is_verified', true);

    if (filters.location) {
      query = query.contains('service_area', [filters.location]);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getCaptainProfile(userId) {
    const { data, error } = await supabase
      .from('captain_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Booking operations
  async createBooking(bookingData) {
    const { data, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getUserBookings(userId) {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        captain:captain_id (
          *,
          profile:user_id (full_name, avatar_url)
        ),
        boat:boat_id (*)
      `)
      .eq('user_id', userId)
      .order('booking_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getCaptainBookings(captainId) {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        user:user_id (full_name, avatar_url, email, phone),
        boat:boat_id (*)
      `)
      .eq('captain_id', captainId)
      .order('booking_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Fishing reports (community)
  async getFishingReports(limit = 20) {
    const { data, error } = await supabase
      .from('fishing_reports')
      .select(`
        *,
        user:user_id (full_name, username, avatar_url)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  async createFishingReport(reportData) {
    const { data, error } = await supabase
      .from('fishing_reports')
      .insert(reportData)
      .select()
      .single();
    
    if (error) throw error;
    
    // Award points for creating report
    await this.awardPoints(
      reportData.user_id, 
      reportData.photos?.length > 0 ? 35 : 25,
      'CREATE_FISHING_REPORT',
      'Posted fishing report'
    );
    
    return data;
  },

  // Points and gamification
  async getUserStats(userId) {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async awardPoints(userId, points, action, description) {
    const { data, error } = await supabase
      .rpc('award_points', {
        p_user_id: userId,
        p_points: points,
        p_action: action,
        p_description: description
      });
    
    if (error) throw error;
    return data;
  },

  async getLeaderboard(limit = 10) {
    const { data, error } = await supabase
      .from('user_stats')
      .select(`
        *,
        profile:user_id (full_name, username, avatar_url)
      `)
      .order('total_points', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  async getUserBadges(userId) {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badge_id (*)
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    return data;
  },

  // Reviews
  async createReview(reviewData) {
    const { data, error } = await supabase
      .from('reviews')
      .insert(reviewData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getCaptainReviews(captainId) {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:reviewer_id (full_name, avatar_url)
      `)
      .eq('captain_id', captainId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Location sharing
  async updateUserLocation(userId, locationData) {
    const { data, error } = await supabase
      .from('user_locations')
      .upsert({
        user_id: userId,
        ...locationData,
        last_updated: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getNearbyUsers(latitude, longitude, radiusKm = 10) {
    // This would use PostGIS ST_DWithin in production
    const { data, error } = await supabase
      .from('user_locations')
      .select(`
        *,
        profile:user_id (full_name, username, avatar_url, user_type)
      `)
      .eq('sharing_mode', 'public')
      .eq('is_active', true);
    
    if (error) throw error;
    return data;
  },

  // Notifications
  async getNotifications(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    return data;
  },

  async markNotificationRead(notificationId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
    
    if (error) throw error;
  }
};

// Real-time subscriptions
export const subscriptions = {
  onNewBooking(captainId, callback) {
    return supabase
      .channel('bookings')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `captain_id=eq.${captainId}`
        },
        callback
      )
      .subscribe();
  },

  onLocationUpdate(userId, callback) {
    return supabase
      .channel('locations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_locations',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  },

  onNewMessage(conversationId, callback) {
    return supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        callback
      )
      .subscribe();
  }
};

export default supabase;
