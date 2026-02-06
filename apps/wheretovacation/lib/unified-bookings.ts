/**
 * Unified Bookings Helper
 * Simple utility to create and manage cross-platform bookings
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export interface UnifiedBooking {
  id: string;
  user_id: string;
  booking_type: 'package' | 'rental_only' | 'boat_only';
  
  // WTV data
  wtv_booking_id?: string;
  wtv_property_id?: string;
  wtv_check_in?: string;
  wtv_check_out?: string;
  wtv_guests?: number;
  wtv_nights?: number;
  wtv_total?: number;
  
  // GCC data
  gcc_booking_id?: string;
  gcc_vessel_id?: string;
  gcc_trip_date?: string;
  gcc_duration_hours?: number;
  gcc_passengers?: number;
  gcc_total?: number;
  
  // Pricing
  wtv_subtotal: number;
  gcc_subtotal: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  
  // Package
  is_package: boolean;
  package_discount_percent: number;
  
  // Payment
  payment_status: string;
  stripe_payment_intent_id?: string;
  stripe_session_id?: string;
  
  // Status
  status: string;
  confirmation_code?: string;
  notes?: string;
  
  created_at: string;
  updated_at: string;
}

/**
 * Create a unified booking
 * Simple version - just creates the record
 */
export async function createUnifiedBooking(
  userId: string,
  bookingData: {
    booking_type: 'package' | 'rental_only' | 'boat_only';
    wtv_data?: {
      property_id?: string;
      check_in?: string;
      check_out?: string;
      guests?: number;
      nights?: number;
      total?: number;
    };
    gcc_data?: {
      vessel_id?: string;
      trip_date?: string;
      duration_hours?: number;
      passengers?: number;
      total?: number;
    };
    package_discount_percent?: number;
  }
): Promise<UnifiedBooking | null> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured');
    return null;
  }

  // Calculate subtotals
  const wtvSubtotal = bookingData.wtv_data?.total || 0;
  const gccSubtotal = bookingData.gcc_data?.total || 0;
  const subtotal = wtvSubtotal + gccSubtotal;

  // Calculate discount if package
  const isPackage = bookingData.booking_type === 'package' && wtvSubtotal > 0 && gccSubtotal > 0;
  const discountPercent = isPackage ? (bookingData.package_discount_percent || 15) : 0;
  const discountAmount = isPackage ? (subtotal * discountPercent / 100) : 0;
  const totalAmount = subtotal - discountAmount;

  // Generate confirmation code
  const { data: codeData } = await supabaseAdmin.rpc('generate_unified_booking_code');
  const confirmationCode = codeData || `GCWV-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const { data, error } = await supabaseAdmin
    .from('unified_bookings')
    .insert({
      user_id: userId,
      booking_type: bookingData.booking_type,
      
      // WTV data
      wtv_property_id: bookingData.wtv_data?.property_id,
      wtv_check_in: bookingData.wtv_data?.check_in,
      wtv_check_out: bookingData.wtv_data?.check_out,
      wtv_guests: bookingData.wtv_data?.guests,
      wtv_nights: bookingData.wtv_data?.nights,
      wtv_total: wtvSubtotal,
      
      // GCC data
      gcc_vessel_id: bookingData.gcc_data?.vessel_id,
      gcc_trip_date: bookingData.gcc_data?.trip_date,
      gcc_duration_hours: bookingData.gcc_data?.duration_hours,
      gcc_passengers: bookingData.gcc_data?.passengers,
      gcc_total: gccSubtotal,
      
      // Pricing
      wtv_subtotal: wtvSubtotal,
      gcc_subtotal: gccSubtotal,
      subtotal,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      
      // Package
      is_package: isPackage,
      package_discount_percent: discountPercent,
      
      // Status
      status: 'pending',
      confirmation_code: confirmationCode,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating unified booking:', error);
    return null;
  }

  return data as UnifiedBooking;
}

/**
 * Get unified booking by ID
 */
export async function getUnifiedBooking(bookingId: string): Promise<UnifiedBooking | null> {
  if (!supabaseAdmin) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('unified_bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (error) {
    return null;
  }

  return data as UnifiedBooking;
}

/**
 * Get user's unified bookings
 */
export async function getUserUnifiedBookings(userId: string): Promise<UnifiedBooking[]> {
  if (!supabaseAdmin) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('unified_bookings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }

  return (data || []) as UnifiedBooking[];
}
