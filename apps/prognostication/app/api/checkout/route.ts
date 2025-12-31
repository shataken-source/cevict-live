// ENTERPRISE-GRADE VERSION WITH SECURITY & ERROR HANDLING
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn('[checkout] STRIPE_SECRET_KEY is not configured – checkout will be disabled.');
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null as unknown as Stripe;

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = requestCounts.get(ip);

  if (!limit || now > limit.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (limit.count >= 5) {
    return false;
  }

  limit.count++;
  return true;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().replace(/[<>'"]/g, '');
}

function isValidTier(tier: string): tier is 'pro' | 'elite' {
  return tier === 'pro' || tier === 'elite';
}

function isValidBillingType(billingType: string): billingType is 'weekly' | 'monthly' {
  return billingType === 'weekly' || billingType === 'monthly';
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let priceId: string | undefined;
  let priceKey: string | undefined;

  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    if (!checkRateLimit(ip)) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a minute.' },
        { status: 429 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Checkout is temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { email, tier, billingType } = body;

    // Validate required fields
    if (!email || !tier || !billingType) {
      console.warn('Missing required fields:', { email: !!email, tier, billingType });
      return NextResponse.json(
        { error: 'Email, tier, and billing type are required' },
        { status: 400 }
      );
    }

    // Validate email
    if (!isValidEmail(email)) {
      console.warn('Invalid email format:', email);
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(email);

    // Validate tier
    if (!isValidTier(tier)) {
      console.warn('Invalid tier:', tier);
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Validate billing type
    if (!isValidBillingType(billingType)) {
      console.warn('Invalid billing type:', billingType);
      return NextResponse.json(
        { error: 'Invalid billing period selected' },
        { status: 400 }
      );
    }

    // Get price ID (support both old and new variable names for backward compatibility)
    const priceIdMap: Record<string, string> = {
      'pro-weekly': process.env.NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID || '',
      'elite-weekly': process.env.NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID || '',
      'pro-monthly': process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ||
                     process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '', // Fallback to old name
      'elite-monthly': process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID ||
                       process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID || '', // Fallback to old name
    };

    priceKey = `${tier}-${billingType}`;
    priceId = priceIdMap[priceKey];

    if (!priceId) {
      console.error('Missing price ID for plan:', {
        priceKey,
        priceIdMap,
        envVars: {
          proWeekly: !!process.env.NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID,
          eliteWeekly: !!process.env.NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID,
          proMonthly: !!process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
          eliteMonthly: !!process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID,
        },
      });
      return NextResponse.json(
        {
          error: 'Invalid plan configuration',
          details: `Price ID not configured for ${priceKey}. Please check environment variables.`
        },
        { status: 400 }
      );
    }

    const mode = billingType === 'weekly' ? 'payment' : 'subscription';

    // Build base URL with proper scheme validation
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    // If not set, construct from request headers (works on all devices)
    if (!baseUrl) {
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
      if (host) {
        baseUrl = `${protocol}://${host}`;
      } else {
        // Last resort fallback
        baseUrl = 'https://www.prognostication.com';
      }
    }

    // Ensure URL has explicit scheme (https://)
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }

    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');

    // Create Stripe session with multiple payment methods
    const session = await stripe.checkout.sessions.create({
      customer_email: sanitizedEmail,
      mode: mode,
      payment_method_types: ['card', 'link'], // card enables Google Pay & Apple Pay automatically
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
        },
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: {
        tier: tier,
        billingType: billingType,
        email: sanitizedEmail,
        timestamp: new Date().toISOString(),
      },
      expires_at: Math.floor(Date.now() / 1000) + 1800,
    });

    const duration = Date.now() - startTime;
    console.log('Checkout session created:', {
      tier,
      billingType,
      sessionId: session.id,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.error('Checkout error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
      priceId: priceId,
      priceKey,
      duration: `${duration}ms`,
      stack: error.stack,
    });

    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: 'Your card was declined. Please try a different payment method.' },
        { status: 400 }
      );
    }

    if (error.type === 'StripeInvalidRequestError') {
      // Return more detailed error for debugging
      return NextResponse.json(
        {
          error: 'Invalid payment configuration',
          details: error.message || 'Please check that the price ID exists in your Stripe account and matches your API keys (test vs live)',
          code: error.code,
          param: error.param,
        },
        { status: 400 }
      );
    }

    if (error.type === 'StripeAPIError') {
      return NextResponse.json(
        { error: 'Payment service temporarily unavailable. Please try again.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'An error occurred. Please try again or contact support.' },
      { status: 500 }
    );
  }
}

