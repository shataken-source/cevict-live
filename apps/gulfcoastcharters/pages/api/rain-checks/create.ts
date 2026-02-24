/**
 * API endpoint to create a rain check
 * POST /api/rain-checks/create
 * Body: { bookingId, cancellationReason, captainMessage, value, expirationDate }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getAuthedUser } from '../_lib/supabase';
import { requireRole } from '../_lib/rbac';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authed = await requireRole(req, res, ['captain', 'admin']);
    if (!authed) return;

    const { user } = await getAuthedUser(req, res);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabaseAdmin();
    const { bookingId, cancellationReason, captainMessage, value, expirationDate } = req.body;

    if (!bookingId || !value || !expirationDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get booking to verify captain ownership
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, captains!inner(user_id)')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify captain owns this booking
    if (booking.captains.user_id !== user.id) {
      return res.status(403).json({ error: 'Not authorized to issue rain check for this booking' });
    }

    // Generate unique code
    const { data: codeData, error: codeError } = await supabase.rpc('generate_rain_check_code');
    if (codeError) {
      return res.status(500).json({ error: 'Failed to generate rain check code' });
    }
    const code = codeData || `RC-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create rain check
    const { data: rainCheck, error: rainCheckError } = await supabase
      .from('rain_checks')
      .insert({
        code,
        original_booking_id: bookingId,
        customer_id: booking.user_id,
        captain_id: booking.captain_id,
        value: parseFloat(value),
        expiration_date: expirationDate,
        cancellation_reason: cancellationReason,
        captain_message: captainMessage,
        status: 'active',
        remaining_balance: parseFloat(value)
      })
      .select()
      .single();

    if (rainCheckError) {
      console.error('Error creating rain check:', rainCheckError);
      return res.status(500).json({ error: 'Failed to create rain check' });
    }

    // TODO: Send email notification to customer

    return res.status(200).json({
      success: true,
      rainCheck
    });
  } catch (error: any) {
    console.error('Error creating rain check:', error);
    return res.status(500).json({ error: error.message });
  }
}
