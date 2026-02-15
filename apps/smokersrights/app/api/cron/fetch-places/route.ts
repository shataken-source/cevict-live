import { NextRequest, NextResponse } from 'next/server';
import { fetchPlacesForAllCities } from '@/scripts/fetch-places';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await fetchPlacesForAllCities();
    return NextResponse.json({ success: true, message: 'Places fetch completed' });
  } catch (err) {
    console.error('Cron job failed:', err);
    return NextResponse.json({ error: 'Job failed' }, { status: 500 });
  }
}
