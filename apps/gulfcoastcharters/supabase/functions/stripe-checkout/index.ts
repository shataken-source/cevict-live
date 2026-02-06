/**
 * Stripe Checkout Edge Function
 * 
 * Creates Stripe Checkout Sessions for bookings, subscriptions, and marketplace purchases.
 * PCI-DSS compliant - no card data touches our servers.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StripeCheckoutRequest {
  // Booking flow
  bookingId?: string;
  charterId?: string;
  captainId?: string;
  amount?: number;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  bookingDate?: string;
  duration?: number;
  guests?: number;
  
  // Custom email / other purchases
  type?: 'booking' | 'custom_email' | 'subscription' | 'marketplace' | 'gift_card' | 'tip';
  email?: string;
  user_id?: string;
  user_type?: string;

  // URLs
  successUrl?: string;
  cancelUrl?: string;

  // Metadata
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Note: Supabase gateway handles authentication before reaching this function
    // If we get here, the gateway has already validated the request

    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    // Initialize Stripe
    const stripe = await import('https://esm.sh/stripe@14.21.0');
    const stripeClient = stripe.default(stripeSecretKey);

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: StripeCheckoutRequest = await req.json();
    const {
      bookingId,
      charterId,
      captainId,
      amount,
      customerEmail,
      customerName,
      customerPhone,
      bookingDate,
      duration,
      guests,
      type = 'booking',
      email,
      successUrl,
      cancelUrl,
      metadata = {},
    } = body;

    // Determine amount (convert to cents for Stripe)
    let amountInCents = 0;
    if (amount) {
      amountInCents = Math.round(amount * 100);
    } else if (type === 'custom_email' && body.amount) {
      amountInCents = Math.round(body.amount * 100);
    }

    if (amountInCents < 50) { // Minimum $0.50
      throw new Error('Amount must be at least $0.50');
    }

    // Build line items
    const lineItems: any[] = [];
    
    if (type === 'booking') {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Charter Booking${charterId ? ` - ${body.charterName || 'Charter'}` : ''}`,
            description: bookingDate 
              ? `Booking for ${new Date(bookingDate).toLocaleDateString()}${guests ? ` - ${guests} guests` : ''}`
              : 'Charter fishing booking',
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      });
    } else if (type === 'custom_email') {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Custom @gulfcoastcharters.com Email',
            description: `Professional email address: ${email || customerEmail}`,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      });
    } else if (type === 'subscription') {
      // Handle subscription creation (would need subscription plan details)
      throw new Error('Subscription checkout not yet implemented');
    } else if (type === 'marketplace') {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: body.listingTitle || 'Marketplace Item',
            description: body.listingDescription || '',
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      });
    } else if (type === 'tip') {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Trip Tip',
            description: `Tip for booking ${metadata.booking_id || 'trip'}`,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      });
    } else if (type === 'gift_card') {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Gift Card',
            description: `$${amount} gift card`,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      });
    }

    // Build metadata
    const checkoutMetadata: Record<string, string> = {
      ...metadata,
      type,
    };

    if (bookingId) checkoutMetadata.bookingId = bookingId;
    if (charterId) checkoutMetadata.charterId = charterId;
    if (captainId) checkoutMetadata.captainId = captainId;
    if (customerEmail) checkoutMetadata.customerEmail = customerEmail;
    if (type === 'custom_email' && email) {
      checkoutMetadata.email = email;
      if (body.user_id) checkoutMetadata.user_id = String(body.user_id);
      if (body.user_type) checkoutMetadata.user_type = String(body.user_type);
    }

    // Create Stripe Checkout Session
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: type === 'subscription' ? 'subscription' : 'payment',
      success_url: successUrl || `${Deno.env.get('SITE_URL') || 'https://gulfcoastcharters.com'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${Deno.env.get('SITE_URL') || 'https://gulfcoastcharters.com'}/payment-cancel`,
      customer_email: customerEmail || email,
      metadata: checkoutMetadata,
      // Enable automatic tax calculation if configured
      automatic_tax: { enabled: false },
      // Allow promotion codes
      allow_promotion_codes: true,
    });

    // If booking exists, update it with Stripe session ID
    if (bookingId) {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          stripe_checkout_session_id: session.id,
          payment_status: 'pending',
        })
        .eq('id', bookingId);
      
      if (updateError) {
        console.warn('Failed to update booking with session ID:', updateError.message);
        // Don't fail the checkout - session is created, booking update is secondary
      }
    }

    // Return checkout URL
    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
        bookingId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create checkout session',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
