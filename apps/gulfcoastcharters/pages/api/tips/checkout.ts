/**
 * API endpoint to create Stripe checkout session for tips
 * POST /api/tips/checkout
 * Body: { tipId, amount, bookingId, customerEmail, successUrl, cancelUrl }
 * Uses Stripe SDK directly when STRIPE_SECRET_KEY is set; otherwise falls back to Edge Function.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}` : 'https://gulfcoastcharters.com';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tipId, amount, bookingId, customerEmail, successUrl, cancelUrl, metadata } = req.body;

    if (!tipId || !amount || parseFloat(amount) < 0.5) {
      return res.status(400).json({ error: 'Missing or invalid fields: tipId required, amount at least $0.50' });
    }

    const amountInCents = Math.round(parseFloat(amount) * 100);
    const origin = (req.headers.origin || baseUrl).replace(/\/$/, '');
    const success = successUrl || `${origin}/payment-success?type=tip&tipId=${tipId}`;
    const cancel = cancelUrl || `${origin}/?tipCancelled=true&tipId=${tipId}`;

    // Prefer direct Stripe so tipping works without deploying the Edge Function
    if (stripeSecretKey) {
      const stripe = new Stripe(stripeSecretKey);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Trip Tip',
              description: bookingId ? `Tip for booking` : 'Tip for your charter trip',
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: success,
        cancel_url: cancel,
        customer_email: customerEmail || undefined,
        metadata: {
          type: 'tip',
          tip_id: String(tipId),
          ...(bookingId && { booking_id: String(bookingId) }),
          ...(metadata && typeof metadata === 'object' ? metadata : {}),
        },
      });

      if (!session.url) {
        return res.status(500).json({ error: 'Stripe did not return a checkout URL' });
      }
      return res.status(200).json({ success: true, url: session.url });
    }

    // Fallback: invoke Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        error: 'Stripe not configured. Set STRIPE_SECRET_KEY or Supabase + stripe-checkout Edge Function.',
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: checkoutData, error: checkoutError } = await supabaseAdmin.functions.invoke('stripe-checkout', {
      body: {
        type: 'tip',
        amount: parseFloat(amount),
        bookingId: bookingId ?? undefined,
        customerEmail: customerEmail ?? undefined,
        successUrl: success,
        cancelUrl: cancel,
        metadata: { type: 'tip', tip_id: String(tipId), ...(bookingId && { booking_id: String(bookingId) }), ...metadata },
      },
      headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey },
    });

    if (checkoutError) {
      console.error('Stripe checkout (Edge Function) error:', checkoutError);
      if (checkoutError.message?.includes('Unauthorized') || checkoutError.code === '401') {
        return res.status(401).json({ error: 'Unauthorized', details: checkoutError.message });
      }
      return res.status(500).json({
        error: 'Failed to create checkout session',
        details: checkoutError.message,
      });
    }

    if (!checkoutData?.url) {
      return res.status(500).json({ error: 'No checkout URL returned from Stripe' });
    }
    return res.status(200).json({ success: true, url: checkoutData.url });
  } catch (error: any) {
    console.error('Error creating tip checkout session:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: error.stack }),
    });
  }
}
