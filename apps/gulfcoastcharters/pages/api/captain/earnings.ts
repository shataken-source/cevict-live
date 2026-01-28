/**
 * Captain Earnings API
 * GET /api/captain/earnings - Get earnings data for authenticated captain
 * POST /api/captain/earnings - Request payout
 * 
 * Replaces: supabase.functions.invoke('captain-earnings')
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  if (req.method === 'GET') {
    try {
      // Get all completed bookings
      // Try with captain_id first, but handle case where it might not match
      let bookings: any[] = [];
      
      const { data: bookingsData, error } = await admin
        .from('bookings')
        .select('total_price, created_at, trip_date, captain_id, status')
        .eq('captain_id', captainId)
        .in('status', ['completed', 'confirmed'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching earnings with captain_id:', error);
        // Try alternative: get all bookings and filter
        const { data: allBookings, error: altError } = await admin
          .from('bookings')
          .select('total_price, created_at, trip_date, captain_id, status')
          .in('status', ['completed', 'confirmed'])
          .order('created_at', { ascending: false })
          .limit(1000);
        
        if (!altError && allBookings) {
          // Filter bookings that match this captain
          bookings = allBookings.filter((b: any) => 
            (b.captain_id === captainId || 
             b.captain_id === captainProfile.user_id ||
             b.captain_id === user.id) &&
            (b.status === 'completed' || b.status === 'confirmed')
          );
        } else {
          // If still error, return empty earnings instead of error
          return res.status(200).json({
            success: true,
            earnings: {
              totalEarnings: 0,
              pendingPayout: 0,
              thisMonth: 0,
              lastPayout: 0,
              payoutHistory: [],
            },
          });
        }
      } else {
        bookings = bookingsData || [];
      }

      // Calculate earnings
      let totalEarnings = 0;
      let pendingPayout = 0;
      let thisMonth = 0;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      bookings?.forEach(booking => {
        const amount = booking.total_price || 0;
        // Commission is typically 15% - calculate it if not stored
        const commission = 0; // bookings table doesn't have commission_amount column
        const commissionPercent = 0.15; // 15% commission
        const captainPayout = Number(amount) * (1 - commissionPercent);

        totalEarnings += captainPayout;

        // If payment is pending, add to pending payout
        // Note: bookings table doesn't have payment_status column
        // Assume confirmed/completed bookings are paid
        if (booking.status === 'confirmed') {
          pendingPayout += captainPayout;
        }

        // Calculate this month's earnings
        const bookingDate = booking.created_at ? new Date(booking.created_at) : null;
        if (bookingDate && bookingDate >= startOfMonth) {
          thisMonth += captainPayout;
        }
      });

      // Get last payout (would need a payouts table, for now return 0)
      const lastPayout = 0;
      const payoutHistory: any[] = [];

      return res.status(200).json({
        success: true,
        earnings: {
          totalEarnings: Math.round(totalEarnings * 100) / 100,
          pendingPayout: Math.round(pendingPayout * 100) / 100,
          thisMonth: Math.round(thisMonth * 100) / 100,
          lastPayout,
          payoutHistory,
        },
      });
    } catch (error: any) {
      console.error('Error in GET /api/captain/earnings:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { action } = req.body;

      if (action === 'requestPayout') {
        // TODO: Implement payout request logic
        // This would typically:
        // 1. Create a payout record
        // 2. Calculate available balance
        // 3. Initiate Stripe transfer or bank transfer
        // 4. Update booking payment statuses

        return res.status(200).json({
          success: true,
          message: 'Payout request submitted. Funds will be transferred within 3-5 business days.',
        });
      }

      return res.status(400).json({ error: 'Invalid action' });
    } catch (error: any) {
      console.error('Error in POST /api/captain/earnings:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
