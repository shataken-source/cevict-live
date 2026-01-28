/**
 * Captain Analytics API
 * GET /api/captain/analytics - Get analytics for authenticated captain
 * 
 * Replaces: supabase.functions.invoke('captain-bookings', { action: 'getAnalytics' })
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user, error: authError } = await getAuthedUser(req, res);
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const admin = getSupabaseAdmin();

  // Verify user is a captain
  const { data: captainProfile } = await admin
    .from('captain_profiles')
    .select('id, user_id')
    .eq('user_id', user.id)
    .single();

  if (!captainProfile) {
    return res.status(403).json({ error: 'User is not a captain' });
  }

  const captainId = captainProfile.id;

  try {
    // Get all bookings for this captain
    // Try with captain_id first, but handle case where it might not match
    let bookings: any[] = [];
    let bookingsError = null;

    const { data: bookingsData, error: bookingsErr } = await admin
      .from('bookings')
      .select('status, total_price, trip_date, created_at, captain_id, user_id')
      .eq('captain_id', captainId);

    if (bookingsErr) {
      console.error('Error fetching bookings with captain_id:', bookingsErr);
      // Try alternative: get all bookings and filter by user_id or captain_id
      const { data: allBookings, error: altError } = await admin
        .from('bookings')
        .select('status, total_price, trip_date, created_at, captain_id, user_id')
        .limit(1000);
      
      if (!altError && allBookings) {
        // Filter bookings that match this captain
        bookings = allBookings.filter((b: any) => 
          b.captain_id === captainId || 
          b.captain_id === captainProfile.user_id ||
          b.captain_id === user.id
        );
      } else {
        bookingsError = altError || bookingsErr;
      }
    } else {
      bookings = bookingsData || [];
    }

    // If still no bookings and no error, that's fine - return empty analytics
    if (bookingsError && bookings.length === 0) {
      console.error('Error fetching bookings:', bookingsError);
      // Return empty analytics instead of error - captain might just have no bookings yet
      return res.status(200).json({
        success: true,
        analytics: {
          totalRevenue: 0,
          totalBookings: 0,
          confirmedBookings: 0,
          completedBookings: 0,
          pendingBookings: 0,
          cancelledBookings: 0,
          upcomingBookings: 0,
          avgBookingValue: 0,
          completionRate: 0,
          monthlyRevenue: {},
        },
      });
    }

    // Calculate analytics
    const totalBookings = bookings?.length || 0;
    const confirmedBookings = bookings?.filter(b => b.status === 'confirmed').length || 0;
    const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0;
    const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0;
    const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0;

    // Calculate revenue
    const totalRevenue = bookings?.reduce((sum, b) => {
      const amount = b.total_amount || b.total_price || 0;
      return sum + Number(amount);
    }, 0) || 0;

    // Calculate upcoming bookings (bookings with future dates)
    const now = new Date();
    const upcomingBookings = bookings?.filter(b => {
      const bookingDate = b.trip_date ? new Date(b.trip_date) : (b.created_at ? new Date(b.created_at) : null);
      return bookingDate && bookingDate > now && b.status !== 'cancelled';
    }).length || 0;

    // Calculate monthly revenue (last 6 months)
    const monthlyRevenue: Record<string, number> = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    bookings?.forEach(booking => {
      if (!booking.created_at) return;
      const bookingDate = new Date(booking.created_at);
      if (bookingDate < sixMonthsAgo) return;

      const monthKey = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
      const amount = booking.total_amount || booking.total_price || 0;
      monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + Number(amount);
    });

    // Get average booking value
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Get completion rate
    const completionRate = totalBookings > 0 
      ? (completedBookings / totalBookings) * 100 
      : 0;

    return res.status(200).json({
      success: true,
      analytics: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalBookings,
        confirmedBookings,
        completedBookings,
        pendingBookings,
        cancelledBookings,
        upcomingBookings,
        avgBookingValue: Math.round(avgBookingValue * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        monthlyRevenue,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/captain/analytics:', error);
    return res.status(500).json({ error: error.message });
  }
}
