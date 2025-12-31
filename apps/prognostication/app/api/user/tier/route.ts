import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

// Only initialize Stripe if API key is present
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
    })
  : null;

/**
 * Get user's subscription tier from Stripe
 * This verifies the user has an active paid subscription
 */
export async function GET(request: NextRequest) {
  // If Stripe is not configured, return free tier
  if (!stripe) {
    return NextResponse.json(
      { tier: 'free', hasAccess: false, message: 'Stripe not configured' },
      { status: 200 }
    );
  }

  try {
    // Get email from query params or headers
    const email = request.nextUrl.searchParams.get('email');
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!email && !sessionId) {
      return NextResponse.json(
        { tier: 'free', hasAccess: false },
        { status: 200 }
      );
    }

    let customerId: string | null = null;
    let subscription: Stripe.Subscription | null = null;

    // If we have a session ID, get customer from session
    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.customer && typeof session.customer === 'string') {
          customerId = session.customer;
        }
      } catch (err) {
        console.error('Error retrieving session:', err);
      }
    }

    // If we have email but no customer ID, search for customer
    if (email && !customerId) {
      try {
        const customers = await stripe.customers.list({
          email: email,
          limit: 1,
        });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        }
      } catch (err) {
        console.error('Error searching for customer:', err);
      }
    }

    // Get active subscriptions
    if (customerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          subscription = subscriptions.data[0];
        }
      } catch (err) {
        console.error('Error retrieving subscriptions:', err);
      }
    }

    // Determine tier from subscription
    let tier: 'free' | 'pro' | 'elite' = 'free';
    let hasAccess = false;

    if (subscription) {
      const priceId = subscription.items.data[0]?.price.id;

      // Check against configured price IDs
      const proPriceIds = [
        process.env.NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
      ].filter(Boolean);

      const elitePriceIds = [
        process.env.NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID,
      ].filter(Boolean);

      if (priceId && elitePriceIds.includes(priceId)) {
        tier = 'elite';
        hasAccess = true;
      } else if (priceId && proPriceIds.includes(priceId)) {
        tier = 'pro';
        hasAccess = true;
      }
    }

    return NextResponse.json({
      tier,
      hasAccess,
      subscriptionId: subscription?.id || null,
      customerId: customerId || null,
    });
  } catch (error: any) {
    console.error('Error checking user tier:', error);
    // Default to free tier on error
    return NextResponse.json(
      { tier: 'free', hasAccess: false, error: error?.message },
      { status: 200 }
    );
  }
}

