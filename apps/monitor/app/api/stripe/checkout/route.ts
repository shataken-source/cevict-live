import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-01-28.clover' });
}

function getPriceIdForPlan(plan: string): string | null {
  if (plan === 'pro') return process.env.STRIPE_PRICE_ID_PRO ?? null;
  if (plan === 'team') return process.env.STRIPE_PRICE_ID_TEAM ?? null;
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan, priceId: bodyPriceId, successUrl, cancelUrl } = body as {
      plan?: string;
      priceId?: string;
      successUrl?: string;
      cancelUrl?: string;
    };

    const authSession = await auth();
    const userId = authSession?.userId ?? null;
    if (!userId) {
      return NextResponse.json(
        { error: 'Sign in required to subscribe.' },
        { status: 401 }
      );
    }

    const priceId = bodyPriceId || (plan ? getPriceIdForPlan(plan) : null);
    if (!priceId) {
      return NextResponse.json(
        { error: 'Plan (pro|team) or priceId required. Set STRIPE_PRICE_ID_PRO and STRIPE_PRICE_ID_TEAM in env.' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3010';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${baseUrl}/?checkout=success`,
      cancel_url: cancelUrl || `${baseUrl}/landing?checkout=canceled`,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
