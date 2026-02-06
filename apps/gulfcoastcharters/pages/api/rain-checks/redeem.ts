/**
 * API endpoint to redeem a rain check
 * POST /api/rain-checks/redeem
 * Body: { rainCheckCode, bookingId, amount }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, getAuthedUser } from '../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user } = await getAuthedUser(req, res);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabaseAdmin();
    const { rainCheckCode, bookingId, amount } = req.body;

    if (!rainCheckCode || !bookingId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get rain check
    const { data: rainCheck, error: rainCheckError } = await supabase
      .from('rain_checks')
      .select('*')
      .eq('code', rainCheckCode)
      .single();

    if (rainCheckError || !rainCheck) {
      return res.status(404).json({ error: 'Rain check not found' });
    }

    // Verify ownership
    if (rainCheck.customer_id !== user.id && rainCheck.transferred_to_user_id !== user.id) {
      return res.status(403).json({ error: 'Not authorized to redeem this rain check' });
    }

    // Check status
    if (rainCheck.status !== 'active') {
      return res.status(400).json({ error: `Rain check is ${rainCheck.status}` });
    }

    // Check expiration
    if (new Date(rainCheck.expiration_date) < new Date()) {
      return res.status(400).json({ error: 'Rain check has expired' });
    }

    // Check balance
    const useAmount = parseFloat(amount);
    if (useAmount > rainCheck.remaining_balance) {
      return res.status(400).json({ error: 'Amount exceeds remaining balance' });
    }

    // Update rain check
    const newBalance = rainCheck.remaining_balance - useAmount;
    const newStatus = newBalance <= 0 ? 'redeemed' : 'active';

    const { error: updateError } = await supabase
      .from('rain_checks')
      .update({
        remaining_balance: newBalance,
        status: newStatus,
        redeemed_booking_id: newStatus === 'redeemed' ? bookingId : null
      })
      .eq('rain_check_id', rainCheck.rain_check_id);

    if (updateError) {
      console.error('Error updating rain check:', updateError);
      return res.status(500).json({ error: 'Failed to redeem rain check' });
    }

    // Create redemption record if fully redeemed
    if (newStatus === 'redeemed') {
      await supabase.from('rain_check_redemptions').insert({
        rain_check_id: rainCheck.rain_check_id,
        booking_id: bookingId,
        amount_used: useAmount,
        redeemed_at: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true,
      remainingBalance: newBalance,
      status: newStatus
    });
  } catch (error: any) {
    console.error('Error redeeming rain check:', error);
    return res.status(500).json({ error: error.message });
  }
}
