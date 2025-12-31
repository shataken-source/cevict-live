import { NextResponse } from 'next/server';

export async function GET() {
  const priceIds = {
    'pro-weekly': process.env.NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID,
    'elite-weekly': process.env.NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID,
    'pro-monthly': process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
    'elite-monthly': process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID,
  };

  const missing = Object.entries(priceIds)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  const configured = Object.entries(priceIds)
    .filter(([_, value]) => value)
    .map(([key, value]) => ({ plan: key, priceId: value }));

  // Also check other required vars
  const otherVars = {
    'STRIPE_SECRET_KEY': !!process.env.STRIPE_SECRET_KEY,
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    'NEXT_PUBLIC_BASE_URL': !!process.env.NEXT_PUBLIC_BASE_URL,
  };

  return NextResponse.json({
    allConfigured: missing.length === 0,
    missing,
    configured,
    otherVars,
    summary: {
      total: 4,
      configured: configured.length,
      missing: missing.length,
    },
    note: missing.length > 0
      ? 'Environment variables may not be loaded yet. Redeploy the project after adding vars to Vercel.'
      : 'All price IDs configured!',
  });
}

