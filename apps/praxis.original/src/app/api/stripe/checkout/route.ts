import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';

// Lazy initialize Stripe to avoid build-time errors
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover',
  });
}

function getPriceIdForPlan(plan: string): string | null {
  if (plan === 'pro') return process.env.STRIPE_PRICE_ID_PRO ?? null;
  if (plan === 'enterprise') return process.env.STRIPE_PRICE_ID_ENTERPRISE ?? null;
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan, priceId: bodyPriceId, userId: bodyUserId, successUrl, cancelUrl, postTrialDiscount } = body as {
      plan?: string;
      priceId?: string;
      userId?: string;
      successUrl?: string;
      cancelUrl?: string;
      postTrialDiscount?: boolean;
    };

    const priceId = bodyPriceId || (plan ? getPriceIdForPlan(plan) : null);
    const clerkUserId = auth()?.userId ?? null;
    const userId = (bodyUserId && typeof bodyUserId === 'string' ? bodyUserId : clerkUserId) ?? null;

    // Paid plans require sign-in (Clerk)
    if (plan && plan !== 'free' && !userId) {
      return NextResponse.json(
        { error: 'Sign in required to subscribe. Go to Sign In and try again.' },
        { status: 401 }
      );
    }

    if (!priceId) {
      return NextResponse.json(
        { error: 'Plan (pro|enterprise) or priceId required. Set STRIPE_PRICE_ID_PRO and STRIPE_PRICE_ID_ENTERPRISE in env.' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const couponId = postTrialDiscount ? process.env.STRIPE_COUPON_ID_POST_TRIAL : null;

    const effectiveUserId = userId ?? `demo_${Date.now()}`;
    const sessionConfig: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${baseUrl}/?checkout=success`,
      cancel_url: cancelUrl || `${baseUrl}/pricing?checkout=canceled`,
      metadata: { userId: effectiveUserId },
      subscription_data: { metadata: { userId: effectiveUserId } },
    };
    if (couponId) {
      sessionConfig.discounts = [{ coupon: couponId }];
    }
    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
