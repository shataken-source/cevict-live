import { NextRequest, NextResponse } from 'next/server';
import { fetchAndStoreLegislation } from '@/scripts/fetch-legislation';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await fetchAndStoreLegislation();
    return NextResponse.json({ success: true, message: 'Legislation fetch completed' });
  } catch (err) {
    console.error('Cron job failed:', err);
    return NextResponse.json({ error: 'Job failed' }, { status: 500 });
  }
}
