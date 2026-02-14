import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSubscription, getPlanLimit, type Plan } from '@/lib/subscription-store';

/** GET /api/subscription – current user's plan (requires sign-in). */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Sign in required', plan: 'free' as Plan, limit: 3, status: null },
      { status: 401 }
    );
  }
  try {
    const row = await getSubscription(userId);
    const plan = (row?.plan ?? 'free') as Plan;
    const limit = getPlanLimit(plan);
    return NextResponse.json({
      plan,
      limit,
      status: row?.status ?? null,
      currentPeriodEnd: row?.current_period_end ?? null,
      trialEndsAt: row?.trial_ends_at ?? null,
      ok: true,
    });
  } catch (e) {
    console.error('Subscription fetch error:', e);
    return NextResponse.json(
      { error: 'Failed to load subscription', plan: 'free', limit: 3, ok: false },
      { status: 500 }
    );
  }
}
