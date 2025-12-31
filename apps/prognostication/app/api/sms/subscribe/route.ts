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
 * Subscribe to SMS alerts for Pro/Elite users
 */
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { success: false, error: 'Stripe is not configured' },
      { status: 503 }
    );
  }

  try {
    const { email, phoneNumber, sessionId } = await request.json();

    if (!email || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Email and phone number are required' },
        { status: 400 }
      );
    }

    // Validate phone number format (basic)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format. Please include country code (e.g., +1234567890)' },
        { status: 400 }
      );
    }

    // Verify user has active Pro or Elite subscription
    let customerId: string | null = null;
    let subscription: Stripe.Subscription | null = null;

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

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Active Pro or Elite subscription required for SMS alerts' },
        { status: 403 }
      );
    }

    // Determine tier
    const priceId = subscription.items.data[0]?.price.id;
    const elitePriceIds = [
      process.env.NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID,
      process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID,
      process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID,
    ].filter(Boolean);

    const proPriceIds = [
      process.env.NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID,
      process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
      process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    ].filter(Boolean);

    const tier = priceId && elitePriceIds.includes(priceId) ? 'elite' : 'pro';

    // Store SMS subscription (in production, use Supabase or similar)
    // For now, we'll store in Stripe customer metadata
    try {
      await stripe.customers.update(customerId!, {
        metadata: {
          sms_enabled: 'true',
          sms_phone: phoneNumber,
          sms_tier: tier,
        },
      });
    } catch (err) {
      console.error('Failed to update customer metadata:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'SMS alerts enabled successfully',
      tier,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to subscribe to SMS alerts',
      },
      { status: 500 }
    );
  }
}

