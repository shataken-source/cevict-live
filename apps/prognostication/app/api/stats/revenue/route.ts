import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover' as any,
  })
  : null;

/**
 * Get revenue and subscriber stats from Stripe
 */
export async function GET(request: NextRequest) {
  try {
    // Skip during build/static generation
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return NextResponse.json({
        success: true,
        revenue: { mrr: 0, arr: 0 },
        subscribers: {
          total: 0,
          pro: { total: 0, weekly: 0, monthly: 0 },
          elite: { total: 0, weekly: 0, monthly: 0 },
        },
      });
    }

    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    // Get all price IDs
    const proPriceIds = [
      process.env.NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID,
      process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
      process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    ].filter(Boolean);

    const elitePriceIds = [
      process.env.NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID,
      process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID,
      process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID,
    ].filter(Boolean);

    const allPriceIds = [...proPriceIds, ...elitePriceIds];

    // Get price details to calculate revenue
    const priceDetails: Record<string, { amount: number; currency: string; interval: string }> = {};

    for (const priceId of allPriceIds) {
      if (!priceId) continue;
      try {
        const price = await stripe.prices.retrieve(priceId);
        priceDetails[priceId] = {
          amount: price.unit_amount || 0,
          currency: price.currency || 'usd',
          interval: price.recurring?.interval || 'month',
        };
      } catch (err) {
        console.error(`Error fetching price ${priceId}:`, err);
      }
    }

    // Get all active subscriptions
    const subscribers: Record<string, number> = {
      pro_weekly: 0,
      pro_monthly: 0,
      elite_weekly: 0,
      elite_monthly: 0,
    };

    let totalMRR = 0;
    let totalARR = 0;

    for (const priceId of allPriceIds) {
      try {
        // Handle pagination - get all subscriptions
        let hasMore = true;
        let startingAfter: string | undefined = undefined;
        let totalCount = 0;

        while (hasMore) {
          if (!priceId) break;
          const subscriptions: Stripe.Response<Stripe.ApiList<Stripe.Subscription>> = await stripe.subscriptions.list({
            price: priceId,
            status: 'active',
            limit: 100,
            starting_after: startingAfter,
          });

          totalCount += subscriptions.data.length;
          hasMore = subscriptions.has_more;
          if (subscriptions.data.length > 0) {
            startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
          }

          // Process this batch
          const priceDetail = priceDetails[priceId];

          if (priceDetail) {
            const monthlyAmount = priceDetail.interval === 'week'
              ? (priceDetail.amount * 52) / 12  // Convert weekly to monthly
              : priceDetail.amount;

            const mrr = (monthlyAmount / 100) * subscriptions.data.length; // Convert cents to dollars
            totalMRR += mrr;
            totalARR += mrr * 12;

            // Categorize by plan
            if (proPriceIds.includes(priceId)) {
              if (priceDetail.interval === 'week') {
                subscribers.pro_weekly += subscriptions.data.length;
              } else {
                subscribers.pro_monthly += subscriptions.data.length;
              }
            } else if (elitePriceIds.includes(priceId)) {
              if (priceDetail.interval === 'week') {
                subscribers.elite_weekly += subscriptions.data.length;
              } else {
                subscribers.elite_monthly += subscriptions.data.length;
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error fetching subscriptions for price ${priceId}:`, err);
      }
    }

    // Calculate totals
    const totalSubscribers = Object.values(subscribers).reduce((sum, count) => sum + count, 0);
    const proTotal = subscribers.pro_weekly + subscribers.pro_monthly;
    const eliteTotal = subscribers.elite_weekly + subscribers.elite_monthly;

    return NextResponse.json({
      success: true,
      revenue: {
        mrr: Math.round(totalMRR * 100) / 100, // Round to 2 decimals
        arr: Math.round(totalARR * 100) / 100,
      },
      subscribers: {
        total: totalSubscribers,
        pro: {
          total: proTotal,
          weekly: subscribers.pro_weekly,
          monthly: subscribers.pro_monthly,
        },
        elite: {
          total: eliteTotal,
          weekly: subscribers.elite_weekly,
          monthly: subscribers.elite_monthly,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching revenue stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch revenue stats',
      },
      { status: 500 }
    );
  }
}

