/**
 * STRIPE INTEGRATION TEST ENDPOINT
 * Validates Stripe configuration and checkout flow
 * 
 * Enterprise-grade validation:
 * - API key validation
 * - Price ID verification
 * - Webhook endpoint check
 * - Product configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

interface TestResult {
  test: string;
  passed: boolean;
  details?: string;
  error?: string;
}

export async function GET(request: NextRequest) {
  // Security: Only allow in development or with test token
  const authHeader = request.headers.get('authorization');
  const isAuthorized = 
    process.env.NODE_ENV === 'development' ||
    authHeader === `Bearer ${process.env.TEST_SECRET}` ||
    request.nextUrl.searchParams.get('key') === process.env.TEST_SECRET;

  if (!isAuthorized && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Unauthorized - test endpoint requires authentication' },
      { status: 401 }
    );
  }

  const results: TestResult[] = [];
  let allPassed = true;

  // Test 1: Check Stripe Secret Key
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    results.push({
      test: 'Stripe Secret Key',
      passed: false,
      error: 'STRIPE_SECRET_KEY not configured',
    });
    allPassed = false;
  } else {
    const isLiveKey = stripeSecretKey.startsWith('sk_live_');
    results.push({
      test: 'Stripe Secret Key',
      passed: true,
      details: `Key type: ${isLiveKey ? 'LIVE' : 'TEST'}`,
    });
  }

  // Test 2: Check Price IDs
  const priceIds = {
    proWeekly: process.env.NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID,
    proMonthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    eliteWeekly: process.env.NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID,
    eliteMonthly: process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID,
  };

  for (const [key, priceId] of Object.entries(priceIds)) {
    if (!priceId) {
      results.push({
        test: `Price ID: ${key}`,
        passed: false,
        error: 'Not configured',
      });
      allPassed = false;
    } else {
      results.push({
        test: `Price ID: ${key}`,
        passed: true,
        details: priceId.substring(0, 20) + '...',
      });
    }
  }

  // Test 3: Validate Stripe connection
  if (stripeSecretKey) {
    try {
      const stripe = new Stripe(stripeSecretKey);
      
      // Try to list products (minimal API call)
      const products = await stripe.products.list({ limit: 1 });
      results.push({
        test: 'Stripe API Connection',
        passed: true,
        details: `Connected. ${products.data.length > 0 ? 'Products found' : 'No products yet'}`,
      });

      // Validate each price ID exists
      for (const [key, priceId] of Object.entries(priceIds)) {
        if (priceId) {
          try {
            const price = await stripe.prices.retrieve(priceId);
            results.push({
              test: `Price Validation: ${key}`,
              passed: true,
              details: `${price.currency.toUpperCase()} ${(price.unit_amount || 0) / 100}/${price.recurring?.interval || 'one-time'}`,
            });
          } catch (e: any) {
            results.push({
              test: `Price Validation: ${key}`,
              passed: false,
              error: e.message || 'Price not found',
            });
            allPassed = false;
          }
        }
      }
    } catch (e: any) {
      results.push({
        test: 'Stripe API Connection',
        passed: false,
        error: e.message || 'Failed to connect to Stripe',
      });
      allPassed = false;
    }
  }

  // Test 4: Check base URL configuration
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  results.push({
    test: 'Base URL',
    passed: !!baseUrl,
    details: baseUrl || 'Using request host fallback',
  });

  // Test 5: Check webhook secret (optional but recommended)
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  results.push({
    test: 'Webhook Secret',
    passed: !!webhookSecret,
    details: webhookSecret ? 'Configured' : 'Not configured (webhooks disabled)',
  });

  return NextResponse.json({
    success: allPassed,
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
    },
    results,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}

// POST: Test a checkout session creation (dry run)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tier = 'pro', billingType = 'monthly', email = 'test@example.com' } = body;

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const priceIdMap: Record<string, string | undefined> = {
      'pro-weekly': process.env.NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID,
      'elite-weekly': process.env.NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID,
      'pro-monthly': process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
      'elite-monthly': process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID,
    };

    const priceKey = `${tier}-${billingType}`;
    const priceId = priceIdMap[priceKey];

    if (!priceId) {
      return NextResponse.json({
        success: false,
        error: `No price configured for ${priceKey}`,
        availablePrices: Object.entries(priceIdMap)
          .filter(([, v]) => v)
          .map(([k]) => k),
      });
    }

    // Validate the price exists
    const price = await stripe.prices.retrieve(priceId);

    return NextResponse.json({
      success: true,
      message: 'Checkout would succeed',
      priceKey,
      price: {
        id: price.id,
        amount: `${price.currency.toUpperCase()} ${(price.unit_amount || 0) / 100}`,
        interval: price.recurring?.interval || 'one-time',
        product: price.product,
      },
      note: 'This is a dry run - no actual session created',
    });

  } catch (e: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: e.message || 'Test failed',
      },
      { status: 500 }
    );
  }
}

