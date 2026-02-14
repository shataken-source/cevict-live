import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Simple health check for Brain / cevict.ai monitor bot and load balancers. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'monitor',
    timestamp: new Date().toISOString(),
  });
}
