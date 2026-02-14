import { NextRequest, NextResponse } from 'next/server';
import { createSubscriptionCheckout, activateSubscription } from '../../../../../lib/reunion-ready-service';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' })
  : null;

/**
 * POST /api/petreunion/reunion-ready/checkout
 * Creates a Stripe checkout session for ReunionReady subscription
 * 
 * Body: {
 *   vaultPetId: number,
 *   userId: string,
 *   successUrl: string,
 *   cancelUrl: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { vaultPetId, userId, successUrl, cancelUrl } = body;

    if (!vaultPetId || !userId) {
      return NextResponse.json(
        { error: 'vaultPetId and userId are required' },
        { status: 400 }
      );
    }

    const result = await createSubscriptionCheckout(
      vaultPetId,
      userId,
      successUrl || `${request.headers.get('origin')}/dashboard/vault?success=true`,
      cancelUrl || `${request.headers.get('origin')}/dashboard/vault?cancelled=true`
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: result.checkoutUrl,
      sessionId: result.sessionId
    });

  } catch (error: any) {
    console.error('[ReunionReady Checkout] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Checkout failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/petreunion/reunion-ready/checkout?session_id=xxx
 * Verify checkout session and activate subscription
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const vaultPetId = searchParams.get('vault_pet_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed', status: session.payment_status },
        { status: 400 }
      );
    }

    const subscription = session.subscription as Stripe.Subscription;
    const petId = parseInt(session.metadata?.vault_pet_id || vaultPetId || '0');

    if (!petId) {
      return NextResponse.json(
        { error: 'Could not identify vault pet' },
        { status: 400 }
      );
    }

    // Activate subscription
    const activated = await activateSubscription(
      petId,
      subscription.id,
      session.customer as string
    );

    if (!activated) {
      return NextResponse.json(
        { error: 'Failed to activate subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '🎉 ReunionReady activated! Your pet is now protected.',
      vaultPetId: petId,
      subscriptionId: subscription.id,
      expiresAt: new Date(subscription.current_period_end * 1000).toISOString()
    });

  } catch (error: any) {
    console.error('[ReunionReady Checkout Verify] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}

