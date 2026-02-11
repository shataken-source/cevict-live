import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import Stripe from 'stripe';

function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover',
  });
}

function getPriceIdForPlan(plan: string): string | null {
  if (plan === 'starter') return process.env.STRIPE_PRICE_ID_STARTER ?? null;
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
    const authSession = await auth();
    const clerkUserId = authSession?.userId ?? null;
    const userId = (bodyUserId && typeof bodyUserId === 'string' ? bodyUserId : clerkUserId) ?? null;
    const user = clerkUserId ? await currentUser() : null;
    const customerEmail = user?.primaryEmailAddress?.emailAddress ?? undefined;

    // Paid plans require sign-in (Clerk)
    if (plan && plan !== 'free' && !userId) {
      return NextResponse.json(
        { error: 'Sign in required to subscribe. Go to Sign In and try again.' },
        { status: 401 }
      );
    }

    if (!priceId) {
      return NextResponse.json(
        { error: 'Plan (starter|pro|enterprise) or priceId required. Set STRIPE_PRICE_ID_STARTER, STRIPE_PRICE_ID_PRO, STRIPE_PRICE_ID_ENTERPRISE in .env.local and restart.' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY not set. Add it to .env.local and restart.' },
        { status: 500 }
      );
    }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const couponId = postTrialDiscount ? process.env.STRIPE_COUPON_ID_POST_TRIAL : null;

    const effectiveUserId = userId ?? `demo_${Date.now()}`;
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${baseUrl}/?checkout=success`,
      cancel_url: cancelUrl || `${baseUrl}/pricing?checkout=canceled`,
      metadata: { userId: effectiveUserId },
      subscription_data: { metadata: { userId: effectiveUserId } },
      ...(customerEmail && { customer_email: customerEmail }),
    };
    if (couponId) {
      sessionConfig.discounts = [{ coupon: couponId }];
    }
    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    const message = error instanceof Error ? error.message : 'Stripe API error';
    return NextResponse.json(
      { error: `Checkout failed: ${message}` },
      { status: 500 }
    );
  }
}
