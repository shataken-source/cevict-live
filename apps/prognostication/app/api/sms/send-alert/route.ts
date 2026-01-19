import { getSmsService } from '@/lib/sms';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18' as any, // Stripe types may be outdated
    })
  : null;

/**
 * Send SMS alerts to all Pro/Elite subscribers
 * Called when new picks are generated or last-minute updates occur
 */
type DailyPick = { game: string; pick: string; confidence: number };
type DailyPayload = { type: 'daily'; picks: DailyPick[] };
type LastMinutePayload = { type: 'last-minute'; alert: { game: string; reason: string; impact: string } };

async function listSubscribers(elitePriceIds: string[], proPriceIds: string[]) {
  const allPriceIds = [...proPriceIds, ...elitePriceIds];
  const subscribers: Array<{ phone: string; tier: 'pro' | 'elite'; email: string }> = [];

  for (const priceId of allPriceIds) {
    try {
      const subscriptions = await stripe!.subscriptions.list({
        price: priceId,
        status: 'active',
        limit: 100,
      });

      for (const sub of subscriptions.data) {
        if (sub.customer && typeof sub.customer === 'string') {
          try {
            const customer = await stripe!.customers.retrieve(sub.customer);
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

  return subscribers;
}

async function sendToSubscribers(payload: DailyPayload | LastMinutePayload) {
  if (!stripe) {
    return NextResponse.json({ success: false, error: 'Stripe not configured' }, { status: 500 });
  }

  const proPriceIds = [
    process.env.NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  ].filter(Boolean) as string[];

  const elitePriceIds = [
    process.env.NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID,
  ].filter(Boolean) as string[];

  const subscribers = await listSubscribers(elitePriceIds, proPriceIds);

  const results = await Promise.allSettled(
    subscribers.map(async (sub) => {
      const smsService = getSmsService();
      if (payload.type === 'daily') {
        return smsService.sendDailyPicksAlert(sub.phone, payload.picks, sub.tier);
      }
      return smsService.sendLastMinuteAlert(sub.phone, payload.alert);
    })
  );

  const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - successful;

  return NextResponse.json({
    success: true,
    sent: successful,
    failed,
    total: subscribers.length,
  });
}

export async function GET(request: NextRequest) {
  // Vercel Cron invokes GET. We only allow cron to use GET.
  const isCron = request.headers.get('x-vercel-cron') === '1';
  if (!isCron) return new NextResponse(null, { status: 405 });

  // Fetch tiered picks from our own endpoint (cron-enabled).
  const origin = request.nextUrl.origin;
  const picksUrl = new URL('/api/picks/today', origin);

  const picksRes = await fetch(picksUrl.toString(), {
    headers: {
      'x-vercel-cron': '1',
    },
    cache: 'no-store',
  });

  const picksJson: any = await picksRes.json().catch(() => null);
  if (!picksRes.ok || !picksJson?.success) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch today picks for SMS', details: picksJson },
      { status: 500 }
    );
  }

  const pro: any[] = Array.isArray(picksJson.pro) ? picksJson.pro : [];
  const elite: any[] = Array.isArray(picksJson.elite) ? picksJson.elite : [];
  const eliteCombined = [...pro, ...elite];

  const toDailyPick = (p: any): DailyPick => ({
    game: String(p.game || ''),
    pick: String(p.pick || ''),
    confidence: Number(p.confidencePct ?? p.confidence ?? 0),
  });

  const proPicks = pro.map(toDailyPick).filter((p) => p.game && p.pick);
  const elitePicks = eliteCombined.map(toDailyPick).filter((p) => p.game && p.pick);

  // If PROGNO is not configured, don't pretend we sent anything.
  if (picksJson.source === 'unavailable') {
    return NextResponse.json(
      { success: false, error: 'PROGNO unavailable; cannot send daily SMS', details: picksJson },
      { status: 503 }
    );
  }

  // Send to all subscribers; SMS service trims count based on tier.
  // Pro users receive Pro picks; Elite users receive combined pro+elite picks.
  // We send the *same list* to both tiers but the SMS service will slice more for Elite.
  // To enforce tier separation, we pass pro picks and elite picks based on subscriber tier.
  // This is handled inside sendToSubscribers by supplying payload.picks.
  //
  // Here: send using the Elite list, but keep Pro list if Elite list is empty.
  const payloadPicks = elitePicks.length ? elitePicks : proPicks;
  if (!payloadPicks.length) {
    return NextResponse.json(
      { success: false, error: 'No picks available to send', details: { source: picksJson.source } },
      { status: 503 }
    );
  }

  return sendToSubscribers({ type: 'daily', picks: payloadPicks });
}

export async function POST(request: NextRequest) {
  try {
    const { type, picks, alert } = await request.json();
    if (!type || (type === 'daily' && !picks) || (type === 'last-minute' && !alert)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request. Type and data required.' },
        { status: 400 }
      );
    }
    if (type === 'daily') return sendToSubscribers({ type: 'daily', picks });
    return sendToSubscribers({ type: 'last-minute', alert });
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

