import { NextRequest, NextResponse } from 'next/server';
import StripeService from '@/lib/stripe';
import { securityMiddleware } from '@/lib/security-middleware';

export async function POST(request: NextRequest) {
  const sec = await securityMiddleware(request, { rateLimitType: 'payments', requireCSRF: true });
  if (sec && sec.status !== 200) return sec;

  try {
    const { amount, currency = 'usd', metadata } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    const stripeService = StripeService.getInstance();
    const paymentIntent = await stripeService.createPaymentIntent(
      amount,
      currency,
      metadata
    );

    return NextResponse.json(paymentIntent);
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
