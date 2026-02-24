/**
 * Captain Bookings API
 * GET /api/captain/bookings - Get bookings for authenticated captain
 * POST /api/captain/bookings - Update booking status/notes
 *
 * Replaces: supabase.functions.invoke('captain-bookings')
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

// Helper function to format bookings with customer info
async function formatBookings(bookings: any[], admin: any) {
  const userIds = [...new Set(bookings.map(b => b.user_id).filter(Boolean))];

  // Get customer info from profiles or shared_users
  let customerMap: Record<string, any> = {};

  if (userIds.length > 0) {
    try {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, email, full_name, phone')
        .in('id', userIds);

      if (profiles) {
        profiles.forEach((p: any) => {
          customerMap[p.id] = p;
        });
      }
    } catch (err) {
      console.log('Error fetching profiles, trying shared_users:', err);
    }

    // Also try shared_users
    try {
      const { data: sharedUsers } = await admin
        .from('shared_users')
        .select('id, email, first_name, last_name')
        .in('id', userIds);

      if (sharedUsers) {
        sharedUsers.forEach((u: any) => {
          if (!customerMap[u.id]) {
            customerMap[u.id] = {
              id: u.id,
              email: u.email,
              full_name: u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email,
            };
          }
        });
      }
    } catch (err) {
      console.log('Error fetching shared_users:', err);
    }
  }

  return bookings.map((booking: any) => {
    const customer = customerMap[booking.user_id] || {};

    return {
      id: booking.id,
      charterName: booking.trip_type || booking.charter_name || 'Charter',
      customerName: customer.full_name || booking.customer_name || 'Customer',
      customerEmail: customer.email || booking.customer_email || '',
      customerPhone: customer.phone || booking.customer_phone || '',
      bookingDate: booking.booking_date || booking.trip_date,
      bookingTime: booking.start_time || booking.departure_time || '',
      guests: booking.number_of_guests || booking.passenger_count || 0,
      totalPrice: booking.total_price || booking.total_amount || 0,
      status: booking.status || 'pending',
      notes: booking.special_requests || booking.notes || '',
      reminderSent: booking.reminder_sent || false,
    };
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { user, error: authError } = await getAuthedUser(req, res);

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const admin = getSupabaseAdmin();

  // Verify user is a captain and get captain_id
  // Note: bookings table may use captain_id from captain_profiles.id OR captains.id
  // We need to find which one is used in the bookings table
  const { data: captainProfile } = await admin
    .from('captain_profiles')
    .select('id, user_id')
    .eq('user_id', user.id)
    .single();

  if (!captainProfile) {
    return res.status(403).json({ error: 'User is not a captain' });
  }

  // Collect ALL possible captain IDs for this user (captain_profiles.id, captains.id, user.id)
  // so ownership checks work regardless of which FK the bookings table uses.
  const myCaptainIds: string[] = [captainProfile.id];
  let captainId = captainProfile.id;

  try {
    const { data: captainRecord } = await admin
      .from('captains')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (captainRecord) {
      myCaptainIds.push(captainRecord.id);
      captainId = captainRecord.id; // prefer captains table id
    }
  } catch (err) {
    // captains table might not exist, use captain_profiles.id
    console.log('Using captain_profiles.id for captain_id');
  }

  if (req.method === 'GET') {
    try {
      const { status, startDate, endDate } = req.query;

      // Build query - try to get customer info from profiles or shared_users
      // First try direct query with captain_id
      let query = admin
        .from('bookings')
        .select('*')
        .eq('captain_id', captainId)
        .order('trip_date', { ascending: false })
        .order('created_at', { ascending: false });

      // If that doesn't work, try with captain_profiles relationship
      // (Some schemas might have bookings.captain_id = captain_profiles.id)
      // We'll handle customer info separately

      // Apply filters
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (startDate) {
        query = query.or(`trip_date.gte.${startDate},created_at.gte.${startDate}`);
      }

      if (endDate) {
        query = query.or(`trip_date.lte.${endDate},created_at.lte.${endDate}`);
      }

      const { data: bookings, error } = await query;

      if (error) {
        console.error('Error fetching bookings with captain_id:', error);

        // If query fails, try without the join first, then filter
        const { data: allBookings, error: simpleError } = await admin
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

        if (simpleError || !allBookings) {
          console.error('Error fetching bookings:', simpleError);
          return res.status(200).json({
            success: true,
            bookings: [],
            count: 0,
            note: 'No bookings found or error querying bookings table',
          });
        }

        // Filter by checking if captain_id matches any of our captain IDs
        const filtered = allBookings.filter((b: any) =>
          b.captain_id === captainProfile.id ||
          b.captain_id === user.id ||
          b.captain_id === captainId
        );

        // Apply additional filters
        let finalBookings = filtered;
        if (status && status !== 'all') {
          finalBookings = finalBookings.filter((b: any) => b.status === status);
        }
        if (startDate) {
          finalBookings = finalBookings.filter((b: any) => {
            const bookingDate = b.booking_date || b.trip_date;
            return bookingDate && bookingDate >= startDate;
          });
        }
        if (endDate) {
          finalBookings = finalBookings.filter((b: any) => {
            const bookingDate = b.booking_date || b.trip_date;
            return bookingDate && bookingDate <= endDate;
          });
        }

        const formattedBookings = await formatBookings(finalBookings, admin);
        return res.status(200).json({
          success: true,
          bookings: formattedBookings,
          count: formattedBookings.length,
        });
      }

      // Format bookings with customer info
      const formattedBookings = await formatBookings(bookings || [], admin);

      return res.status(200).json({
        success: true,
        bookings: formattedBookings,
        count: formattedBookings.length,
      });
    } catch (error: any) {
      console.error('Error in GET /api/captain/bookings:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { action, bookingId, data: updateData } = req.body;

      if (!action || !bookingId) {
        return res.status(400).json({ error: 'Missing action or bookingId' });
      }

      switch (action) {
        case 'updateStatus': {
          const { status } = updateData || {};
          if (!status) {
            return res.status(400).json({ error: 'Missing status' });
          }

          // Always require captain ownership — check all known captain IDs
          const { error: updateError } = await admin
            .from('bookings')
            .update({
              status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId)
            .in('captain_id', myCaptainIds);

          if (updateError) {
            return res.status(500).json({ error: updateError.message });
          }

          return res.status(200).json({ success: true });
        }

        case 'addNotes': {
          const { notes } = updateData || {};

          const { error: notesError } = await admin
            .from('bookings')
            .update({
              special_requests: notes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId)
            .in('captain_id', myCaptainIds);

          if (notesError) {
            return res.status(500).json({ error: notesError.message });
          }

          return res.status(200).json({ success: true });
        }

        case 'acceptBooking': {
          const { error: acceptError } = await admin
            .from('bookings')
            .update({
              status: 'confirmed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId)
            .in('captain_id', myCaptainIds);

          if (acceptError) {
            return res.status(500).json({ error: acceptError.message });
          }

          return res.status(200).json({ success: true });
        }

        case 'declineBooking': {
          const { error: declineError } = await admin
            .from('bookings')
            .update({
              status: 'cancelled',
              cancellation_reason: 'Declined by captain',
              cancelled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId)
            .in('captain_id', myCaptainIds);

          if (declineError) {
            return res.status(500).json({ error: declineError.message });
          }

          return res.status(200).json({ success: true });
        }

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error: any) {
      console.error('Error in POST /api/captain/bookings:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
