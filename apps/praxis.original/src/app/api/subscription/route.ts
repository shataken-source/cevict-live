import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSubscription, ensureFreeTrialRow } from '@/lib/subscription-store';

/** GET /api/subscription – current user's plan. Returns free when not signed in (avoids 401 on hard refresh before Clerk hydrates). */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({
      plan: 'free',
      status: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
      isTrialExpired: false,
      postTrialDiscountEligible: false,
      ok: true,
    });
  }
  try {
    let row = await getSubscription(userId);
    if (!row) {
      await ensureFreeTrialRow(userId);
      row = await getSubscription(userId);
    }
    const plan = row?.plan ?? 'free';
    const status = row?.status ?? null;
    const currentPeriodEnd = row?.current_period_end ?? null;
    const trialEndsAt = row?.free_trial_ends_at ?? null;
    const now = new Date();
    const isTrialExpired =
      plan === 'free' &&
      trialEndsAt != null &&
      now > new Date(trialEndsAt);
    const postTrialDiscountEligible = isTrialExpired;

    return NextResponse.json({
      plan,
      status,
      currentPeriodEnd,
      trialEndsAt,
      isTrialExpired,
      postTrialDiscountEligible,
      ok: true,
    });
  } catch (e) {
    console.error('Subscription fetch error:', e);
    return NextResponse.json(
      { error: 'Failed to load subscription', plan: 'free', ok: false },
      { status: 500 }
    );
  }
}
