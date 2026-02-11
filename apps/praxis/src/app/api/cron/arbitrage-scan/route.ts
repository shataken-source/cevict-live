import { NextResponse } from 'next/server';
import { scanForArbitrage } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Cron: runs same arbitrage scan as GET /api/arbitrage. Protect with CRON_SECRET or x-vercel-cron. */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const cronSecret = process.env.CRON_SECRET;
  // Vercel cron is trusted; otherwise require CRON_SECRET (set in prod to avoid open endpoint)
  if (!isVercelCron) {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await scanForArbitrage();
    const total =
      result.crossPlatform.length +
      result.kalshiOnly.length +
      result.polymarketOnly.length;

    return NextResponse.json({
      ok: true,
      timestamp: result.timestamp,
      summary: {
        crossPlatform: result.crossPlatform.length,
        kalshiOnly: result.kalshiOnly.length,
        polymarketOnly: result.polymarketOnly.length,
        total,
      },
    });
  } catch (error) {
    console.error('[cron arbitrage-scan]', error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
