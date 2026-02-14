import { getSmsService } from '@/lib/sms';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover' as any, // Stripe types may be outdated
  })
  : null;

/**
 * Send SMS alerts to all Pro/Elite subscribers
 * Called when new picks are generated or last-minute updates occur
 */
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    const { type, picks, alert } = await request.json();

    if (!type || (type === 'daily' && !picks) || (type === 'last-minute' && !alert)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request. Type and data required.' },
        { status: 400 }
      );
    }

    // Get all active Pro and Elite subscribers
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

    const subscribers: Array<{ phone: string; tier: 'pro' | 'elite'; email: string }> = [];

    // Get all active subscriptions
    for (const priceId of allPriceIds) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          price: priceId,
          status: 'active',
          limit: 100,
        });

        for (const sub of subscriptions.data) {
          if (sub.customer && typeof sub.customer === 'string') {
            try {
              const customer = await stripe.customers.retrieve(sub.customer);
              // Type guard: ensure customer is not deleted and has required properties
              if (!customer.deleted && 'metadata' in customer && 'email' in customer) {
                if (customer.metadata?.sms_enabled === 'true' && customer.metadata?.sms_phone) {
                  const tier = elitePriceIds.includes(priceId) ? 'elite' : 'pro';
                  subscribers.push({
                    phone: customer.metadata.sms_phone,
                    tier,
                    email: customer.email || '',
                  });
                }
              }
            } catch (err) {
              console.error('Error retrieving customer:', err);
            }
          }
        }
      } catch (err) {
        console.error(`Error fetching subscriptions for price ${priceId}:`, err);
      }
    }

    // Send SMS to all subscribers
    const results = await Promise.allSettled(
      subscribers.map(async (sub) => {
        const smsService = getSmsService();
        if (type === 'daily' && picks) {
          return smsService.sendDailyPicksAlert(sub.phone, picks, sub.tier);
        } else if (type === 'last-minute' && alert) {
          return smsService.sendLastMinuteAlert(sub.phone, alert);
        }
        return { success: false, error: 'Invalid type' };
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
      total: subscribers.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to send SMS alerts',
      },
      { status: 500 }
    );
  }
}

