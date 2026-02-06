/**
 * API endpoint to redeem a gift certificate
 * POST /api/gift-cards/redeem
 * Body: { code, bookingId, amount }
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
    const { code, bookingId, amount } = req.body;

    if (!code || !bookingId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get gift certificate
    const { data: certificate, error: certError } = await supabase
      .from('gift_certificates')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (certError || !certificate) {
      return res.status(404).json({ error: 'Gift certificate not found' });
    }

    // Verify recipient email matches
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();

    if (certificate.recipient_email.toLowerCase() !== userData?.email?.toLowerCase()) {
      return res.status(403).json({ error: 'Gift certificate not assigned to this account' });
    }

    // Check status
    if (certificate.status !== 'active') {
      return res.status(400).json({ error: `Gift certificate is ${certificate.status}` });
    }

    // Check expiration
    if (certificate.expires_at && new Date(certificate.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Gift certificate has expired' });
    }

    // Check balance
    const useAmount = parseFloat(amount);
    if (useAmount > certificate.remaining_balance) {
      return res.status(400).json({ error: 'Amount exceeds remaining balance' });
    }

    // Update certificate
    const newBalance = certificate.remaining_balance - useAmount;
    const newStatus = newBalance <= 0 ? 'redeemed' : 'active';

    const { error: updateError } = await supabase
      .from('gift_certificates')
      .update({
        remaining_balance: newBalance,
        status: newStatus,
        redeemed_at: newStatus === 'redeemed' ? new Date().toISOString() : null
      })
      .eq('certificate_id', certificate.certificate_id);

    if (updateError) {
      console.error('Error updating gift certificate:', updateError);
      return res.status(500).json({ error: 'Failed to redeem gift certificate' });
    }

    // Create redemption record
    await supabase.from('gift_certificate_redemptions').insert({
      certificate_id: certificate.certificate_id,
      booking_id: bookingId,
      amount_used: useAmount,
      redeemed_by: user.id
    });

    return res.status(200).json({
      success: true,
      remainingBalance: newBalance,
      status: newStatus
    });
  } catch (error: any) {
    console.error('Error redeeming gift certificate:', error);
    return res.status(500).json({ error: error.message });
  }
}
