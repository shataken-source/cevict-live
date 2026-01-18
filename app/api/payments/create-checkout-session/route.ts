import { NextRequest, NextResponse } from 'next/server';
import StripeService from '@/lib/stripe';
import { securityMiddleware, sanitizeInput } from '@/lib/security-middleware';

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate plan ID
function isValidPlanId(planId: string): boolean {
  const validPlans = ['free', 'pro', 'elite', 'premium'];
  return validPlans.includes(planId.toLowerCase());
}

export async function POST(request: NextRequest) {
  // Apply security middleware
  const securityResponse = await securityMiddleware(request, {
    rateLimitType: 'payments',
    requireCSRF: true,
  });

  if (securityResponse && securityResponse.status !== 200) {
    return securityResponse;
  }

  try {
    const body = await request.json();
    let { planId, customerEmail, type = 'subscription' } = body;

    // Sanitize inputs
    planId = sanitizeInput(String(planId || ''));
    customerEmail = sanitizeInput(String(customerEmail || ''));

    // Validate inputs
    if (!planId || !customerEmail) {
      return NextResponse.json(
        { error: 'Plan ID and customer email are required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(customerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (!isValidPlanId(planId)) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      );
    }

    // Get Stripe service
    const stripeService = StripeService.getInstance();

    // Check if Stripe is configured
    if (!stripeService) {
      console.error('Stripe service not initialized');
      return NextResponse.json(
        { error: 'Payment service unavailable' },
        { status: 503 }
      );
    }

    // Create or retrieve customer
    const customer = await stripeService.createOrRetrieveCustomer(
      customerEmail,
      undefined,
      { plan_id: planId }
    );

    // Determine price based on plan
    const planPrices: Record<string, number> = {
      pro: 19.99,
      elite: 49.99,
      premium: 99.99,
    };
    const amount = planPrices[planId.toLowerCase()] || 19.99;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://smokersrights.com';
    
    if (type === 'subscription') {
      // For subscriptions, use predefined price IDs if available
      const priceId = process.env[`STRIPE_${planId.toUpperCase()}_PRICE_ID`];
      
      if (!priceId) {
        return NextResponse.json(
          { error: `Missing Stripe price ID: STRIPE_${planId.toUpperCase()}_PRICE_ID` },
          { status: 503 }
        );
      }

      const session = await stripeService.createSubscriptionSession(
        priceId,
        customer.id,
        `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        `${baseUrl}/payment/cancel`
      );
      return NextResponse.json(session);
    } else {
      // One-time payment
      const session = await stripeService.createCheckoutSession(
        amount,
        'usd',
        `SmokersRights ${planId} Plan`,
        `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        `${baseUrl}/payment/cancel`,
        {
          plan_id: planId,
          customer_email: customerEmail,
          customer_id: customer.id,
        }
      );

      return NextResponse.json(session);
    }
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    
    // Don't expose internal error details
    const errorMessage = error?.message || 'Failed to create checkout session';
    const statusCode = error?.statusCode || 500;

    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: statusCode }
    );
  }
}
