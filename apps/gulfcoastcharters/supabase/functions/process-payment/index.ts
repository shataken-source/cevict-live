/**
 * Process Payment Edge Function (Legacy/Alternative)
 * 
 * Alternative payment processing for direct card processing (not recommended).
 * Prefer stripe-checkout for PCI compliance.
 * 
 * NOTE: This requires PCI-DSS compliance if storing card data.
 * Recommended: Use stripe-checkout instead.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const stripe = await import('https://esm.sh/stripe@14.21.0');
    const stripeClient = stripe.default(stripeSecretKey);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { bookingId, amount, cardNumber, expiry, cvc, name } = body;

    if (!bookingId || !amount || !cardNumber || !expiry || !cvc || !name) {
      throw new Error('Missing required payment fields');
    }

    // Parse expiry (MM/YY format)
    const [month, year] = expiry.split('/');
    const expYear = 2000 + parseInt(year);

    // Create payment method (Stripe token)
    // NOTE: In production, use Stripe Elements on frontend to create PaymentMethod
    // This is a simplified version - should use Stripe.js on client side
    const paymentMethod = await stripeClient.paymentMethods.create({
      type: 'card',
      card: {
        number: cardNumber.replace(/\s/g, ''),
        exp_month: parseInt(month),
        exp_year: expYear,
        cvc: cvc,
      },
      billing_details: {
        name: name,
      },
    });

    // Create payment intent
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethod.id,
      confirm: true,
      metadata: {
        bookingId: bookingId,
      },
    });

    if (paymentIntent.status === 'succeeded') {
      // Create payment record
      await supabase.from('payments').insert({
        booking_id: bookingId,
        amount: amount,
        currency: 'usd',
        status: 'completed',
        stripe_payment_intent_id: paymentIntent.id,
        stripe_charge_id: paymentIntent.latest_charge as string,
      });

      // Update booking
      await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          status: 'confirmed',
        })
        .eq('id', bookingId);

      return new Response(
        JSON.stringify({
          success: true,
          paymentIntentId: paymentIntent.id,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      throw new Error(`Payment failed: ${paymentIntent.status}`);
    }
  } catch (error: any) {
    console.error('Process payment error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Payment processing failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
