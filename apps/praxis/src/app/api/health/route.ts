import { NextResponse } from 'next/server';

/**
 * Health check for Brain and cevict-ai monitor.
 * GET /api/health – returns { status: 'ok', service: 'praxis', ... }.
 */
export async function GET() {
  const checks: Record<string, string> = {};
  if (process.env.STRIPE_SECRET_KEY) checks.stripe = 'configured';
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) checks.clerk = 'configured';
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) checks.supabase = 'configured';

  return NextResponse.json({
    status: 'ok',
    service: 'praxis',
    timestamp: new Date().toISOString(),
    checks,
  });
}
