import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' })
  : null;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!email && !sessionId) {
      return NextResponse.json({ tier: 'free', hasAccess: false });
    }

    let userTier: 'free' | 'pro' | 'elite' = 'free';

    // 1. Check profiles table for manual override (highest priority)
    if (email) {
      const supabase = getSupabase();
      if (supabase) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tier, manual_override, subscription_status')
          .eq('email', email.trim().toLowerCase())
          .single();
        if (profile) {
          if (profile.manual_override || profile.subscription_status === 'active') {
            userTier = profile.tier as 'free' | 'pro' | 'elite';
          }
        }
      }
    }

    // 2. If still free, check Stripe for active subscription
    if (userTier === 'free' && stripe && (email || sessionId)) {
      try {
        let customerId: string | null = null;

        if (sessionId) {
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          if (session.customer && typeof session.customer === 'string') {
            customerId = session.customer;
          }
        }

        if (email && !customerId) {
          const customers = await stripe.customers.list({ email: email.trim().toLowerCase(), limit: 1 });
          if (customers.data.length > 0) customerId = customers.data[0].id;
        }

        if (customerId) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId, status: 'active', limit: 1,
          });

          if (subscriptions.data.length > 0) {
            const priceId = subscriptions.data[0].items.data[0]?.price.id;
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

            if (priceId && elitePriceIds.includes(priceId)) userTier = 'elite';
            else if (priceId && proPriceIds.includes(priceId)) userTier = 'pro';
          }
        }
      } catch (err) {
        console.error('Stripe tier check failed:', err);
      }
    }

    return NextResponse.json({
      tier: userTier,
      hasAccess: userTier !== 'free',
      ...(email && { email }),
    });
  } catch (error: any) {
    return NextResponse.json({ tier: 'free', hasAccess: false, error: error?.message }, { status: 500 });
  }
}
