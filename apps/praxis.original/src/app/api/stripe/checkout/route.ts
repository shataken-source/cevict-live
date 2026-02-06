import { NextResponse } from 'next/server';
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
    const { plan, priceId: bodyPriceId, userId: bodyUserId, successUrl, cancelUrl } = body as {
      plan?: string;
      priceId?: string;
      userId?: string;
      successUrl?: string;
      cancelUrl?: string;
    };

    const priceId = bodyPriceId || (plan ? getPriceIdForPlan(plan) : null);
    const userId = bodyUserId && typeof bodyUserId === 'string' ? bodyUserId : `demo_${Date.now()}`;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Plan (pro|enterprise) or priceId required. Set STRIPE_PRICE_ID_PRO and STRIPE_PRICE_ID_ENTERPRISE in env.' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${baseUrl}/?checkout=success`,
      cancel_url: cancelUrl || `${baseUrl}/pricing?checkout=canceled`,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
