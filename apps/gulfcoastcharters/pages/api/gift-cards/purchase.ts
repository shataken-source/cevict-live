/**
 * API endpoint to purchase a gift certificate
 * POST /api/gift-cards/purchase
 * Body: { amount, recipientName, recipientEmail, senderName, senderEmail, message }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      amount, 
      recipientName, 
      recipientEmail, 
      senderName, 
      senderEmail,
      message 
    } = req.body;

    // Validate required fields
    if (!amount || !recipientName || !recipientEmail || !senderName || !senderEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate amount
    const giftAmount = parseFloat(amount);
    if (isNaN(giftAmount) || giftAmount < 25 || giftAmount > 1000) {
      return res.status(400).json({ error: 'Amount must be between $25 and $1000' });
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail) || !emailRegex.test(senderEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase configuration');
      return res.status(500).json({ error: 'Missing Supabase configuration' });
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Try to find sender user by email (optional - gift cards can be purchased by non-users)
    let purchaserId: string | null = null;
    const { data: senderUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', senderEmail)
      .maybeSingle();
    
    if (senderUser) {
      purchaserId = senderUser.id;
    }

    // Create gift certificate record with status 'pending'
    // Code will be generated when payment is confirmed via webhook
    const { data: giftCertificate, error: certError } = await supabaseAdmin
      .from('gift_certificates')
      .insert({
        code: 'PENDING', // Temporary - will be replaced by webhook
        purchaser_id: purchaserId,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        amount: giftAmount,
        remaining_balance: giftAmount,
        message: message || null,
        status: 'pending',
        purchased_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (certError) {
      console.error('Error creating gift certificate:', certError);
      return res.status(500).json({ 
        error: 'Failed to create gift certificate',
        details: certError.message 
      });
    }

    console.log('Created gift certificate:', giftCertificate.certificate_id);

    // Create Stripe checkout session
    const origin = req.headers.origin || 'http://localhost:3000';
    const { data: checkoutData, error: checkoutError } = await supabaseAdmin.functions.invoke('stripe-checkout', {
      body: {
        type: 'gift_card',
        amount: giftAmount,
        customerEmail: senderEmail,
        customerName: senderName,
        successUrl: `${origin}/payment-success?type=gift-card&certificateId=${giftCertificate.certificate_id}`,
        cancelUrl: `${origin}/gift-cards?cancelled=true`,
        metadata: {
          gift_certificate_id: giftCertificate.certificate_id,
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          sender_name: senderName,
          sender_email: senderEmail,
          message: message || '',
          type: 'gift_card',
        },
      },
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    });

    if (checkoutError) {
      console.error('Stripe checkout error:', checkoutError);
      
      // Clean up the gift certificate record if checkout fails
      await supabaseAdmin
        .from('gift_certificates')
        .delete()
        .eq('certificate_id', giftCertificate.certificate_id);
      
      return res.status(500).json({ 
        error: 'Failed to create checkout session',
        details: checkoutError.message 
      });
    }

    if (!checkoutData?.url) {
      return res.status(500).json({ error: 'No checkout URL returned from Stripe' });
    }

    return res.status(200).json({
      success: true,
      url: checkoutData.url,
      certificateId: giftCertificate.certificate_id,
    });
  } catch (error: any) {
    console.error('Error processing gift card purchase:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
